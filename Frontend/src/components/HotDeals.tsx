import { Flame, Star, TrendingUp } from 'lucide-react';

const deals = [
  {
    id: 1,
    name: 'Pulsa Telkomsel 10rb',
    operator: 'Telkomsel',
    original: 11500,
    price: 10000,
    discount: 13,
    rating: 4.9,
    sold: '12.4rb',
    color: 'from-red-50 to-rose-50',
    badge: 'bg-red-100 text-red-600',
    image: 'https://images.pexels.com/photos/4482896/pexels-photo-4482896.jpeg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 2,
    name: 'Token PLN 50rb',
    operator: 'PLN',
    original: 52500,
    price: 50000,
    discount: 5,
    rating: 4.8,
    sold: '9.1rb',
    color: 'from-amber-50 to-yellow-50',
    badge: 'bg-amber-100 text-amber-600',
    image: 'https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 3,
    name: 'Paket Data XL 15GB',
    operator: 'XL Axiata',
    original: 35000,
    price: 28000,
    discount: 20,
    rating: 4.7,
    sold: '7.8rb',
    color: 'from-blue-50 to-sky-50',
    badge: 'bg-blue-100 text-blue-600',
    image: 'https://images.pexels.com/photos/6963944/pexels-photo-6963944.jpeg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 4,
    name: 'GoPay Voucher 50rb',
    operator: 'GoPay',
    original: 55000,
    price: 48000,
    discount: 13,
    rating: 4.9,
    sold: '18.2rb',
    color: 'from-green-50 to-emerald-50',
    badge: 'bg-green-100 text-green-600',
    image: 'https://images.pexels.com/photos/4386467/pexels-photo-4386467.jpeg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 5,
    name: 'DANA Top Up 100rb',
    operator: 'DANA',
    original: 103000,
    price: 100000,
    discount: 3,
    rating: 4.8,
    sold: '5.6rb',
    color: 'from-sky-50 to-cyan-50',
    badge: 'bg-sky-100 text-sky-600',
    image: 'https://images.pexels.com/photos/4386431/pexels-photo-4386431.jpeg?auto=compress&cs=tinysrgb&w=200',
  },
  {
    id: 6,
    name: 'Paket Indosat 30 Hari',
    operator: 'Indosat',
    original: 65000,
    price: 49000,
    discount: 25,
    rating: 4.6,
    sold: '4.3rb',
    color: 'from-yellow-50 to-orange-50',
    badge: 'bg-yellow-100 text-yellow-700',
    image: 'https://images.pexels.com/photos/4482900/pexels-photo-4482900.jpeg?auto=compress&cs=tinysrgb&w=200',
  },
];

function fmt(n: number) {
  return 'Rp ' + n.toLocaleString('id-ID');
}

export default function HotDeals() {
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-rose-100 rounded-lg flex items-center justify-center">
            <Flame size={16} className="text-rose-500" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Deals Terpanas</h2>
            <p className="text-slate-500 text-sm">Harga terbaik hari ini</p>
          </div>
        </div>
        <button className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors flex items-center gap-1">
          <TrendingUp size={14} /> Lihat Semua
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {deals.map((deal) => (
          <button
            key={deal.id}
            className="group bg-white rounded-2xl border border-slate-100 hover:border-slate-200 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 overflow-hidden text-left"
          >
            {/* Image */}
            <div className={`relative bg-gradient-to-br ${deal.color} aspect-square overflow-hidden`}>
              <img
                src={deal.image}
                alt={deal.name}
                className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-300"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
              <div className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                -{deal.discount}%
              </div>
            </div>

            {/* Info */}
            <div className="p-3">
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${deal.badge}`}>
                {deal.operator}
              </span>
              <p className="text-slate-800 text-xs font-semibold mt-1.5 leading-tight line-clamp-2">
                {deal.name}
              </p>
              <p className="text-slate-400 text-[10px] line-through mt-1">{fmt(deal.original)}</p>
              <p className="text-slate-900 text-sm font-bold">{fmt(deal.price)}</p>

              <div className="flex items-center gap-1 mt-1.5">
                <Star size={10} className="fill-amber-400 text-amber-400" />
                <span className="text-[10px] text-slate-500">{deal.rating}</span>
                <span className="text-[10px] text-slate-400 ml-auto">{deal.sold} terjual</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
