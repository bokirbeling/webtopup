import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertCircle, CheckCircle2, Clock3, CreditCard, Loader2, PackageCheck, ReceiptText, RefreshCw, ShieldCheck } from 'lucide-react';

import { buildApiUrl, readApiError } from '../lib/api';

type OrderStatus = 'created' | 'pending_payment' | 'paid' | 'fulfillment_pending' | 'success' | 'failed' | 'expired';

type InvoiceStatusResponse = Readonly<{
  invoice_code: string;
  order_id: string;
  status: OrderStatus;
  product_code: string;
  provider: string;
  amount_minor: number;
  currency: string;
  payment: null | Readonly<{
    payment_id: string;
    provider: string;
    status: string;
    paid_at: string | null;
    updated_at: string;
  }>;
  fulfillment: null | Readonly<{
    fulfillment_id: string;
    provider: string;
    status: string;
    serial_number: string | null;
    processed_at: string | null;
    updated_at: string;
  }>;
  timeline: ReadonlyArray<{
    id: number;
    fromStatus: OrderStatus | null;
    toStatus: OrderStatus;
    note: string | null;
    createdBy: string;
    createdAt: string;
  }>;
}>;

type InvoiceStatusPageProps = Readonly<{
  invoiceCode: string;
}>;

const statusSteps: ReadonlyArray<{
  status: OrderStatus;
  title: string;
  description: string;
  icon: typeof Clock3;
}> = [
  {
    status: 'pending_payment',
    title: 'Menunggu Pembayaran',
    description: 'Invoice sudah dibuat dan menunggu pembayaran dikonfirmasi.',
    icon: Clock3,
  },
  {
    status: 'paid',
    title: 'Pembayaran Diterima',
    description: 'Payment gateway mengirim konfirmasi pembayaran berhasil.',
    icon: CreditCard,
  },
  {
    status: 'fulfillment_pending',
    title: 'Diproses Provider',
    description: 'Pesanan diteruskan ke provider untuk dipenuhi.',
    icon: PackageCheck,
  },
  {
    status: 'success',
    title: 'Transaksi Sukses',
    description: 'Produk berhasil dikirim dan transaksi selesai.',
    icon: CheckCircle2,
  },
];

const statusLabels: Readonly<Record<OrderStatus, string>> = {
  created: 'Dibuat',
  pending_payment: 'Menunggu Pembayaran',
  paid: 'Dibayar',
  fulfillment_pending: 'Diproses Provider',
  success: 'Sukses',
  failed: 'Gagal',
  expired: 'Kedaluwarsa',
};

const terminalStatuses: ReadonlySet<OrderStatus> = new Set(['success', 'failed', 'expired']);

function formatRupiah(amountMinor: number) {
  return 'Rp ' + amountMinor.toLocaleString('id-ID');
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function getStatusTone(status: OrderStatus) {
  if (status === 'success') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  }

  if (status === 'failed' || status === 'expired') {
    return 'border-rose-200 bg-rose-50 text-rose-700';
  }

  return 'border-amber-200 bg-amber-50 text-amber-700';
}

export default function InvoiceStatusPage({ invoiceCode }: InvoiceStatusPageProps) {
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
    if (showRefresh) {
      setIsRefreshing(true);
    }

    try {
      const response = await fetch(buildApiUrl('/api/invoices/' + encodeURIComponent(invoiceCode) + '/status'));

      if (!response.ok) {
        throw new Error(await readApiError(response, 'Invoice tidak ditemukan'));
      }

      const payload = (await response.json()) as InvoiceStatusResponse;
      setInvoiceStatus(payload);
      setErrorMessage(null);
    } catch (error) {
      setInvoiceStatus(null);
      setErrorMessage(error instanceof Error ? error.message : 'Invoice tidak ditemukan');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [invoiceCode]);

  useEffect(() => {
    currentStatusRef.current = invoiceStatus?.status ?? 'pending_payment';
  }, [invoiceStatus?.status]);

  useEffect(() => {
    let isMounted = true;
    const timer = setInterval(() => {
      if (!terminalStatuses.has(currentStatusRef.current)) {
        void pollStatus();
      }
    }, 2000);

    const pollStatus = async () => {
      if (!isMounted) {
        return;
      }

      await loadInvoiceStatus();
    };

    void pollStatus();
    return () => {
      isMounted = false;
      clearInterval(timer);
    };
  }, [loadInvoiceStatus]);

  const latestTimeline = invoiceStatus?.timeline ?? [];

  return (
    <main className="bg-slate-50 pt-16">
      <section className="relative overflow-hidden bg-slate-900">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950" />
        <div className="absolute left-0 top-20 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />
        <div className="absolute right-0 top-8 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8 lg:py-18">
          <div className="max-w-3xl">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-amber-300">
              <ReceiptText size={14} />
              Status Invoice
            </div>
            <h1 className="text-3xl font-extrabold leading-tight text-white md:text-5xl">
              Pantau transaksi tanpa login.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-slate-300 md:text-base">
              Buka langsung invoice kamu, lihat konfirmasi pembayaran, dan ikuti proses fulfillment secara real time.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8">
        <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-xl shadow-slate-200/70 md:p-7">
          <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-500">Kode Invoice</p>
              <h2 className="mt-1 break-all text-2xl font-extrabold text-slate-900 md:text-3xl">{invoiceCode}</h2>
            </div>
            {invoiceStatus && (
              <span
                data-testid="status-badge"
                className={`inline-flex w-fit items-center gap-2 rounded-full border px-4 py-2 text-sm font-bold ${getStatusTone(invoiceStatus.status)}`}
              >
                <span className="h-2 w-2 rounded-full bg-current" />
                {statusLabels[invoiceStatus.status]}
              </span>
            )}
          </div>

          {isLoading && (
            <div className="flex items-center gap-3 py-12 text-slate-500">
              <Loader2 className="animate-spin text-amber-500" size={22} />
              Memuat status invoice...
            </div>
          )}

          {errorMessage && !isLoading && (
            <div data-testid="invoice-error" className="mt-6 rounded-2xl border border-rose-100 bg-rose-50 p-5 text-rose-700">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 flex-shrink-0" size={22} />
                <div>
                  <h3 className="font-bold">Invoice tidak ditemukan</h3>
                  <p className="mt-1 text-sm">{errorMessage}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => void loadInvoiceStatus(true)}
                className="mt-4 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-rose-700"
              >
                <RefreshCw size={14} />
                Coba Lagi
              </button>
            </div>
          )}

          {invoiceStatus && !isLoading && (
            <div className="mt-6 space-y-6">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Order ID</p>
                  <p className="mt-2 break-all text-sm font-bold text-slate-900">{invoiceStatus.order_id}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Produk</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{invoiceStatus.product_code}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Nominal</p>
                  <p className="mt-2 text-sm font-bold text-slate-900">{formatRupiah(invoiceStatus.amount_minor)}</p>
                </div>
              </div>

              <div className="space-y-3">
                {statusSteps.map(({ status, title, description, icon: StepIcon }, stepIndex) => {
                  const isComplete = stepIndex <= currentStepIndex;
                  const timelineEntry = latestTimeline.find((entry) => entry.toStatus === status);

                  return (
                    <div
                      key={status}
                      data-testid={status === 'success' ? 'timeline-item-success' : undefined}
                      className={`rounded-2xl border p-4 transition-all ${
                        isComplete ? 'border-emerald-100 bg-emerald-50/70' : 'border-slate-100 bg-slate-50'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ${
                            isComplete ? 'bg-emerald-500 text-white' : 'bg-white text-slate-400'
                          }`}
                        >
                          <StepIcon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                            <h3 className="font-bold text-slate-900">{title}</h3>
                            {timelineEntry && (
                              <span className="text-xs font-semibold text-slate-500">{formatDateTime(timelineEntry.createdAt)}</span>
                            )}
                          </div>
                          <p className="mt-1 text-sm text-slate-500">{timelineEntry?.note ?? description}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-white/10 bg-slate-900 p-5 text-white shadow-xl shadow-slate-300/40">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
              <ShieldCheck size={22} />
            </div>
            <h2 className="mt-4 text-xl font-extrabold">Aman untuk tamu</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Halaman ini hanya mengambil satu invoice berdasarkan kode yang kamu buka. Tidak ada daftar order terbuka.
            </p>
          </div>

          {invoiceStatus && (
            <div className="rounded-3xl border border-slate-100 bg-white p-5 shadow-lg shadow-slate-200/70">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">Ringkasan</h2>
              <dl className="mt-4 space-y-3 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Payment</dt>
                  <dd className="font-bold text-slate-900">{invoiceStatus.payment?.status ?? 'Belum tersedia'}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Fulfillment</dt>
                  <dd className="font-bold text-slate-900">{invoiceStatus.fulfillment?.status ?? 'Belum tersedia'}</dd>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-slate-500">Provider</dt>
                  <dd className="font-bold text-slate-900">{invoiceStatus.provider}</dd>
                </div>
              </dl>
            </div>
          )}

          <button
            type="button"
            onClick={() => void loadInvoiceStatus(true)}
            disabled={isRefreshing}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:from-amber-300 hover:to-orange-400 disabled:opacity-70"
          >
            {isRefreshing ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
            Refresh Status
          </button>
        </aside>
      </section>
    </main>
  );
}
