import { useState, useEffect } from 'react';
import { Search, Zap, Phone, Gamepad2, CreditCard, Wifi, Droplets, Shield, Tv, Loader2 } from 'lucide-react';
import { buildApiUrl } from '../lib/api';

type QuickLink = {
  id: string;
  title: string;
  icon_name: string;
  link: string;
  is_active: boolean;
  display_order: number;
};

const iconMap: Record<string, any> = {
  Phone, Zap, Gamepad2, CreditCard, Wifi, Droplets, Shield, Tv
};

const colorMap: Record<string, string> = {
  'Pulsa': 'from-blue-500 to-blue-600',
  'PLN': 'from-amber-500 to-orange-500',
  'Games': 'from-emerald-500 to-teal-600',
  'E-Money': 'from-rose-500 to-pink-600',
  'Data': 'from-sky-500 to-cyan-600',
  'Voucher': 'from-violet-500 to-purple-600',
};

export default function Hero() {
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('Semua');
  const [quickLinks, setQuickLinks] = useState<QuickLink[]>([]);
  const [loading, setLoading] = useState(true);
  const tabs = ['Semua', 'Terpopuler', 'Promo', 'Baru'];

  useEffect(() => {
    async function fetchQuickLinks() {
      try {
        const url = buildApiUrl('/dashboard/hero');
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setQuickLinks(data);
        }
      } catch (err) {
        console.error('Failed to fetch quick links:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchQuickLinks();
  }, []);

  return (
    <section className="relative pt-16 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      <div className="absolute inset-0">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-10 right-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-0 left-1/2 w-96 h-48 bg-emerald-500/8 rounded-full blur-3xl" />
      </div>

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-400/10 border border-amber-400/20 mb-6">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-ping" />
            <span className="text-amber-300 text-xs font-semibold tracking-wider uppercase">
              Transaksi Aman & Terpercaya
            </span>
          </div>

          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-4">
            Bayar Semua
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400">
              Kebutuhan Digital
            </span>
            <br />
            Di Satu Tempat
          </h1>
          <p className="text-slate-400 text-lg mb-8 max-w-xl mx-auto leading-relaxed">
            Pulsa, listrik, internet, game, e-wallet, dan lebih dari 100+ layanan digital tersedia 24/7 dengan harga terbaik.
          </p>

          {/* Search Bar */}
          <div className="flex items-center gap-2 bg-white rounded-2xl p-2 shadow-2xl shadow-slate-900/40 mb-6">
            <div className="flex-1 flex items-center gap-2 px-2">
              <Search size={18} className="text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Cari layanan, operator, atau nama game..."
                className="w-full text-slate-800 placeholder-slate-400 text-sm py-1.5 focus:outline-none bg-transparent"
              />
            </div>
            <button className="bg-gradient-to-r from-amber-400 to-orange-500 text-slate-900 font-bold px-5 py-2.5 rounded-xl text-sm hover:from-amber-300 hover:to-orange-400 transition-all shadow-md shadow-amber-500/30 flex-shrink-0">
              Cari Sekarang
            </button>
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
                  activeTab === tab
                    ? 'bg-amber-400 text-slate-900'
                    : 'text-slate-400 hover:text-white hover:bg-white/10'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Quick Links */}
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 text-amber-400 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
              {quickLinks.map((link) => {
                const Icon = iconMap[link.icon_name] || Phone;
                const color = colorMap[link.title] || 'from-slate-500 to-slate-600';
                
                return (
                  <button
                    key={link.id}
                    className="group flex flex-col items-center gap-2 p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-200 hover:-translate-y-1"
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <span className="text-slate-300 text-xs font-medium group-hover:text-white transition-colors">
                      {link.title}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Wave divider */}
      <div className="relative h-12 overflow-hidden">
        <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 w-full">
          <path d="M0 48L60 42.7C120 37.3 240 26.7 360 24C480 21.3 600 26.7 720 29.3C840 32 960 32 1080 26.7C1200 21.3 1320 10.7 1380 5.3L1440 0V48H1380C1320 48 1200 48 1080 48C960 48 840 48 720 48C600 48 480 48 360 48C240 48 120 48 60 48H0Z" fill="#f8fafc" />
        </svg>
      </div>
    </section>
  );
}
