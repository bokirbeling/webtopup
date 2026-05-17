import Link from 'next/link';
import ProductCatalog from '@/components/ProductCatalog';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      <nav className="border-b border-slate-800 bg-slate-950/50 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-500"></div>
              <span className="text-xl font-bold text-white">Adnanpay</span>
            </div>
            <div className="flex gap-4">
              <Link className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white" href="/dashboard">Dashboard</Link>
              <Link className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white" href="/admin">Admin</Link>
              <Link className="rounded-lg px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-slate-800 hover:text-white" href="/lacak">Lacak Order</Link>
            </div>
          </div>
        </div>
      </nav>
      <ProductCatalog />
    </main>
  );
}
