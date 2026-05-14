import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const promos = [
  {
    id: 1,
    title: 'Cashback 25% Pulsa All Operator',
    subtitle: 'Berlaku setiap Senin & Rabu',
    badge: 'HOT PROMO',
    badgeColor: 'bg-rose-500',
    cta: 'Beli Sekarang',
    bg: 'from-blue-600 via-blue-700 to-slate-800',
    accent: 'bg-blue-400/20',
    image: 'https://images.pexels.com/photos/4482900/pexels-photo-4482900.jpeg?auto=compress&cs=tinysrgb&w=600',
    discount: '25%',
  },
  {
    id: 2,
    title: 'Gratis Biaya Admin Bayar PLN',
    subtitle: 'Untuk semua pelanggan setia',
    badge: 'SPESIAL',
    badgeColor: 'bg-amber-500',
    cta: 'Bayar Listrik',
    bg: 'from-amber-500 via-orange-600 to-red-700',
    accent: 'bg-amber-400/20',
    image: 'https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg?auto=compress&cs=tinysrgb&w=600',
    discount: 'FREE',
  },
  {
    id: 3,
    title: 'Top Up Game Dapat Bonus Diamond',
    subtitle: 'Mobile Legends, PUBG, Free Fire & lebih',
    badge: 'TERBATAS',
    badgeColor: 'bg-emerald-500',
    cta: 'Top Up Game',
    bg: 'from-emerald-600 via-teal-700 to-slate-800',
    accent: 'bg-emerald-400/20',
    image: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=600',
    discount: '+50',
  },
];

export default function PromoCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setCurrent((c) => (c + 1) % promos.length), 4000);
    return () => clearInterval(timer);
  }, []);

  const prev = () => setCurrent((c) => (c - 1 + promos.length) % promos.length);
  const next = () => setCurrent((c) => (c + 1) % promos.length);

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-10">
      <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-slate-200">
        {promos.map((promo, index) => (
          <div
            key={promo.id}
            className={`absolute inset-0 transition-all duration-700 ease-in-out ${
              index === current ? 'opacity-100 scale-100' : 'opacity-0 scale-105 pointer-events-none'
            }`}
          >
            <div className={`relative h-full bg-gradient-to-r ${promo.bg} min-h-[200px] md:min-h-[260px]`}>
              {/* Background image */}
              <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden">
                <img
                  src={promo.image}
                  alt={promo.title}
                  className="w-full h-full object-cover opacity-20 mix-blend-overlay"
                />
                <div className={`absolute inset-0 ${promo.accent}`} />
              </div>

              <div className="relative z-10 flex items-center h-full px-8 md:px-12 py-10">
                <div>
                  <div className={`inline-block ${promo.badgeColor} text-white text-xs font-bold px-3 py-1 rounded-full mb-3 tracking-wider`}>
                    {promo.badge}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-2 max-w-md">
                    {promo.title}
                  </h2>
                  <p className="text-white/70 mb-5 text-sm md:text-base">{promo.subtitle}</p>
                  <button className="bg-white text-slate-800 font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-slate-100 transition-all shadow-lg">
                    {promo.cta}
                  </button>
                </div>

                {/* Big discount number */}
                <div className="absolute right-6 md:right-16 top-1/2 -translate-y-1/2 text-white/10 font-black text-8xl md:text-9xl select-none pointer-events-none">
                  {promo.discount}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Static wrapper for height */}
        <div className="invisible min-h-[200px] md:min-h-[260px]" />

        {/* Controls */}
        <button
          onClick={prev}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          onClick={next}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-full flex items-center justify-center transition-all"
        >
          <ChevronRight size={16} />
        </button>

        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-1.5">
          {promos.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`transition-all rounded-full ${
                i === current ? 'w-6 h-2 bg-white' : 'w-2 h-2 bg-white/40 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
