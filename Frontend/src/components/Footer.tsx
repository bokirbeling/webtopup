import { Zap, Phone, Mail, MapPin, Facebook, Twitter, Instagram, Youtube } from 'lucide-react';

const footerLinks = {
  Layanan: [
    { label: 'Pulsa & Data', href: '/' },
    { label: 'Token Listrik', href: '/' },
    { label: 'BPJS Kesehatan', href: '/' },
    { label: 'E-Wallet', href: '/' },
    { label: 'Top Up Game', href: '/' },
    { label: 'PDAM', href: '/' },
  ],
  Perusahaan: [
    { label: 'Tentang Kami', href: '/' },
    { label: 'Karir', href: '/' },
    { label: 'Blog', href: '/' },
    { label: 'Kemitraan', href: '/' },
    { label: 'Hubungi Kami', href: '/' },
  ],
  Bantuan: [
    { label: 'Pusat Bantuan', href: '/' },
    { label: 'Cara Bayar', href: '/' },
    { label: 'Kebijakan Refund', href: '/' },
    { label: 'Syarat & Ketentuan', href: '/' },
    { label: 'Kebijakan Privasi', href: '/' },
  ],
};

const socials = [
  { icon: Facebook, label: 'Facebook', href: '#' },
  { icon: Twitter, label: 'Twitter', href: '#' },
  { icon: Instagram, label: 'Instagram', href: '#' },
  { icon: Youtube, label: 'YouTube', href: '#' },
];

const partners = ['BCA', 'Mandiri', 'BNI', 'BRI', 'GoPay', 'OVO', 'DANA', 'ShopeePay'];

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400">
      {/* Partners strip */}
      <div className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs text-slate-500 mr-2">Partner Pembayaran:</span>
            {partners.map((p) => (
              <span
                key={p}
                className="bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
          {/* Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center">
                <Zap size={18} className="text-white" />
              </div>
              <span className="text-white font-bold text-xl">
                Adnanpay<span className="text-amber-400">.</span>
              </span>
            </div>
            <p className="text-sm leading-relaxed mb-5 max-w-xs">
              Platform PPOB terpercaya untuk semua kebutuhan pembayaran digital kamu. Cepat, aman, dan terjangkau.
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Phone size={14} className="text-amber-400 flex-shrink-0" />
                <span>+62 21 1234 5678</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-amber-400 flex-shrink-0" />
                <span>support@adnanpay.com</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-amber-400 flex-shrink-0" />
                <span>Jakarta, Indonesia</span>
              </div>
            </div>

            {/* Socials */}
            <div className="flex items-center gap-2 mt-5">
              {socials.map(({ icon: Icon, label, href }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  className="w-8 h-8 bg-white/5 hover:bg-amber-400/20 border border-white/10 hover:border-amber-400/30 rounded-lg flex items-center justify-center text-slate-400 hover:text-amber-400 transition-all"
                >
                  <Icon size={15} />
                </a>
              ))}
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <h4 className="text-white font-semibold text-sm mb-4">{group}</h4>
              <ul className="space-y-2">
                {links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm hover:text-white hover:translate-x-0.5 transition-all inline-block"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>&copy; 2025 Adnanpay. Hak cipta dilindungi.</span>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            <span>Semua sistem berjalan normal</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
