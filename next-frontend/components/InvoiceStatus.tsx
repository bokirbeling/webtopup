'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { buildApiUrl, readApiError } from '@/lib/api';

type OrderStatus = 'created' | 'pending_payment' | 'paid' | 'fulfillment_pending' | 'success' | 'failed' | 'expired';

type InvoiceStatusResponse = Readonly<{
  invoice_code: string;
  order_id: string;
  status: OrderStatus;
  product_code: string;
  provider: string;
  amount_minor: number;
  currency: string;
  payment: null | Readonly<{ payment_id: string; provider: string; status: string; paid_at: string | null; updated_at: string }>;
  fulfillment: null | Readonly<{ fulfillment_id: string; provider: string; status: string; serial_number: string | null; processed_at: string | null; updated_at: string }>;
  timeline: ReadonlyArray<Readonly<{ id: number; fromStatus: OrderStatus | null; toStatus: OrderStatus; note: string | null; createdBy: string; createdAt: string }>>;
}>;

const statusSteps: ReadonlyArray<Readonly<{ status: OrderStatus; title: string; description: string }>> = [
  { status: 'pending_payment', title: 'Menunggu Pembayaran', description: 'Invoice dibuat dan menunggu konfirmasi Midtrans.' },
  { status: 'paid', title: 'Pembayaran Diterima', description: 'Midtrans mengirim status valid dari webhook/API.' },
  { status: 'fulfillment_pending', title: 'Diproses Provider', description: 'Order diteruskan ke Digiflazz oleh backend.' },
  { status: 'success', title: 'Transaksi Sukses', description: 'Digiflazz mengirim status sukses.' },
];

const terminalStatuses: ReadonlySet<OrderStatus> = new Set(['success', 'failed', 'expired']);

const statusLabels: Readonly<Record<OrderStatus, string>> = {
  created: 'Dibuat',
  pending_payment: 'Menunggu Pembayaran',
  paid: 'Dibayar',
  fulfillment_pending: 'Diproses Provider',
  success: 'Sukses',
  failed: 'Gagal',
  expired: 'Kedaluwarsa',
};

function formatRupiah(amountMinor: number) {
  return 'Rp ' + amountMinor.toLocaleString('id-ID');
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

function statusTone(status: OrderStatus) {
  if (status === 'success') return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (status === 'failed' || status === 'expired') return 'border-red-200 bg-red-50 text-red-700';
  return 'border-amber-200 bg-amber-50 text-amber-700';
}

export default function InvoiceStatus({ invoiceCode }: { invoiceCode: string }) {
  const [invoiceStatus, setInvoiceStatus] = useState<InvoiceStatusResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const currentStatusRef = useRef<OrderStatus>('pending_payment');

  const currentStepIndex = useMemo(() => {
    const currentStatus = invoiceStatus?.status ?? 'pending_payment';
    const index = statusSteps.findIndex((step) => step.status === currentStatus);
    return index === -1 ? 0 : index;
  }, [invoiceStatus?.status]);

  const loadInvoiceStatus = useCallback(async (showRefresh = false) => {
    if (showRefresh) setIsRefreshing(true);
    try {
      const response = await fetch(buildApiUrl('/api/invoices/' + encodeURIComponent(invoiceCode) + '/status'));
      if (!response.ok) throw new Error(await readApiError(response, 'Invoice tidak ditemukan.'));
      const payload = (await response.json()) as InvoiceStatusResponse;
      setInvoiceStatus(payload);
      setErrorMessage(null);
    } catch (error) {
      setInvoiceStatus(null);
      setErrorMessage(error instanceof Error ? error.message : 'Invoice tidak ditemukan.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [invoiceCode]);

  useEffect(() => {
    currentStatusRef.current = invoiceStatus?.status ?? 'pending_payment';
  }, [invoiceStatus?.status]);

  useEffect(() => {
    let mounted = true;
    const poll = async () => {
      if (!mounted) return;
      await loadInvoiceStatus();
    };
    void poll();
    const timer = setInterval(() => {
      if (!terminalStatuses.has(currentStatusRef.current)) void poll();
    }, 3000);
    return () => {
      mounted = false;
      clearInterval(timer);
    };
  }, [loadInvoiceStatus]);

  const timeline = invoiceStatus?.timeline ?? [];

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-16 text-slate-950">
      <section className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-[2rem] bg-slate-950 p-8 text-white shadow-xl">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Status Invoice</p>
          <h1 className="mt-3 break-all text-4xl font-black">{invoiceCode}</h1>
          <p className="mt-3 text-slate-300">Pantau pembayaran Midtrans dan fulfillment Digiflazz tanpa login.</p>
        </header>

        {isLoading ? <div className="rounded-3xl bg-white p-8 text-center font-bold">Memuat status invoice...</div> : null}

        {errorMessage && !isLoading ? (
          <div className="rounded-3xl bg-red-50 p-6 text-red-700" data-testid="invoice-error">
            <h2 className="text-xl font-black">Invoice tidak ditemukan</h2>
            <p className="mt-2 text-sm">{errorMessage}</p>
            <button type="button" onClick={() => void loadInvoiceStatus(true)} className="mt-4 rounded-2xl bg-red-600 px-5 py-3 font-bold text-white">Coba lagi</button>
          </div>
        ) : null}

        {invoiceStatus && !isLoading ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
            <section className="rounded-[2rem] bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-500">Kode Invoice</p>
                  <h2 className="mt-1 break-all text-3xl font-black">{invoiceStatus.invoice_code}</h2>
                </div>
                <span data-testid="status-badge" className={`w-fit rounded-full border px-4 py-2 text-sm font-bold ${statusTone(invoiceStatus.status)}`}>{statusLabels[invoiceStatus.status]}</span>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Order ID</p><p className="mt-2 break-all text-sm font-bold">{invoiceStatus.order_id}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Produk</p><p className="mt-2 text-sm font-bold">{invoiceStatus.product_code}</p></div>
                <div className="rounded-2xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase text-slate-400">Nominal</p><p className="mt-2 text-sm font-bold">{formatRupiah(invoiceStatus.amount_minor)}</p></div>
              </div>

              <div className="mt-6 space-y-3">
                {statusSteps.map((step, index) => {
                  const complete = index <= currentStepIndex;
                  const item = timeline.find((entry) => entry.toStatus === step.status);
                  return (
                    <article key={step.status} className={`rounded-2xl border p-4 ${complete ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'}`}>
                      <h3 className="font-black">{step.title}</h3>
                      <p className="mt-1 text-sm text-slate-600">{step.description}</p>
                      {item ? <p className="mt-2 text-xs text-slate-500">{formatDateTime(item.createdAt)} · {item.note ?? 'Status diperbarui'}</p> : null}
                    </article>
                  );
                })}
              </div>
            </section>

            <aside className="space-y-4">
              <section className="rounded-[2rem] bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black">Ringkasan Provider</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <p>Payment: <strong>{invoiceStatus.payment?.status ?? 'belum ada'}</strong></p>
                  <p>Fulfillment: <strong>{invoiceStatus.fulfillment?.status ?? 'belum ada'}</strong></p>
                  <p>SN: <strong>{invoiceStatus.fulfillment?.serial_number ?? '-'}</strong></p>
                </div>
                <button type="button" onClick={() => void loadInvoiceStatus(true)} disabled={isRefreshing} className="mt-5 w-full rounded-2xl bg-slate-950 px-5 py-3 font-black text-white disabled:opacity-60">
                  {isRefreshing ? 'Refresh...' : 'Refresh status'}
                </button>
              </section>
            </aside>
          </div>
        ) : null}
      </section>
    </main>
  );
}
