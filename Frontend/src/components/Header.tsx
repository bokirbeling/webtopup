import { useState, useEffect } from 'react';
import { Search, Bell, ShoppingCart, ChevronDown, Menu, X, Zap, Phone, Gamepad2, CreditCard, Wifi } from 'lucide-react';

const navLinks = [
  { label: 'Pulsa & Data', icon: Phone },
  { label: 'Listrik & Air', icon: Zap },
  { label: 'Game', icon: Gamepad2 },
  { label: 'E-Wallet', icon: CreditCard },
  { label: 'Internet', icon: Wifi },
];

export default function Header() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? 'bg-slate-900 shadow-xl shadow-slate-900/30' : 'bg-slate-900/95 backdrop-blur-md'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
              <Zap size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">
              Adnanpay<span className="text-amber-400">.</span>
            </span>
          </div>

          {/* Nav Links - desktop */}
          <nav className="hidden lg:flex items-center gap-1">
            {navLinks.map(({ label, icon: Icon }) => (
              <button
                key={label}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-medium"
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
            <button className="flex items-center gap-1 px-3 py-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all duration-200 text-sm font-medium">
              Lainnya <ChevronDown size={13} />
            </button>
          </nav>

          {/* Search - desktop */}
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-xs mx-4">
            <div className="relative w-full">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari layanan..."
                className="w-full bg-white/10 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-sm text-white placeholder-slate-400 focus:outline-none focus:bg-white/15 focus:border-amber-400/50 transition-all"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="hidden sm:flex relative p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-400 rounded-full"></span>
            </button>
            <button className="hidden sm:flex p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-all">
              <ShoppingCart size={18} />
            </button>
            <a href="/dashboard" className="hidden sm:block px-3 py-1.5 border border-amber-400/70 text-amber-400 rounded-lg text-sm font-medium hover:bg-amber-400/10 transition-all">
              Masuk
            </a>
            <a href="/dashboard" className="hidden sm:block px-3 py-1.5 bg-amber-400 text-slate-900 rounded-lg text-sm font-bold hover:bg-amber-300 transition-all">
              Daftar
            </a>
            <button
              className="lg:hidden p-2 text-slate-300 hover:text-white"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="lg:hidden bg-slate-900 border-t border-white/10 px-4 py-4 space-y-1">
          {navLinks.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-all text-sm font-medium"
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
          <div className="flex gap-2 pt-2">
            <a href="/dashboard" className="flex-1 py-2 border border-amber-400/70 text-amber-400 rounded-lg text-sm font-medium text-center">
              Masuk
            </a>
            <a href="/dashboard" className="flex-1 py-2 bg-amber-400 text-slate-900 rounded-lg text-sm font-bold text-center">
              Daftar
            </a>
          </div>
        </div>
      )}
    </header>
  );
}
