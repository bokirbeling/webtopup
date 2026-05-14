import { Phone, Zap, Gamepad2, CreditCard, Wifi, Droplets, Shield, Tv, Bus, Landmark, Package, Gift } from 'lucide-react';

const categories = [
  { label: 'Pulsa', sub: 'Semua Operator', icon: Phone, color: 'bg-blue-50 text-blue-600', border: 'hover:border-blue-200', hot: false },
  { label: 'Listrik PLN', sub: 'Token & Tagihan', icon: Zap, color: 'bg-amber-50 text-amber-600', border: 'hover:border-amber-200', hot: true },
  { label: 'Paket Data', sub: 'Kuota Internet', icon: Wifi, color: 'bg-cyan-50 text-cyan-600', border: 'hover:border-cyan-200', hot: false },
  { label: 'Game', sub: 'Top Up Voucher', icon: Gamepad2, color: 'bg-emerald-50 text-emerald-600', border: 'hover:border-emerald-200', hot: true },
  { label: 'E-Wallet', sub: 'OVO, GoPay, DANA', icon: CreditCard, color: 'bg-rose-50 text-rose-600', border: 'hover:border-rose-200', hot: false },
  { label: 'PDAM', sub: 'Air Bersih', icon: Droplets, color: 'bg-teal-50 text-teal-600', border: 'hover:border-teal-200', hot: false },
  { label: 'BPJS', sub: 'Kesehatan & TK', icon: Shield, color: 'bg-green-50 text-green-600', border: 'hover:border-green-200', hot: false },
  { label: 'TV Kabel', sub: 'IndiHome, UseeTV', icon: Tv, color: 'bg-orange-50 text-orange-600', border: 'hover:border-orange-200', hot: false },
  { label: 'Transportasi', sub: 'KAI, Bus, Kapal', icon: Bus, color: 'bg-sky-50 text-sky-600', border: 'hover:border-sky-200', hot: false },
  { label: 'Perbankan', sub: 'Transfer & Cicilan', icon: Landmark, color: 'bg-slate-50 text-slate-600', border: 'hover:border-slate-200', hot: false },
  { label: 'Voucher', sub: 'Diskon & Cashback', icon: Gift, color: 'bg-pink-50 text-pink-600', border: 'hover:border-pink-200', hot: true },
  { label: 'Marketplace', sub: 'Shopee, Tokopedia', icon: Package, color: 'bg-yellow-50 text-yellow-600', border: 'hover:border-yellow-200', hot: false },
];

export default function Categories() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Semua Layanan</h2>
          <p className="text-slate-500 text-sm mt-0.5">100+ layanan digital tersedia untukmu</p>
        </div>
        <button className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors">
          Lihat Semua →
        </button>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3">
        {categories.map(({ label, sub, icon: Icon, color, border, hot }) => (
          <button
            key={label}
            className={`group relative flex flex-col items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-100 ${border} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-center`}
          >
            {hot && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                HOT
              </span>
            )}
            <div className={`w-11 h-11 rounded-xl ${color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-slate-800 text-xs font-semibold leading-tight">{label}</p>
              <p className="text-slate-400 text-[10px] mt-0.5 leading-tight">{sub}</p>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
