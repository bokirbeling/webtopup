import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { buildApiUrl } from '../lib/api';

type PromoSlide = {
  id: string;
  title: string;
  subtitle: string;
  badge_text: string;
  badge_color: string;
  cta_text: string;
  cta_link: string;
  background_gradient: string;
  image_url: string;
  is_active: boolean;
  display_order: number;
};

export default function PromoCarousel() {
  const [current, setCurrent] = useState(0);
  const [promos, setPromos] = useState<PromoSlide[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPromos() {
      try {
        const url = buildApiUrl('/dashboard/promos');
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setPromos(data);
        }
      } catch (err) {
        console.error('Failed to fetch promos:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchPromos();
  }, []);

  useEffect(() => {
    if (promos.length === 0) return;
    const timer = setInterval(() => setCurrent((c) => (c + 1) % promos.length), 4000);
    return () => clearInterval(timer);
  }, [promos.length]);

  const prev = () => setCurrent((c) => (c - 1 + promos.length) % promos.length);
  const next = () => setCurrent((c) => (c + 1) % promos.length);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-2 pb-10">
        <div className="flex items-center justify-center py-20 bg-slate-100 rounded-3xl">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        </div>
      </section>
    );
  }

  if (promos.length === 0) {
    return null;
  }

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
            <div className={`relative h-full bg-gradient-to-r ${promo.background_gradient} min-h-[200px] md:min-h-[260px]`}>
              {/* Background image */}
              <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden">
                <img
                  src={promo.image_url}
                  alt={promo.title}
                  className="w-full h-full object-cover opacity-20 mix-blend-overlay"
                />
                <div className="absolute inset-0 bg-white/10" />
              </div>

              <div className="relative z-10 flex items-center h-full px-8 md:px-12 py-10">
                <div>
                  <div className={`inline-block ${promo.badge_color} text-white text-xs font-bold px-3 py-1 rounded-full mb-3 tracking-wider`}>
                    {promo.badge_text}
                  </div>
                  <h2 className="text-2xl md:text-3xl font-extrabold text-white leading-tight mb-2 max-w-md">
                    {promo.title}
                  </h2>
                  <p className="text-white/70 mb-5 text-sm md:text-base">{promo.subtitle}</p>
                  <button className="bg-white text-slate-800 font-bold px-6 py-2.5 rounded-xl text-sm hover:bg-slate-100 transition-all shadow-lg">
                    {promo.cta_text}
                  </button>
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
