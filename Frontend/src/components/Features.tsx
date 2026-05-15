import { ShieldCheck, Zap, Headphones, CreditCard, RefreshCw, Award } from 'lucide-react';

const features = [
  {
    icon: ShieldCheck,
    title: 'Transaksi 100% Aman',
    desc: 'Sistem enkripsi SSL 256-bit melindungi setiap transaksi. Data pribadi dan finansialmu terjamin.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-100',
  },
  {
    icon: Zap,
    title: 'Proses Instan',
    desc: 'Transaksi diproses dalam hitungan detik. Tidak perlu menunggu lama untuk menikmati layananmu.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
  },
  {
    icon: Headphones,
    title: 'CS 24/7',
    desc: 'Tim customer service kami siap membantu kamu kapan saja melalui live chat, WhatsApp, dan email.',
    color: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-100',
  },
  {
    icon: CreditCard,
    title: 'Banyak Metode Bayar',
    desc: 'Transfer bank, e-wallet, kartu kredit/debit, virtual account, dan gerai minimarket tersedia.',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'border-rose-100',
  },
  {
    icon: RefreshCw,
    title: 'Refund Otomatis',
    desc: 'Jika transaksi gagal, saldo dikembalikan otomatis. Tidak ada risiko kehilangan uang.',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'border-teal-100',
  },
  {
    icon: Award,
    title: 'Harga Terbaik',
    desc: 'Kami berkomitmen memberikan harga terjangkau dengan kualitas layanan premium untuk semua pengguna.',
    color: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-100',
  },
];

export default function Features() {
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
          {features.map(({ icon: Icon, title, desc, color, bg, border }) => (
            <div
              key={title}
              className={`group p-6 rounded-2xl border ${border} bg-white hover:shadow-lg hover:-translate-y-1 transition-all duration-200`}
            >
              <div className={`w-12 h-12 ${bg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <Icon size={22} className={color} />
              </div>
              <h3 className="font-bold text-slate-900 mb-2">{title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
            </div>
          ))}
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
