import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.history.pushState({}, '', '/');
});

function invoiceStatusPayload(status: string, statuses: string[]) {
  return {
    invoice_code: 'INV-TEST-0001',
    order_id: 'order-1001',
    status,
    product_code: 'mobile-legends-86-diamond',
    provider: 'digiflazz',
    amount_minor: 20000,
    currency: 'IDR',
    payment: statuses.includes('paid')
      ? {
          payment_id: 'payment-1001',
          provider: 'midtrans',
          status: 'paid',
          paid_at: '2026-04-22T08:01:00.000Z',
          updated_at: '2026-04-22T08:01:00.000Z',
        }
      : null,
    fulfillment: statuses.includes('success')
      ? {
          fulfillment_id: 'fulfillment-1001',
          provider: 'digiflazz',
          status: 'success',
          serial_number: 'SN-1001',
          processed_at: '2026-04-22T08:03:00.000Z',
          updated_at: '2026-04-22T08:03:00.000Z',
        }
      : null,
    timeline: statuses.map((toStatus, index) => ({
      id: index + 1,
      fromStatus: index === 0 ? 'created' : statuses[index - 1],
      toStatus,
      note: toStatus,
      createdBy: 'test',
      createdAt: `2026-04-22T08:0${index}:00.000Z`,
    })),
  };
}

describe('App smoke test', () => {
  it('renders the main hero headline and primary action', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /bayar semua/i })).toBeDefined();
    expect(screen.getByRole('button', { name: /cari sekarang/i })).toBeDefined();
  });

  it('creates an order and initializes payment from checkout', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            order_id: 'order-1001',
            invoice_code: 'INV-20260422-1001',
            status: 'pending_payment',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            payment_id: 'payment-1001',
            order_id: 'order-1001',
            status: 'pending',
            token: 'snap-token-1001',
            redirect_url: 'https://app.sandbox.midtrans.com/snap/v2/vtweb/snap-token-1001',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.change(screen.getByRole('textbox', { name: /customer id/i }), { target: { value: '12345678' } });
    fireEvent.change(screen.getByRole('textbox', { name: /zone id/i }), { target: { value: '1234' } });
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), { target: { value: 'buyer@example.com' } });
    fireEvent.click(screen.getByTestId('checkout-submit'));

    await waitFor(() => expect(screen.getByTestId('invoice-code')).toHaveTextContent('INV-20260422-1001'));

    expect(screen.getByTestId('product-card-0')).toBeDefined();
    expect(screen.getByTestId('order-id')).toHaveTextContent('order-1001');
    expect(screen.getByTestId('payment-status')).toHaveTextContent('pending_payment / pending');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3001/api/orders');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://localhost:3001/api/payments/midtrans/initialize');
  });

  it('shows checkout error and retry when order creation fails', async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'ORDER_CREATE_FAILED',
            message: 'Failed to create order.',
          },
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.change(screen.getByRole('textbox', { name: /customer id/i }), { target: { value: '12345678' } });
    fireEvent.change(screen.getByRole('textbox', { name: /zone id/i }), { target: { value: '1234' } });
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), { target: { value: 'buyer@example.com' } });
    fireEvent.click(screen.getByTestId('checkout-submit'));

    await waitFor(() => expect(screen.getByTestId('checkout-error')).toHaveTextContent('Failed to create order.'));

    fireEvent.click(screen.getByTestId('checkout-retry'));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });

  it('opens invoice route and polls status progression to success', async () => {
    window.history.pushState({}, '', '/invoice/INV-TEST-0001');
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify(invoiceStatusPayload('pending_payment', ['pending_payment'])), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(invoiceStatusPayload('paid', ['pending_payment', 'paid'])), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(invoiceStatusPayload('fulfillment_pending', ['pending_payment', 'paid', 'fulfillment_pending'])), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(invoiceStatusPayload('success', ['pending_payment', 'paid', 'fulfillment_pending', 'success'])), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await waitFor(() => expect(screen.getByTestId('status-badge')).toHaveTextContent('Menunggu Pembayaran'));
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3001/api/invoices/INV-TEST-0001/status');

    await new Promise((resolve) => setTimeout(resolve, 2100));
    await waitFor(() => expect(screen.getByTestId('status-badge')).toHaveTextContent('Dibayar'));

    await new Promise((resolve) => setTimeout(resolve, 2100));
    await waitFor(() => expect(screen.getByTestId('status-badge')).toHaveTextContent('Diproses Provider'));

    await new Promise((resolve) => setTimeout(resolve, 2100));
    await waitFor(() => expect(screen.getByTestId('status-badge')).toHaveTextContent('Sukses'));
    expect(screen.getByTestId('timeline-item-success')).toHaveTextContent('success');
  }, 10000);

  it('covers guest checkout then terminal invoice success without live network', async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            order_id: 'ORD-TEST-001',
            invoice_code: 'INV-TEST-0001',
            status: 'pending_payment',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            payment_id: 'payment-task-14',
            order_id: 'ORD-TEST-001',
            status: 'pending',
            token: 'snap-token-task-14',
            redirect_url: 'https://midtrans.local.test/snap-token-task-14',
          }),
          { status: 201, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.change(screen.getByRole('textbox', { name: /customer id/i }), { target: { value: '12345678' } });
    fireEvent.change(screen.getByRole('textbox', { name: /zone id/i }), { target: { value: '1234' } });
    fireEvent.change(screen.getByRole('textbox', { name: /email/i }), { target: { value: 'buyer@example.com' } });
    fireEvent.click(screen.getByTestId('checkout-submit'));

    await waitFor(() => expect(screen.getByTestId('invoice-code')).toHaveTextContent('INV-TEST-0001'));
    expect(screen.getByTestId('order-id')).toHaveTextContent('ORD-TEST-001');
    expect(screen.getByTestId('payment-status')).toHaveTextContent('pending_payment / pending');

    cleanup();
    window.history.pushState({}, '', '/invoice/INV-TEST-0001');
    const invoiceFetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify(invoiceStatusPayload('success', ['pending_payment', 'paid', 'fulfillment_pending', 'success'])), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', invoiceFetchMock);
    render(<App />);

    await waitFor(() => expect(screen.getByTestId('status-badge')).toHaveTextContent('Sukses'));
    expect(screen.getByTestId('timeline-item-success')).toHaveTextContent('success');
    expect(invoiceFetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3001/api/invoices/INV-TEST-0001/status');
  });

  it('keeps the invoice shell interactive when invoice lookup fails', async () => {
    window.history.pushState({}, '', '/invoice/INV-NOT-FOUND');
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          error: {
            code: 'INVOICE_NOT_FOUND',
            message: 'Invoice tidak ditemukan',
          },
        }),
        { status: 404, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await waitFor(() => expect(screen.getByTestId('invoice-error')).toHaveTextContent('Invoice tidak ditemukan'));
    fireEvent.click(screen.getByRole('button', { name: /coba lagi/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(screen.getAllByText('BayarKu').length).toBeGreaterThan(0);
  });
});
