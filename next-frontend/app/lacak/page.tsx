'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

function TrackingContent() {
  const searchParams = useSearchParams();
  const invoice = searchParams.get('invoice') || '';

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12 text-slate-950">
      <section className="mx-auto max-w-3xl rounded-3xl bg-white p-8 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-[0.25em] text-cyan-700">Lacak Transaksi</p>
        <h1 className="mt-3 text-3xl font-black">Masukkan kode invoice.</h1>
        <form className="mt-6 flex flex-col gap-3 sm:flex-row" action="/lacak">
          <input name="invoice" defaultValue={invoice} placeholder="INV-XXXX" className="min-w-0 flex-1 rounded-2xl border border-slate-200 px-4 py-3" />
          <button className="rounded-2xl bg-slate-950 px-5 py-3 font-black text-white">Cek status</button>
        </form>
        {invoice ? (
          <Link className="mt-5 inline-flex rounded-2xl bg-cyan-100 px-5 py-3 font-bold text-cyan-900" href={`/invoice?code=${encodeURIComponent(invoice)}`}>
            Buka invoice {invoice}
          </Link>
        ) : null}
      </section>
    </main>
  );
}

export default function TrackingPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-100 flex items-center justify-center"><p>Loading...</p></div>}>
      <TrackingContent />
    </Suspense>
  );
}
