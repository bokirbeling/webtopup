import { Users, ShoppingBag, Star, Clock } from 'lucide-react';

const stats = [
  { icon: Users, value: '2.5 Juta+', label: 'Pengguna Aktif', color: 'text-blue-500', bg: 'bg-blue-50' },
  { icon: ShoppingBag, value: '50 Juta+', label: 'Transaksi Berhasil', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { icon: Star, value: '4.9/5', label: 'Rating Pengguna', color: 'text-amber-500', bg: 'bg-amber-50' },
  { icon: Clock, value: '< 5 Detik', label: 'Waktu Proses', color: 'text-rose-500', bg: 'bg-rose-50' },
];

export default function Stats() {
  return (
    <section className="py-14 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
            Dipercaya Jutaan Pengguna
          </h2>
          <p className="text-slate-500 max-w-md mx-auto">
            Platform PPOB terpercaya dengan pengalaman transaksi digital terbaik di Indonesia
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {stats.map(({ icon: Icon, value, label, color, bg }) => (
            <div
              key={label}
              className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
            >
              <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                <Icon size={22} className={color} />
              </div>
              <p className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">{value}</p>
              <p className="text-slate-500 text-sm">{label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
