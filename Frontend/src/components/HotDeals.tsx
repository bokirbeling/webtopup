import { Flame, Star, TrendingUp, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { buildApiUrl } from '../lib/api';

type HotDeal = {
  id: string;
  title: string;
  subtitle: string;
  original_price_minor: number;
  sale_price_minor: number;
  badge_text: string;
  badge_color: string;
  image_url: string;
  is_active: boolean;
  display_order: number;
};

function fmt(amountMinor: number) {
  return 'Rp ' + (amountMinor / 100).toLocaleString('id-ID');
}

export default function HotDeals() {
  const [deals, setDeals] = useState<HotDeal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDeals() {
      try {
        const url = buildApiUrl('/dashboard/deals');
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setDeals(data);
        }
      } catch (err) {
        console.error('Failed to fetch hot deals:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDeals();
  }, []);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        </div>
      </section>
    );
  }

  if (deals.length === 0) {
    return null;
  }
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-14">
      {/* Section header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-orange-500 flex items-center justify-center">
            <Flame size={16} className="text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">Hot Deals</h2>
            <p className="text-slate-500 text-xs">Penawaran terbaik hari ini</p>
          </div>
        </div>
        <button className="flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors">
          <TrendingUp size={14} />
          Lihat Semua
        </button>
      </div>

      {/* Deals grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {deals.map((deal) => {
          const discount = Math.round(((deal.original_price_minor - deal.sale_price_minor) / deal.original_price_minor) * 100);
          
          return (
            <button
              key={deal.id}
              className="group bg-white rounded-2xl border border-slate-100 hover:border-amber-200 hover:shadow-lg transition-all overflow-hidden text-left"
            >
              {/* Image */}
              <div className="relative aspect-square overflow-hidden bg-slate-50">
                <img
                  src={deal.image_url}
                  alt={deal.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <div className="absolute top-2 left-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                  -{discount}%
                </div>
              </div>

              {/* Info */}
              <div className="p-3">
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${deal.badge_color}`}>
                  {deal.badge_text}
                </span>
                <p className="text-slate-800 text-xs font-semibold mt-1.5 leading-tight line-clamp-2">
                  {deal.title}
                </p>
                <p className="text-slate-400 text-[10px] line-through mt-1">{fmt(deal.original_price_minor)}</p>
                <p className="text-slate-900 text-sm font-bold">{fmt(deal.sale_price_minor)}</p>

                <div className="flex items-center gap-1 mt-1.5">
                  <Star size={10} className="fill-amber-400 text-amber-400" />
                  <span className="text-[10px] text-slate-500">4.8</span>
                  <span className="text-[10px] text-slate-400 ml-auto">Hot</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
