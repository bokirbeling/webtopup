import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import App from '../App';

type UserBody = Readonly<{
  id: string;
  email: string;
  role: 'admin' | 'seller' | 'pengguna';
  is_reseller_active: boolean;
  reseller_status: 'none' | 'requested' | 'approved' | 'rejected';
  email_verified: boolean;
  email_verified_at: string | null;
  created_at: string;
  updated_at: string;
}>;

type CatalogProductBody = Readonly<{
  product: Readonly<{
    id: string;
    sku_digiflazz: string;
    name: string;
    category: string;
    provider: string;
  }>;
  role_type: 'admin' | 'seller' | 'pengguna';
  base_price_minor: number;
  markup_minor: number;
  final_price_minor: number;
  pricing: Readonly<{
    source: string;
  }>;
}>;

type AdminProductBody = Readonly<{
  id: string;
  sku_digiflazz: string;
  name: string;
  category: string;
  provider: string;
  base_price_minor: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}>;

type PricingRuleBody = Readonly<{
  id: string;
  scope_type: 'global' | 'category' | 'product';
  product_id: string | null;
  category: string | null;
  role_type: 'admin' | 'seller' | 'pengguna';
  markup_fixed: number;
  markup_percentage: number;
  priority: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}>;

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  window.localStorage.clear();
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

function authUser(overrides: Partial<UserBody> = {}): UserBody {
  return {
    id: 'user-1001',
    email: 'member@example.com',
    role: 'pengguna',
    is_reseller_active: false,
    reseller_status: 'none',
    email_verified: false,
    email_verified_at: null,
    created_at: '2026-05-14T00:00:00.000Z',
    updated_at: '2026-05-14T00:00:00.000Z',
    ...overrides,
  };
}

function catalogProduct(overrides: Partial<CatalogProductBody> = {}): CatalogProductBody {
  return {
    product: {
      id: 'catalog-ml-86',
      sku_digiflazz: 'ML86',
      name: 'Mobile Legends 86 Diamond',
      category: 'Game',
      provider: 'digiflazz',
    },
    role_type: 'seller',
    base_price_minor: 10000,
    markup_minor: 500,
    final_price_minor: 10500,
    pricing: { source: 'product' },
    ...overrides,
  };
}

function adminProduct(overrides: Partial<AdminProductBody> = {}): AdminProductBody {
  return {
    id: 'admin-product-1',
    sku_digiflazz: 'ADM100',
    name: 'Admin Product 100',
    category: 'Game',
    provider: 'digiflazz',
    base_price_minor: 10000,
    is_active: true,
    metadata: {},
    created_at: '2026-05-14T00:00:00.000Z',
    updated_at: '2026-05-14T00:00:00.000Z',
    ...overrides,
  };
}


function transactionHistoryItem(overrides: Record<string, unknown> = {}) {
  return {
    order_id: 'order-history-1',
    invoice_code: 'INV-HISTORY-0001',
    status: 'success',
    product_code: 'mobile-legends-86-diamond',
    provider: 'digiflazz',
    amount_minor: 20000,
    currency: 'IDR',
    created_at: '2026-05-14T09:00:00.000Z',
    updated_at: '2026-05-14T09:03:00.000Z',
    payment: { payment_id: 'payment-history-1', provider: 'midtrans', status: 'paid', paid_at: '2026-05-14T09:01:00.000Z', updated_at: '2026-05-14T09:01:00.000Z' },
    fulfillment: { fulfillment_id: 'fulfillment-history-1', provider: 'digiflazz', status: 'success', serial_number: 'SN-HISTORY-1', processed_at: '2026-05-14T09:03:00.000Z', updated_at: '2026-05-14T09:03:00.000Z' },
    ...overrides,
  };
}

function adminMonitoringPayload() {
  return {
    transactions: [transactionHistoryItem({ order_id: 'admin-order-1', invoice_code: 'INV-ADMIN-0001' })],
    webhooks: [
      {
        webhook_id: 'webhook-1',
        provider: 'midtrans',
        event_key: 'TX-ADMIN-1',
        event_type: 'settlement',
        order_id: 'admin-order-1',
        payment_id: 'payment-history-1',
        processing_state: 'processed',
        received_at: '2026-05-14T09:01:30.000Z',
        processed_at: '2026-05-14T09:01:31.000Z',
        error_message: null,
      },
    ],
    summary: { transaction_count: 1, webhook_count: 1, failed_webhook_count: 0 },
  };
}

function digiflazzOperationsPayload(overrides: Record<string, unknown> = {}) {
  return {
    balance: { deposit: 125000, rc: '00', message: 'Saldo tersedia' },
    catalog: { product_count: 2, active_count: 1, inactive_count: 1, last_synced_at: '2026-05-15T03:30:00.000Z' },
    webhooks: { recent_count: 1, failed_count: 0 },
    ...overrides,
  };
}

function pricingRule(overrides: Partial<PricingRuleBody> = {}): PricingRuleBody {
  return {
    id: 'pricing-rule-1',
    scope_type: 'global',
    product_id: null,
    category: null,
    role_type: 'seller',
    markup_fixed: 500,
    markup_percentage: 0,
    priority: 10,
    is_active: true,
    metadata: {},
    created_at: '2026-05-14T00:00:00.000Z',
    updated_at: '2026-05-14T00:00:00.000Z',
    ...overrides,
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
    expect(screen.getAllByText('Adnanpay').length).toBeGreaterThan(0);
  });

  it('shows anonymous dashboard protection without fetching private data', () => {
    window.history.pushState({}, '', '/dashboard');
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(screen.getByText(/masuk untuk melihat dashboard/i)).toBeDefined();
    expect(screen.getByTestId('auth-panel')).toBeDefined();
    expect(screen.queryByText('member@example.com')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('logs in, persists the backend token, loads dashboard state, and logs out', async () => {
    window.history.pushState({}, '', '/dashboard');
    const sessionUser = authUser();
    const sellerUser = authUser({ role: 'seller', is_reseller_active: true, reseller_status: 'approved' });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: sessionUser, token: 'member-token', expires_in: '1h' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: sessionUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: sellerUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ products: [catalogProduct()] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ transactions: [transactionHistoryItem()] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'member@example.com' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'correct-password' } });
    fireEvent.click(screen.getByTestId('auth-submit'));

    await waitFor(() => expect(screen.getByTestId('dashboard-role')).toHaveTextContent('Reseller'));
    expect(screen.getByTestId('dashboard-email')).toHaveTextContent('member@example.com');
    expect(screen.getByTestId('reseller-status')).toHaveTextContent('Disetujui');
    expect(screen.getByTestId('catalog-price-catalog-ml-86')).toHaveTextContent('Rp 10.500');
    expect(screen.getByTestId('transaction-order-history-1')).toHaveTextContent('mobile-legends-86-diamond');
    expect(screen.getByTestId('transaction-order-history-1')).toHaveTextContent('Payment: paid');
    expect(window.localStorage.getItem('bayarku.auth.session')).toContain('member-token');
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3001/api/auth/login');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://localhost:3001/api/auth/me');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('http://localhost:3001/api/account/status');
    expect(fetchMock.mock.calls[3]?.[0]).toBe('http://localhost:3001/api/catalog/products');
    expect(fetchMock.mock.calls[4]?.[0]).toBe('http://localhost:3001/api/account/transactions');

    const catalogInit = fetchMock.mock.calls[3]?.[1] as RequestInit | undefined;
    const transactionsInit = fetchMock.mock.calls[4]?.[1] as RequestInit | undefined;
    expect((catalogInit?.headers as Record<string, string>).Authorization).toBe('Bearer member-token');
    expect((transactionsInit?.headers as Record<string, string>).Authorization).toBe('Bearer member-token');

    fireEvent.click(screen.getByRole('button', { name: /logout/i }));
    expect(screen.getByTestId('auth-panel')).toBeDefined();
    expect(window.localStorage.getItem('bayarku.auth.session')).toBeNull();
  });

  it('loads persisted sessions, requests reseller status, and displays backend catalog prices', async () => {
    window.history.pushState({}, '', '/dashboard');
    const sessionUser = authUser();
    window.localStorage.setItem('bayarku.auth.session', JSON.stringify({ user: sessionUser, token: 'stored-token', expires_in: '1h' }));
    const requestedUser = authUser({ reseller_status: 'requested' });
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: sessionUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: sessionUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ products: [catalogProduct({ final_price_minor: 9700, pricing: { source: 'category' } })] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ transactions: [] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: requestedUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await waitFor(() => expect(screen.getByTestId('catalog-price-catalog-ml-86')).toHaveTextContent('Rp 9.700'));
    const catalogInit = fetchMock.mock.calls[2]?.[1] as RequestInit | undefined;
    expect((catalogInit?.headers as Record<string, string>).Authorization).toBe('Bearer stored-token');

    fireEvent.click(screen.getByTestId('reseller-request'));

    await waitFor(() => expect(screen.getByTestId('reseller-status')).toHaveTextContent('Menunggu review admin'));
    expect(screen.getByTestId('reseller-message')).toHaveTextContent('Permintaan reseller tersimpan');
    expect(fetchMock.mock.calls[4]?.[0]).toBe('http://localhost:3001/api/account/reseller-request');
    const resellerInit = fetchMock.mock.calls[4]?.[1] as RequestInit | undefined;
    expect((resellerInit?.headers as Record<string, string>).Authorization).toBe('Bearer stored-token');
  });

  it('shows anonymous admin protection without fetching private data', () => {
    window.history.pushState({}, '', '/admin');
    const fetchMock = vi.fn<typeof fetch>();
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    expect(screen.getByTestId('admin-forbidden')).toHaveTextContent('Login admin diperlukan');
    expect(screen.queryByTestId('admin-product-create')).toBeNull();
    expect(screen.queryByTestId('admin-pricing-create')).toBeNull();
    expect(screen.queryByText('Approve')).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('verifies non-admin sessions before hiding all admin controls', async () => {
    window.history.pushState({}, '', '/admin');
    const memberUser = authUser({ role: 'pengguna' });
    window.localStorage.setItem('bayarku.auth.session', JSON.stringify({ user: memberUser, token: 'member-token', expires_in: '1h' }));
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValueOnce(
      new Response(JSON.stringify({ user: memberUser }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    );
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await waitFor(() => expect(screen.getByTestId('admin-forbidden')).toHaveTextContent('Role admin diperlukan'));
    expect(screen.queryByTestId('admin-product-create')).toBeNull();
    expect(screen.queryByTestId('admin-pricing-create')).toBeNull();
    expect(screen.queryByText('Approve')).toBeNull();
    expect(screen.queryByTestId('admin-monitoring')).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3001/api/auth/me');
  });

  it('renders admin controls and performs product, pricing, and reseller actions', async () => {
    window.history.pushState({}, '', '/admin');
    const adminUser = authUser({ id: 'admin-1', email: 'admin@example.com', role: 'admin' });
    const requestedUser = authUser({ id: 'user-2002', email: 'reseller@example.com', reseller_status: 'requested' });
    const approvedUser = authUser({ id: 'user-2002', email: 'reseller@example.com', role: 'seller', is_reseller_active: true, reseller_status: 'approved' });
    const firstProduct = adminProduct();
    const createdProduct = adminProduct({ id: 'admin-product-created', sku_digiflazz: 'ADM200', name: 'Created Admin Product', base_price_minor: 20000 });
    const firstRule = pricingRule();
    const updatedRule = pricingRule({ markup_fixed: 600 });
    window.localStorage.setItem('bayarku.auth.session', JSON.stringify({ user: adminUser, token: 'admin-token', expires_in: '1h' }));
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: adminUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ products: [firstProduct] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ pricing_rules: [firstRule] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ users: [adminUser, requestedUser] }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(adminMonitoringPayload()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(digiflazzOperationsPayload()), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ product_count: 2, active_count: 1, inactive_count: 1, synced_at: '2026-05-15T03:35:00.000Z' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify(digiflazzOperationsPayload({ catalog: { product_count: 2, active_count: 1, inactive_count: 1, last_synced_at: '2026-05-15T03:35:00.000Z' } })), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ user: adminUser }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ products: [firstProduct] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ pricing_rules: [firstRule] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ users: [adminUser, requestedUser] }), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(adminMonitoringPayload()), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(new Response(JSON.stringify(digiflazzOperationsPayload({ catalog: { product_count: 2, active_count: 1, inactive_count: 1, last_synced_at: '2026-05-15T03:35:00.000Z' } })), { status: 200, headers: { 'Content-Type': 'application/json' } }))
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ product: createdProduct }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ pricing_rule: updatedRule }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ user: approvedUser }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    vi.stubGlobal('fetch', fetchMock);

    render(<App />);

    await waitFor(() => expect(screen.getByTestId('admin-dashboard')).toBeDefined());
    expect(screen.getByTestId('admin-email')).toHaveTextContent('admin@example.com');
    expect(screen.getByTestId('admin-product-count')).toHaveTextContent('1');
    expect(screen.getByTestId('admin-pricing-count')).toHaveTextContent('1');
    expect(screen.getByTestId('admin-user-count')).toHaveTextContent('2');
    expect(screen.getByTestId('admin-ops-panel')).toHaveTextContent('/api/admin/monitoring');
    expect(screen.getByTestId('digiflazz-ops-panel')).toHaveTextContent('Digiflazz Buyer Operations');
    expect(screen.getByTestId('digiflazz-balance')).toHaveTextContent('Rp 125.000');
    expect(screen.getByTestId('digiflazz-product-count')).toHaveTextContent('2');
    expect(screen.getByTestId('digiflazz-active-count')).toHaveTextContent('1 / 1');
    expect(screen.getByTestId('digiflazz-webhook-failed')).toHaveTextContent('0');
    expect(screen.getByTestId('admin-transaction-admin-order-1')).toHaveTextContent('INV-ADMIN-0001');
    expect(screen.getByTestId('admin-webhook-webhook-1')).toHaveTextContent('midtrans');

    fireEvent.click(screen.getByTestId('digiflazz-sync-button'));

    await waitFor(() => expect(fetchMock.mock.calls[6]?.[0]).toBe('http://localhost:3001/api/admin/catalog/digiflazz/price-list/sync'));

    fireEvent.change(screen.getByLabelText('SKU produk'), { target: { value: 'ADM200' } });
    fireEvent.change(screen.getByLabelText('Nama produk'), { target: { value: 'Created Admin Product' } });
    fireEvent.change(screen.getByLabelText('Kategori produk'), { target: { value: 'Game' } });
    fireEvent.change(screen.getByLabelText('Provider produk'), { target: { value: 'digiflazz' } });
    fireEvent.change(screen.getByLabelText('Harga dasar produk'), { target: { value: '20000' } });
    fireEvent.click(screen.getByTestId('admin-product-create'));

    await waitFor(() => expect(screen.getByTestId('admin-product-admin-product-created')).toHaveTextContent('Created Admin Product'));

    fireEvent.click(screen.getByTestId('admin-pricing-update-pricing-rule-1'));

    await waitFor(() => expect(screen.getByTestId('admin-pricing-pricing-rule-1')).toHaveTextContent('Rp 600'));

    fireEvent.click(screen.getByTestId('admin-user-approve-user-2002'));

    await waitFor(() => expect(screen.getByTestId('admin-user-user-2002')).toHaveTextContent('Disetujui'));

    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://localhost:3001/api/auth/me');
    expect(fetchMock.mock.calls[1]?.[0]).toBe('http://localhost:3001/api/admin/catalog/products');
    expect(fetchMock.mock.calls[2]?.[0]).toBe('http://localhost:3001/api/admin/catalog/pricing-rules');
    expect(fetchMock.mock.calls[3]?.[0]).toBe('http://localhost:3001/api/admin/users');
    expect(fetchMock.mock.calls[4]?.[0]).toBe('http://localhost:3001/api/admin/monitoring');
    expect(fetchMock.mock.calls[5]?.[0]).toBe('http://localhost:3001/api/admin/digiflazz/operations');
    expect(fetchMock.mock.calls[6]?.[0]).toBe('http://localhost:3001/api/admin/catalog/digiflazz/price-list/sync');
    expect(fetchMock.mock.calls[7]?.[0]).toBe('http://localhost:3001/api/admin/digiflazz/operations');
    expect(fetchMock.mock.calls[8]?.[0]).toBe('http://localhost:3001/api/auth/me');
    expect(fetchMock.mock.calls[9]?.[0]).toBe('http://localhost:3001/api/admin/catalog/products');
    expect(fetchMock.mock.calls[10]?.[0]).toBe('http://localhost:3001/api/admin/catalog/pricing-rules');
    expect(fetchMock.mock.calls[11]?.[0]).toBe('http://localhost:3001/api/admin/users');
    expect(fetchMock.mock.calls[12]?.[0]).toBe('http://localhost:3001/api/admin/monitoring');
    expect(fetchMock.mock.calls[13]?.[0]).toBe('http://localhost:3001/api/admin/digiflazz/operations');
    expect(fetchMock.mock.calls[14]?.[0]).toBe('http://localhost:3001/api/admin/catalog/products');
    expect(fetchMock.mock.calls[15]?.[0]).toBe('http://localhost:3001/api/admin/catalog/pricing-rules/pricing-rule-1');
    expect(fetchMock.mock.calls[16]?.[0]).toBe('http://localhost:3001/api/admin/users/user-2002/reseller/approve');
    const syncInit = fetchMock.mock.calls[6]?.[1] as RequestInit | undefined;
    const pricingInit = fetchMock.mock.calls[15]?.[1] as RequestInit | undefined;
    expect((syncInit?.headers as Record<string, string>).Authorization).toBe('Bearer admin-token');
    expect((pricingInit?.headers as Record<string, string>).Authorization).toBe('Bearer admin-token');
  });
});
