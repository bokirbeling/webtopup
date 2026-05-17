-- Seed initial dashboard data from existing hardcoded values

-- 1. Hero Quick Links
INSERT INTO demo_hero_quick_links (label, icon, color, display_order) VALUES
  ('Pulsa', 'Phone', 'from-blue-500 to-blue-600', 1),
  ('Listrik', 'Zap', 'from-amber-500 to-orange-500', 2),
  ('Game', 'Gamepad2', 'from-emerald-500 to-teal-600', 3),
  ('E-Wallet', 'CreditCard', 'from-rose-500 to-pink-600', 4),
  ('Internet', 'Wifi', 'from-sky-500 to-cyan-600', 5),
  ('PDAM', 'Droplets', 'from-teal-500 to-cyan-500', 6),
  ('BPJS', 'Shield', 'from-green-500 to-emerald-600', 7),
  ('TV Kabel', 'Tv', 'from-violet-500 to-purple-600', 8);

-- 2. Promo Carousel
INSERT INTO demo_promo_carousel (title, subtitle, badge, badge_color, cta_text, bg_gradient, accent_color, image_url, discount_text, display_order) VALUES
  ('Cashback 25% Pulsa All Operator', 'Berlaku setiap Senin & Rabu', 'HOT PROMO', 'bg-rose-500', 'Beli Sekarang', 'from-blue-600 via-blue-700 to-slate-800', 'bg-blue-400/20', 'https://images.pexels.com/photos/4482900/pexels-photo-4482900.jpeg?auto=compress&cs=tinysrgb&w=600', '25%', 1),
  ('Gratis Biaya Admin Bayar PLN', 'Untuk semua pelanggan setia', 'SPESIAL', 'bg-amber-500', 'Bayar Listrik', 'from-amber-500 via-orange-600 to-red-700', 'bg-amber-400/20', 'https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg?auto=compress&cs=tinysrgb&w=600', 'FREE', 2),
  ('Top Up Game Dapat Bonus Diamond', 'Mobile Legends, PUBG, Free Fire & lebih', 'TERBATAS', 'bg-emerald-500', 'Top Up Game', 'from-emerald-600 via-teal-700 to-slate-800', 'bg-emerald-400/20', 'https://images.pexels.com/photos/3165335/pexels-photo-3165335.jpeg?auto=compress&cs=tinysrgb&w=600', '+50', 3);

-- 3. Dashboard Categories
INSERT INTO demo_dashboard_categories (label, sub_label, icon, color, border_color, is_hot, display_order) VALUES
  ('Pulsa', 'Semua Operator', 'Phone', 'bg-blue-50 text-blue-600', 'hover:border-blue-200', false, 1),
  ('Listrik PLN', 'Token & Tagihan', 'Zap', 'bg-amber-50 text-amber-600', 'hover:border-amber-200', true, 2),
  ('Paket Data', 'Kuota Internet', 'Wifi', 'bg-cyan-50 text-cyan-600', 'hover:border-cyan-200', false, 3),
  ('Game', 'Top Up Voucher', 'Gamepad2', 'bg-emerald-50 text-emerald-600', 'hover:border-emerald-200', true, 4),
  ('E-Wallet', 'OVO, GoPay, DANA', 'CreditCard', 'bg-rose-50 text-rose-600', 'hover:border-rose-200', false, 5),
  ('PDAM', 'Air Bersih', 'Droplets', 'bg-teal-50 text-teal-600', 'hover:border-teal-200', false, 6),
  ('BPJS', 'Kesehatan & TK', 'Shield', 'bg-green-50 text-green-600', 'hover:border-green-200', false, 7),
  ('TV Kabel', 'IndiHome, UseeTV', 'Tv', 'bg-orange-50 text-orange-600', 'hover:border-orange-200', false, 8),
  ('Transportasi', 'KAI, Bus, Kapal', 'Bus', 'bg-sky-50 text-sky-600', 'hover:border-sky-200', false, 9),
  ('Perbankan', 'Transfer & Cicilan', 'Landmark', 'bg-slate-50 text-slate-600', 'hover:border-slate-200', false, 10),
  ('Voucher', 'Diskon & Cashback', 'Gift', 'bg-pink-50 text-pink-600', 'hover:border-pink-200', true, 11),
  ('Marketplace', 'Shopee, Tokopedia', 'Package', 'bg-yellow-50 text-yellow-600', 'hover:border-yellow-200', false, 12);

-- 4. Hot Deals
INSERT INTO demo_hot_deals (name, operator, original_price_minor, price_minor, discount_percentage, rating, sold_count, color_gradient, badge_color, image_url, display_order) VALUES
  ('Pulsa Telkomsel 10rb', 'Telkomsel', 1150000, 1000000, 13, 4.9, '12.4rb', 'from-red-50 to-rose-50', 'bg-red-100 text-red-600', 'https://images.pexels.com/photos/4482896/pexels-photo-4482896.jpeg?auto=compress&cs=tinysrgb&w=200', 1),
  ('Token PLN 50rb', 'PLN', 5250000, 5000000, 5, 4.8, '9.1rb', 'from-amber-50 to-yellow-50', 'bg-amber-100 text-amber-600', 'https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg?auto=compress&cs=tinysrgb&w=200', 2),
  ('Paket Data XL 15GB', 'XL Axiata', 3500000, 2800000, 20, 4.7, '7.8rb', 'from-blue-50 to-sky-50', 'bg-blue-100 text-blue-600', 'https://images.pexels.com/photos/6963944/pexels-photo-6963944.jpeg?auto=compress&cs=tinysrgb&w=200', 3),
  ('GoPay Voucher 50rb', 'GoPay', 5500000, 4800000, 13, 4.9, '6.2rb', 'from-emerald-50 to-teal-50', 'bg-emerald-100 text-emerald-600', 'https://images.pexels.com/photos/4968630/pexels-photo-4968630.jpeg?auto=compress&cs=tinysrgb&w=200', 4);

-- 5. Stats
INSERT INTO demo_stats (icon, value, label, color, bg_color, display_order) VALUES
  ('Users', '2.5 Juta+', 'Pengguna Aktif', 'text-blue-500', 'bg-blue-50', 1),
  ('ShoppingBag', '50 Juta+', 'Transaksi Berhasil', 'text-emerald-500', 'bg-emerald-50', 2),
  ('Star', '4.9/5', 'Rating Pengguna', 'text-amber-500', 'bg-amber-50', 3),
  ('Clock', '< 5 Detik', 'Waktu Proses', 'text-rose-500', 'bg-rose-50', 4);

-- 6. Features
INSERT INTO demo_features (icon, title, description, color, bg_color, border_color, display_order) VALUES
  ('ShieldCheck', 'Transaksi 100% Aman', 'Sistem enkripsi SSL 256-bit melindungi setiap transaksi. Data pribadi dan finansialmu terjamin.', 'text-emerald-600', 'bg-emerald-50', 'border-emerald-100', 1),
  ('Zap', 'Proses Instan', 'Transaksi diproses dalam hitungan detik. Tidak perlu menunggu lama untuk menikmati layananmu.', 'text-amber-600', 'bg-amber-50', 'border-amber-100', 2),
  ('Headphones', 'CS 24/7', 'Tim customer service kami siap membantu kamu kapan saja melalui live chat, WhatsApp, dan email.', 'text-blue-600', 'bg-blue-50', 'border-blue-100', 3),
  ('CreditCard', 'Banyak Metode Bayar', 'Transfer bank, e-wallet, kartu kredit/debit, virtual account, dan gerai minimarket tersedia.', 'text-rose-600', 'bg-rose-50', 'border-rose-100', 4),
  ('RefreshCw', 'Refund Otomatis', 'Jika transaksi gagal, saldo dikembalikan otomatis. Tidak ada risiko kehilangan uang.', 'text-teal-600', 'bg-teal-50', 'border-teal-100', 5),
  ('Award', 'Harga Terbaik', 'Kami berkomitmen memberikan harga terjangkau dengan kualitas layanan premium untuk semua pengguna.', 'text-orange-600', 'bg-orange-50', 'border-orange-100', 6);
