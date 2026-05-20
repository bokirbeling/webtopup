import { useEffect, useState } from 'react';
import { Phone, Zap, Gamepad2, CreditCard, Wifi, Droplets, Shield, Tv, Bus, Landmark, Package, Gift, Loader2 } from 'lucide-react';
import { buildApiUrl } from '../lib/api';

type CategoryData = {
  id: string;
  title: string;
  subtitle: string;
  icon_name: string;
  link: string;
  is_active: boolean;
  display_order: number;
};

const iconMap: Record<string, any> = {
  Phone, Zap, Gamepad2, CreditCard, Wifi, Droplets, Shield, Tv, Bus, Landmark, Package, Gift
};

const colorMap: Record<string, { bg: string; text: string; border: string }> = {
  'Pulsa': { bg: 'bg-blue-50', text: 'text-blue-600', border: 'hover:border-blue-200' },
  'PLN': { bg: 'bg-amber-50', text: 'text-amber-600', border: 'hover:border-amber-200' },
  'Data': { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'hover:border-cyan-200' },
  'Games': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'hover:border-emerald-200' },
  'E-Money': { bg: 'bg-rose-50', text: 'text-rose-600', border: 'hover:border-rose-200' },
  'Voucher': { bg: 'bg-pink-50', text: 'text-pink-600', border: 'hover:border-pink-200' },
};

type CategoriesProps = {
  onCategoryClick?: (category: string) => void;
};

export default function Categories({ onCategoryClick }: CategoriesProps) {
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchCategories() {
      try {
        const url = buildApiUrl('/dashboard/categories');
        const response = await fetch(url);
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (err) {
        console.error('Failed to fetch categories:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchCategories();
  }, []);

  if (loading) {
    return (
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 text-amber-600 animate-spin" />
        </div>
      </section>
    );
  }
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Semua Layanan</h2>
          <p className="text-slate-500 text-sm mt-0.5">{categories.length} layanan digital tersedia untukmu</p>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-3">
        {categories.map((category) => {
          const Icon = iconMap[category.icon_name] || Package;
          const colors = colorMap[category.title] || { bg: 'bg-slate-50', text: 'text-slate-600', border: 'hover:border-slate-200' };
          const isHot = ['PLN', 'Games', 'Voucher'].includes(category.title);
          
          return (
            <button
              key={category.id}
              onClick={() => onCategoryClick?.(category.title)}
              className={`group relative flex flex-col items-center gap-2.5 p-3 rounded-2xl bg-white border border-slate-100 ${colors.border} hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-center`}
            >
              {isHot && (
                <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                  HOT
                </span>
              )}
              <div className={`w-11 h-11 rounded-xl ${colors.bg} ${colors.text} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                <Icon size={20} />
              </div>
              <div>
                <p className="text-slate-800 text-xs font-semibold leading-tight">{category.title}</p>
                <p className="text-slate-400 text-[10px] mt-0.5 leading-tight">{category.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
