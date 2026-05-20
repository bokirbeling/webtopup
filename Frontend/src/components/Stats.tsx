import { Users, ShoppingBag, Star, Clock, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { buildApiUrl } from '../lib/api';

type StatData = {
  id: string;
  icon_name: string;
  value: string;
  label: string;
  is_active: boolean;
  display_order: number;
};

const iconMap: Record<string, any> = {
  Users, ShoppingBag, Star, Clock
};

const colorMap: Record<string, { text: string; bg: string }> = {
  'Pengguna Aktif': { text: 'text-blue-500', bg: 'bg-blue-50' },
  'Transaksi Berhasil': { text: 'text-emerald-500', bg: 'bg-emerald-50' },
  'Rating Pengguna': { text: 'text-amber-500', bg: 'bg-amber-50' },
  'Waktu Proses': { text: 'text-rose-500', bg: 'bg-rose-50' },
};

export default function Stats() {
  const [stats, setStats] = useState<StatData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const url = buildApiUrl('/dashboard/stats');
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <section className="py-14 bg-slate-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
          </div>
        </div>
      </section>
    );
  }

  if (stats.length === 0) {
    return null;
  }

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
          {stats.map((stat) => {
            const Icon = iconMap[stat.icon_name] || Users;
            const colors = colorMap[stat.label] || { text: 'text-slate-500', bg: 'bg-slate-50' };
            
            return (
              <div
                key={stat.id}
                className="bg-white rounded-2xl p-6 text-center border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
              >
                <div className={`w-12 h-12 ${colors.bg} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                  <Icon size={22} className={colors.text} />
                </div>
                <p className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">{stat.value}</p>
                <p className="text-slate-500 text-sm">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
