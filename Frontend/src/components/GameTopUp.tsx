import { FormEvent, useState } from 'react';
import { AlertCircle, CheckCircle2, ExternalLink, Gamepad2, Loader2, RefreshCw, Zap } from 'lucide-react';

import { buildApiUrl, readApiError } from '../lib/api';

function formatRupiah(amountMinor: number) {
  return 'Rp ' + amountMinor.toLocaleString('id-ID');
}

type TopUpItem = Readonly<{
  label: string;
  amountMinor: number;
}>;

type GameProduct = Readonly<{
  id: number;
  code: string;
  name: string;
  category: string;
  players: string;
  image: string;
  color: string;
  items: TopUpItem[];
  popular: boolean;
}>;

type OrderResponse = Readonly<{
  order_id: string;
  invoice_code: string;
  status: string;
}>;

type PaymentResponse = Readonly<{
  payment_id: string;
  order_id: string;
  status: string;
  token: string;
  redirect_url: string;
}>;

const games: GameProduct[] = [
  {
    id: 1,
    code: 'mobile-legends',
    name: 'Mobile Legends',
    category: 'MOBA',
    players: '500rb+',
    image: 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=400',
    color: 'from-blue-600 to-blue-900',
    items: [
      { label: '86 Diamond', amountMinor: 20000 },
      { label: '172 Diamond', amountMinor: 40000 },
      { label: '257 Diamond', amountMinor: 60000 },
      { label: '600 Diamond', amountMinor: 135000 },
    ],
    popular: true,
  },
  {
    id: 2,
    code: 'free-fire',
    name: 'Free Fire',
    category: 'Battle Royale',
    players: '320rb+',
    image: 'https://images.pexels.com/photos/442576/pexels-photo-442576.jpeg?auto=compress&cs=tinysrgb&w=400',
    color: 'from-orange-500 to-red-700',
    items: [
      { label: '70 Diamond', amountMinor: 11000 },
      { label: '140 Diamond', amountMinor: 21000 },
      { label: '355 Diamond', amountMinor: 52000 },
      { label: '720 Diamond', amountMinor: 101000 },
    ],
    popular: false,
  },
  {
    id: 3,
    code: 'pubg-mobile',
    name: 'PUBG Mobile',
    category: 'Battle Royale',
    players: '280rb+',
    image: 'https://images.pexels.com/photos/1293269/pexels-photo-1293269.jpeg?auto=compress&cs=tinysrgb&w=400',
    color: 'from-amber-500 to-slate-800',
    items: [
      { label: '60 UC', amountMinor: 15000 },
      { label: '120 UC', amountMinor: 30000 },
      { label: '325 UC', amountMinor: 75000 },
      { label: '660 UC', amountMinor: 145000 },
    ],
    popular: false,
  },
  {
    id: 4,
    code: 'genshin-impact',
    name: 'Genshin Impact',
    category: 'RPG',
    players: '190rb+',
    image: 'https://images.pexels.com/photos/3621104/pexels-photo-3621104.jpeg?auto=compress&cs=tinysrgb&w=400',
    color: 'from-teal-500 to-blue-800',
    items: [
      { label: '60 Genesis', amountMinor: 16000 },
      { label: '300 Genesis', amountMinor: 79000 },
      { label: '980 Genesis', amountMinor: 249000 },
      { label: '1980 Genesis', amountMinor: 479000 },
    ],
    popular: true,
  },
  {
    id: 5,
    code: 'honkai-star-rail',
    name: 'Honkai Star Rail',
    category: 'RPG',
    players: '120rb+',
    image: 'https://images.pexels.com/photos/7915357/pexels-photo-7915357.jpeg?auto=compress&cs=tinysrgb&w=400',
    color: 'from-violet-500 to-slate-800',
    items: [
      { label: '60 Oneiric', amountMinor: 16000 },
      { label: '300 Oneiric', amountMinor: 79000 },
      { label: '980 Oneiric', amountMinor: 249000 },
      { label: '1980 Oneiric', amountMinor: 479000 },
    ],
    popular: false,
  },
  {
    id: 6,
    code: 'clash-of-clans',
    name: 'Clash of Clans',
    category: 'Strategy',
    players: '95rb+',
    image: 'https://images.pexels.com/photos/4009402/pexels-photo-4009402.jpeg?auto=compress&cs=tinysrgb&w=400',
    color: 'from-green-600 to-emerald-900',
    items: [
      { label: '80 Gems', amountMinor: 15000 },
      { label: '500 Gems', amountMinor: 75000 },
      { label: '1200 Gems', amountMinor: 165000 },
      { label: '2500 Gems', amountMinor: 329000 },
    ],
    popular: false,
  },
];



export default function GameTopUp() {
  const [selectedGameIndex, setSelectedGameIndex] = useState(0);
  const [selectedItemIndex, setSelectedItemIndex] = useState(0);
  const [customerId, setCustomerId] = useState('');
  const [zoneId, setZoneId] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [orderResult, setOrderResult] = useState<OrderResponse | null>(null);
  const [paymentResult, setPaymentResult] = useState<PaymentResponse | null>(null);

  const selectedGame = games[selectedGameIndex];
  const selectedItem = selectedGame.items[selectedItemIndex] ?? selectedGame.items[0];
  const paymentStatus = paymentResult === null ? orderResult?.status : `${orderResult?.status} / ${paymentResult.status}`;

  const submitCheckout = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);
    setOrderResult(null);
    setPaymentResult(null);

    try {
      const orderResponse = await fetch(buildApiUrl('/api/orders'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer_ref: `${customerId.trim()}:${zoneId.trim()}`,
          product_code: `${selectedGame.code}-${selectedItem.label.toLowerCase().replace(/\s+/g, '-')}`,
          provider: 'digiflazz',
          amount_minor: selectedItem.amountMinor,
          currency: 'IDR',
          metadata: {
            source: 'web_checkout',
            game_name: selectedGame.name,
            item_label: selectedItem.label,
            customer_email: email.trim(),
            zone_id: zoneId.trim(),
          },
        }),
      });

      if (!orderResponse.ok) {
        throw new Error(await readApiError(orderResponse, 'Gagal membuat order. Coba lagi beberapa saat lagi.'));
      }

      const createdOrder = (await orderResponse.json()) as OrderResponse;
      setOrderResult(createdOrder);

      const paymentResponse = await fetch(buildApiUrl('/api/payments/midtrans/initialize'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: createdOrder.order_id,
          idempotency_key: `web-${createdOrder.order_id}-${Date.now()}`,
        }),
      });

      if (!paymentResponse.ok) {
        throw new Error(await readApiError(paymentResponse, 'Gagal menyiapkan pembayaran Midtrans.'));
      }

      const initializedPayment = (await paymentResponse.json()) as PaymentResponse;
      setPaymentResult(initializedPayment);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Checkout gagal. Coba ulangi transaksi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void submitCheckout();
  };

  return (
    <section className="bg-slate-900 py-14">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/30">
              <Gamepad2 size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Top Up Game</h2>
              <p className="text-slate-400 text-sm">Proses instan, harga terjangkau</p>
            </div>
          </div>
          <button className="text-sm font-medium text-amber-400 hover:text-amber-300 transition-colors flex items-center gap-1">
            Semua Game →
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {games.map((game, gameIndex) => (
              <div
                key={game.id}
                data-testid={gameIndex === 0 ? 'product-card-0' : undefined}
                className={`group relative rounded-2xl overflow-hidden border hover:shadow-xl hover:shadow-black/30 hover:-translate-y-1 transition-all duration-300 ${
                  selectedGameIndex === gameIndex ? 'border-amber-300 shadow-xl shadow-amber-500/10' : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${game.color} opacity-80`} />
                <img
                  src={game.image}
                  alt={game.name}
                  className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 group-hover:scale-105 transition-all duration-500"
                />

                {game.popular && (
                  <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-amber-400 text-slate-900 text-[10px] font-bold px-2 py-1 rounded-full">
                    <Zap size={10} />
                    POPULER
                  </div>
                )}

                <div className="relative z-10 p-5">
                  <div className="mb-4">
                    <span className="text-xs font-medium text-white/60 bg-white/10 px-2 py-0.5 rounded-full">
                      {game.category}
                    </span>
                    <h3 className="text-white font-bold text-lg mt-2">{game.name}</h3>
                    <p className="text-white/50 text-xs">{game.players} transaksi / bulan</p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {game.items.map((item, itemIndex) => {
                      const isSelected = selectedGameIndex === gameIndex && selectedItemIndex === itemIndex;

                      return (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => {
                            setSelectedGameIndex(gameIndex);
                            setSelectedItemIndex(itemIndex);
                          }}
                          className={`border text-white text-xs font-medium py-2 px-3 rounded-xl transition-all hover:scale-105 ${
                            isSelected ? 'bg-amber-400/25 border-amber-300/70' : 'bg-white/10 hover:bg-white/20 border-white/10 hover:border-white/30'
                          }`}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedGameIndex(gameIndex);
                      setSelectedItemIndex(0);
                    }}
                    className="mt-4 w-full bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white font-semibold text-sm py-2.5 rounded-xl transition-all border border-white/20 hover:border-white/40"
                  >
                    Pilih Nominal →
                  </button>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="rounded-3xl bg-white p-5 shadow-2xl shadow-black/20 border border-white/10 lg:sticky lg:top-24">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full tracking-wider uppercase">
                  Checkout
                </span>
                <h3 className="text-xl font-extrabold text-slate-900 mt-3">{selectedGame.name}</h3>
                <p className="text-sm text-slate-500">{selectedItem.label} · {formatRupiah(selectedItem.amountMinor)}</p>
              </div>
              <div className="w-11 h-11 rounded-2xl bg-slate-900 text-amber-300 flex items-center justify-center">
                <Zap size={20} />
              </div>
            </div>

            <div className="space-y-3">
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Customer ID</span>
                <input
                  name="customer_id"
                  value={customerId}
                  onChange={(event) => setCustomerId(event.target.value)}
                  required
                  placeholder="12345678"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Zone ID</span>
                <input
                  name="zone_id"
                  value={zoneId}
                  onChange={(event) => setZoneId(event.target.value)}
                  required
                  placeholder="1234"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Email</span>
                <input
                  name="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                  placeholder="nama@email.com"
                  className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-4 focus:ring-emerald-100"
                />
              </label>
            </div>

            <button
              data-testid="checkout-submit"
              type="submit"
              disabled={isSubmitting}
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-amber-400 to-orange-500 px-5 py-3 text-sm font-bold text-slate-950 shadow-lg shadow-amber-500/25 transition hover:from-amber-300 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-70 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Membuat invoice...
                </>
              ) : (
                'Bayar & Dapatkan Invoice'
              )}
            </button>

            {errorMessage && (
              <div data-testid="checkout-error" className="mt-4 rounded-2xl border border-rose-100 bg-rose-50 p-4 text-sm text-rose-700">
                <div className="flex items-start gap-2">
                  <AlertCircle size={18} className="mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold">Checkout gagal</p>
                    <p className="mt-1">{errorMessage}</p>
                  </div>
                </div>
                <button
                  data-testid="checkout-retry"
                  type="button"
                  onClick={() => void submitCheckout()}
                  disabled={isSubmitting}
                  className="mt-3 inline-flex items-center gap-2 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-70"
                >
                  <RefreshCw size={13} />
                  Coba Lagi
                </button>
              </div>
            )}

            {orderResult && (
              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800">
                <div className="flex items-center gap-2 font-semibold">
                  <CheckCircle2 size={18} />
                  Invoice siap dibayar
                </div>
                <dl className="mt-3 space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-emerald-700/80">Invoice</dt>
                    <dd data-testid="invoice-code" className="font-bold text-slate-900">{orderResult.invoice_code}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-emerald-700/80">Order ID</dt>
                    <dd data-testid="order-id" className="font-bold text-slate-900">{orderResult.order_id}</dd>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-emerald-700/80">Status</dt>
                    <dd data-testid="payment-status" className="font-bold text-slate-900">{paymentStatus}</dd>
                  </div>
                </dl>
                {paymentResult?.redirect_url && (
                  <a
                    href={paymentResult.redirect_url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
                  >
                    Lanjut ke Midtrans
                    <ExternalLink size={13} />
                  </a>
                )}
              </div>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
