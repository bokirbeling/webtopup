import { ShieldCheck, Zap, Headphones, CreditCard, RefreshCw, Award, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { buildApiUrl } from '../lib/api';

type FeatureData = {
  id: string;
  icon_name: string;
  title: string;
  description: string;
  is_active: boolean;
  display_order: number;
};

const iconMap: Record<string, any> = {
  ShieldCheck, Zap, Headphones, CreditCard, RefreshCw, Award
};

const colorMap: Record<string, { text: string; bg: string; border: string }> = {
  'Transaksi 100% Aman': { text: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
  'Proses Instan': { text: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
  'CS 24/7': { text: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
  'Banyak Metode Bayar': { text: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-100' },
  'Refund Otomatis': { text: 'text-teal-600', bg: 'bg-teal-50', border: 'border-teal-100' },
  'Harga Terbaik': { text: 'text-orange-600', bg: 'bg-orange-50', border: 'border-orange-100' },
};

export default function Features() {
  const [features, setFeatures] = useState<FeatureData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatures() {
      try {
        const url = buildApiUrl('/dashboard/features');
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setFeatures(data);
        }
      } catch (err) {
        console.error('Failed to fetch features:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFeatures();
  }, []);

  if (loading) {
    return (
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (features.length === 0) {
    return null;
  }

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <span className="inline-block text-xs font-bold text-amber-600 bg-amber-50 border border-amber-100 px-3 py-1 rounded-full mb-3 tracking-wider uppercase">
            Kenapa Adnanpay?
          </span>
          <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-3">
            Lebih dari Sekedar Bayar Tagihan
          </h2>
          <p className="text-slate-500 max-w-lg mx-auto">
            Kami hadir untuk memberikan pengalaman pembayaran digital terbaik, cepat, aman, dan terpercaya.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => {
            const Icon = iconMap[feature.icon_name] || ShieldCheck;
            const colors = colorMap[feature.title] || { text: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100' };
            
            return (
              <div
                key={feature.id}
                className={`group bg-white rounded-2xl p-6 border ${colors.border} hover:shadow-lg hover:-translate-y-1 transition-all`}
              >
                <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon size={22} className={colors.text} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.description}</p>
              </div>
            );
          })}
        </div>

        {/* CTA Banner */}
        <div className="mt-14 relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-10 text-center">
          <div className="absolute top-0 left-1/4 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-extrabold text-white mb-3">
              Mulai Transaksi Sekarang
            </h3>
            <p className="text-slate-400 mb-6 max-w-sm mx-auto">
              Daftar gratis dan dapatkan cashback hingga Rp 25.000 untuk transaksi pertamamu.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button className="bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-lg shadow-amber-500/30 hover:shadow-amber-400/40">
                Daftar Sekarang — Gratis
              </button>
              <button className="border border-white/20 text-white hover:bg-white/10 font-medium px-8 py-3 rounded-xl text-sm transition-all">
                Pelajari Lebih Lanjut
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
