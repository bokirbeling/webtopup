# PRD — Project Requirements Document

## 1. Overview
Adnanpay PPOB Web fase **v2** bertransformasi menjadi **Next.js Fullstack (App Router)** dengan fokus pada performa ekstrem dan otomasi alur transaksi. Sistem ini menyederhanakan struktur peran menjadi hanya dua entitas: **Admin (Developer)** dan **Reseller**, menghilangkan peran pengguna biasa demi efisiensi operasional. Aplikasi mengutamakan pengalaman **Guest Checkout** yang mulus, memungkinkan pembelian tanpa akun dengan mekanisme klaim invoice via email. Fokus utama adalah kecepatan antarmuka (gaya McMaster-Carr), fleksibilitas pengenaan harga bertingkat (margin developer & reseller), serta penyatuan semua komponen dalam satu ekosistem yang siap deployment ke cPanel.

## 2. Requirements
- **Next.js Fullstack**: Migrasi total ke Next.js 14+ untuk efisiensi Server Actions dan Route Handlers.
- **Sistem Peran Tersegmentasi**: Hanya `Admin` dan `Reseller`. Tidak ada role `User Biasa`.
- **Engine Harga Bertingkat (Dual Margin)**: Admin mengatur margin dasar (profit developer), Reseller bebas mengatur margin jual ke end-customer.
- **Manajemen Harga Reseller Ekstensif**: UI tabel dengan toggle Grid/List, dukungan update harga massal (batch), per kategori, atau satuan tanpa reload halaman.
- **Guest Checkout & Invoice Claim**: Alur checkout tanpa registrasi, penugasan kode invoice unik, dan formulir klaim email di halaman invoice.
- **Sistem Email & Otomasi**: Integrasi SMTP untuk notifikasi transaksi sukses, verifikasi akun, dan pengiriman invoice PDF.
- **Performa Ekstrem**: Prefetching agresif, optimasi format gambar, dan caching berjenjang untuk responsivitas instan.

## 3. Core Features

### 🚀 Strategi Performa & UI Katalog
- **Toggle Tampilan Katalog**: Reseller dan Admin dapat beralih antara **Grid View** (menampilkan logo provider/gambar produk) dan **List View** (tampilan tabel teks ringan untuk kecepatan akses dan pembandingan harga massal).
- **Prefetching & Caching**: `<Link>` Next.js memuat data latar belakang. Data harga di-cache di server dengan invalidasi bertahap (5-15 menit).
- **Optimasi Aset**: Kompresi otomatis logo provider ke AVIF/WebP, penggunaan `next/image`, dan loading bertahap (Suspense) untuk mencegah layout shift.

### 👥 Struktur Menu Dashboard

#### A. Menu Admin (Developer/Operator)
- **Dashboard Overview**: Monitoring saldo Digiflazz Buyer, total transaksi harian, dan status operasional sistem.
- **Master Pricing (Margin Developer)**: 
  - Pengaturan harga dasar untuk Reseller.
  - Logika: `Harga Digiflazz + Fixed/Percentage Margin Admin = Harga Reseller`.
  - Pengaturan global, per kategori, atau per SKU melalui tabel pengaturan.
- **Manajemen Reseller**: Approve, suspend, atau reset status reseller. Audit log aktivitas pendaftaran dan persetujuan.
- **Sinkronisasi Produk**: Trigger manual/otomatis pull price-list Digiflazz. Monitoring status aktif/nonaktif produk dan metadatanya.
- **Monitoring Transaksi & Webhook**: Log real-time webhook Midtrans & Digiflazz, deteksi kegagalan fulfillment, dan rekonsiliasi data dasar.

#### B. Menu Reseller (Seller)
- **Katalog & Manajemen Harga**: 
  - Tampilan Grid/List toggle sesuai preferensi.
  - Kolom tabel: Nama Produk, Kategori, Harga Digiflazz, Harga Reseller (Modal), Input Margin Reseller, Harga Jual Akhir.
- **Markup Management (Harga Jual)**:
  - Reseller mengatur margin mereka sendiri: `Harga Reseller + Margin Reseller = Harga Jual ke Customer`.
  - **Mode Batch**: Checkbox multiple product -> apply fixed %/amount -> update massal sekaligus.
  - **Mode Kategori**: Filter dropdown kategori -> set margin kategori -> update otomatis pada semua produk dalam kategori tersebut.
  - **Mode Satuan**: Edit inline di tabel untuk penyesuaian harga spesifik per SKU.
  - Validasi otomatis: Harga jual tidak boleh negatif atau lebih rendah dari harga modal setelah margin admin diterapkan.
- **Riwayat Penjualan & Laporan**: Filter status, export CSV, laporan profit otomatis berdasarkan total markup yang dipasang per transaksi.
- **Invoice Cetak & Kirim**: Tombol cetak PDF dan kirim ke email pembeli (fallback jika guest tidak input email).

#### C. Fitur Bersama (Admin & Reseller)
- **Manajemen Akun**: Ganti password, verifikasi email, pengaturan preferensi notifikasi.
- **Branded Invoice**: Cetak invoice resmi dengan metadata lengkap, nomor transaksi, breakdown harga, dan status pembayaran.

### 🛒 Guest Checkout Enhancement
- **Alur Tanpa Akun**: Pilih Produk -> Masukkan Nominal/No HP -> Pilih Metode Bayar (Midtrans Snap) -> Konfirmasi Pembayaran.
- **Kode Invoice Unik**: Sistem menghasilkan kode seperti `INV-20231027-7X9K`. Guest diarahkan otomatis ke `/invoice/:code` setelah sukses bayar.
- **Klaim Invoice via Email**: Di halaman invoice, tersedia form input email. Jika di-submit, sistem memicu SMTP untuk mengirim PDF invoice ke alamat tersebut. Status pengiriman tercatat di DB.
- **Pelacakan Pesanan**: Halaman publik `/lacak` memungkinkan siapa saja memasukkan kode invoice untuk melihat status transaksi secara real-time tanpa login.
- **Konversi ke Reseller (Opsional)**: Di halaman sukses, guest dapat diarahkan ke register jika ingin menjadi reseller dengan syarat verifikasi email dan approval admin.

### 💰 Engine Pricing & Snapshot
- **Precedence Harga**: SKU Spesifik > Kategori > Global.
- **Kalkulasi Bertingkat**:
  1. `Harga Modal (Digiflazz)` diambil via sync API.
  2. `Harga Reseller` = `Harga Modal + Margin Admin` (Fixed/Percentage) -> Dikelola oleh Admin di Master Pricing.
  3. `Harga Jual` = `Harga Reseller + Margin Reseller` (Fixed/Percentage) -> Dikelola oleh Reseller di Markup Management.
- **Order Snapshot**: Saat checkout, `Harga Jual` yang berlaku di-snapshot ke tabel `orders` untuk mencegah fluktuasi harga provider saat proses pembayaran atau fulfillment berlangsung.
- **Validasi Server**: Frontend hanya menampilkan harga. Kalkulasi final selalu divalidasi di Server Actions/Route Handler menggunakan secret keys untuk mencegah manipulasi client-side.

### 📧 Sistem Notifikasi & Otomasi
- **Auto-Email Transaksi**: Webhook Midtrans `status_code = 200` -> trigger Digiflazz fulfillment -> jika sukses, kirim email invoice otomatis ke email pembeli (jika tersedia).
- **SMTP Gateway**: cPanel mailbox `no-reply@adnanpay.com`. Format email profesional dengan lampiran PDF invoice dan detail transaksi.
- **Verifikasi Email**: Wajib untuk pendaftaran akun baru. Menggunakan hash token SHA-256 dengan expiry time dan cooldown resend.

## 4. User Flow
1. **Flow Guest**: Buka katalog -> Pilih produk/Input nomor -> Bayar via Midtrans Snap -> Redirect ke `/invoice/:code` -> (Opsional) Input email di form klaim -> Sistem kirim PDF -> Guest bisa lacak via kode tersebut.
2. **Flow Reseller**: Daftar akun -> Verifikasi Email -> Admin Approve -> Login -> Akses Dashboard Reseller -> Atur markup harga (Batch/Kategori/Satuan) -> Melihat katalog ter-update -> Transaksi berhasil tercatat di laporan profit.
3. **Flow Harga & Batch Update**: Admin set margin global +500 -> Harga reseller auto-kalkulasi -> Reseller login, buka tabel batch -> Filter kategori "Pulsa" -> Set markup +2% -> Klik Update Massal -> Harga jual akhir di frontend ter-update -> Snapshot harga otomatis terjadi saat order.

## 5. Architecture & Tech Stack
Arsitektur sistem dirancang untuk skalabilitas, keamanan, dan kemudahan deployment pada infrastruktur shared hosting (cPanel).

### 🧱 Tech Stack
| Layer | Teknologi | Keterangan |
|-------|-----------|------------|
| **Framework** | Next.js 14+ (App Router) | Server Components, Server Actions, Route Handlers, Middleware RBAC |
| **UI/UX** | Tailwind CSS, shadcn/ui, React Query | Komponen modular, state management via URL params & Context, toggle Grid/List tanpa re-fetch |
| **Database** | Supabase (PostgreSQL) | Relational database, Row Level Security (RLS), real-time capabilities (opsional) |
| **Payment** | Midtrans Snap API | Payment gateway untuk kartu kredit, e-wallet, VA, QRIS |
| **Provider PPOB** | Digiflazz Buyer API | Sinkronisasi produk, saldo, webhook, dan request transaksi pulsa/paket/data |
| **Email/SMTP** | Nodemailer + cPanel SMTP | Pengiriman notifikasi, verifikasi, dan invoice PDF otomatis |
| **Deployment** | Local Build -> Artifact Upload | `npm run build` lokal -> upload `.next`, `node_modules`, `server.js` ke cPanel -> restart via Passenger |

### 🖥️ UI Strategy
- **Toggle Grid/List View**: Implementasi state management di client (`useState`/URL search param) untuk beralih tampilan katalog tanpa memuat ulang data dari server. Data tetap di-fetch sekali via Server Component.
- **Batch & Category Pricing Table**: Tabel interaktif dengan checkbox selection, input inline, dan aksi massal. Semua validasi dan perhitungan harga berjalan di **Server Actions** untuk keamanan.
- **Print-Ready Invoice**: Halaman `/invoice/:code` dioptimalkan dengan `@media print` CSS dan library `pdf-lib` untuk generate PDF yang rapi.

### 🔌 Integration Points
- **Digiflazz Webhook Handler**: Route handler `/api/webhook/digiflazz` memvalidasi signature, update status fulfillment, dan trigger email.
- **Midtrans Webhook Handler**: Route handler `/api/webhook/midtrans` memvalidasi payment status, memicu trigger Digiflazz request, dan memutakhirkan snapshot order.
- **SMTP Queue**: Menggunakan background job atau deferred server action untuk pengiriman email agar tidak memblokir response utama.

## 6. Database Schema
Skema database dirancang dengan prefix `demo_` untuk environment development/staging guna mencegah konflik dengan production. Semua tabel menggunakan timestamp dan soft-delete (jika relevan).

### 📊 Tabel Utama
**1. `users`**
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID | Primary Key |
| `role` | ENUM(`'admin'`,`'reseller'`) | Hak akses sistem |
| `email` | VARCHAR(255) | Unik, wajib verifikasi |
| `password_hash` | VARCHAR(255) | bcrypt/argon2 hash |
| `is_verified` | BOOLEAN | Status verifikasi email |
| `reseller_approved_at` | TIMESTAMP | Timestamp approval admin |
| `created_at`, `updated_at` | TIMESTAMP | Audit trail |

**2. `products`**
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID | Primary Key |
| `sku_digiflazz` | VARCHAR(100) | Kode produk dari provider |
| `name` | VARCHAR(255) | Nama produk terefleksi |
| `category` | VARCHAR(100) | Pengelompokan (Pulsa, Data, PLN, DLL) |
| `base_price` | DECIMAL(15,2) | Harga murni dari Digiflazz |
| `stock_status` | VARCHAR(50) | Status stok/ketersediaan |
| `is_active` | BOOLEAN | Toggle tampilan di katalog |
| `last_synced` | TIMESTAMP | Waktu sinkronisasi terakhir |
| `metadata` | JSONB | Ekstra data provider |

**3. `admin_pricing_rules`** *(Margin Developer)*
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID | Primary Key |
| `scope` | ENUM(`'global'`,`'category'`,`'sku'`) | Jangkauan aturan harga |
| `target_id` | UUID/VARCHAR | ID kategori atau SKU jika scope spesifik |
| `fixed_margin` | DECIMAL(10,2) | Tambah tetap (Rp) |
| `percent_margin` | DECIMAL(5,2) | Tambah persentase (%) |
| `created_at`, `updated_at` | TIMESTAMP | Audit |

**4. `reseller_pricing_overrides`** *(Margin Reseller)*
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID | Primary Key |
| `user_id` | UUID | FK ke users.id |
| `scope` | ENUM(`'global'`,`'category'`,`'sku'`) | Jangkauan markup |
| `target_id` | UUID/VARCHAR | Target kategori/SKU |
| `fixed_markup` | DECIMAL(10,2) | Markup tetap (Rp) |
| `percent_markup` | DECIMAL(5,2) | Markup persentase (%) |
| `created_at`, `updated_at` | TIMESTAMP | Audit |

**5. `orders`** *(Snapshot & Transaksi)*
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID | Primary Key |
| `invoice_code` | VARCHAR(50) | Unik, format `INV-YYYYMMDD-XXXX` |
| `user_id` | UUID | Nullable (NULL jika guest) |
| `product_id` | UUID | FK ke products.id |
| `base_price_snapshot` | DECIMAL(15,2) | Harga Digiflazz saat order |
| `admin_margin_snapshot` | DECIMAL(10,2) | Margin developer saat order |
| `reseller_margin_snapshot` | DECIMAL(10,2) | Margin reseller saat order |
| `final_price_snapshot` | DECIMAL(15,2) | Harga jual akhir yang dibayar |
| `status` | ENUM(`pending`,`paid`,`processing`,`completed`,`failed`) | Status siklus hidup |
| `midtrans_snap_token` | VARCHAR(255) | Token pembayaran |
| `fulfilled_at` | TIMESTAMP | Waktu produk terkirim |
| `created_at`, `updated_at` | TIMESTAMP | Audit |

**6. `invoices`**
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID | Primary Key |
| `order_id` | UUID | FK ke orders.id |
| `email_address` | VARCHAR(255) | Tujuan pengiriman |
| `sent_status` | ENUM(`pending`,`sent`,`failed`) | Status pengiriman email |
| `claimed_by_guest` | BOOLEAN | Flag apakah klaim dari guest |
| `created_at` | TIMESTAMP | Audit |

**7. `webhook_logs`**
| Kolom | Tipe | Keterangan |
|-------|------|------------|
| `id` | UUID | Primary Key |
| `source` | ENUM(`'midtrans'`,`'digiflazz'`) | Pengirim webhook |
| `payload` | JSONB | Raw request body |
| `status` | ENUM(`'received'`,`'processed'`,`'failed'`) | Hasil pemrosesan |
| `processed_at` | TIMESTAMP | Waktu eksekusi |

### 🧮 Pricing Logic (Multi-Tier Calculation)
Sistem mengimplementasikan kalkulasi harga berjenjang dengan precedence spesifik:
1. **Tahap Admin**: `Harga Reseller = base_price + (base_price × percent_margin_admin) + fixed_margin_admin`
2. **Tahap Reseller**: `Harga Jual = Harga Reseller + (Harga Reseller × percent_markup_reseller) + fixed_markup_reseller`
3. **Snapshot**: Saat order dibuat, hasil kalkulasi final disimpan ke `orders` table. Perubahan margin di tingkat apapun **tidak mempengaruhi** order yang sudah tercatat.
4. **Validasi**: Hanya Server Actions yang diperbolehkan menghitung harga final. Client hanya menerima nilai yang sudah diverifikasi.

## 7. Security & Performance Gates
- **Server-Authoritative Pricing**: Tidak ada kalkulasi harga di client. Semua `margin_apply` dan `final_price_validate` berjalan di Server Actions.
- **RBAC Enforced**: Middleware Next.js memeriksa `role` sebelum render halaman `/admin` atau `/reseller`. Data sensitif tidak pernah dikirim ke client jika role tidak cocok.
- **Rate Limiting & Anti-Abuse**: Pembagian request API Digiflazz (max 1x/15menit sync), limit form email guest (Captcha/Rate-limit per IP), dan validasi CSRF untuk update harga massal.
- **Snapshot Integrity**: Harga di `orders` immutabel setelah status `PAID`. Perubahan margin tidak mempengaruhi transaksi yang sedang berjalan atau sudah selesai.
- **Optimasi UI**: Target LCP < 1.2s. Stream SSR untuk dashboard berat. Virtual scrolling untuk tabel harga jika jumlah produk > 500. Transisi Grid/List di-render client-side tanpa fetch ulang data.

## 8. Development Roadmap
- **Fase 1**: Setup Next.js App Router, Auth (JWT + Session), Middleware RBAC (Admin/Reseller), Database Schema awal, dan struktur folder.
- **Fase 2**: Integrasi Digiflazz Sync, Master Pricing Engine (Admin margin), Implementasi Tabel/Katalog dengan Toggle Grid/List dan state management UI.
- **Fase 3**: Reseller Markup Management (Batch/Category/Unit logic), Pricing Snapshot logic, Midtrans Snap Integration, dan validasi harga server-side.
- **Fase 4**: Guest Checkout Flow, Invoice PDF Generation (pdf-lib/react-pdf), SMTP Email Claim, Public Tracking Page (`/lacak`).
- **Fase 5**: Monitoring Dashboard (Admin), Profit Reporting (Reseller), cPanel Artifact Deployment, Final Smoke Test & Load Testing.

## Ringkasan Akhir
Adnanpay v2 adalah platform PPOB yang disederhanakan menjadi dua tingkatan hierarki: Admin (Developer) yang mengontrol margin dasar dan operasional sistem, serta Reseller yang memiliki kebebasan penuh menentukan harga jual akhir ke konsumen. Struktur ini didukung oleh **Engine Pricing Bertingkat** dan antarmuka **Batch/Grid-List** yang dioptimalkan untuk produktivitas pengelolaan stok dan harga. Fitur **Guest Checkout** dengan sistem klaim invoice memastikan konversi penjualan tanpa hambatan registrasi, sementara arsitektur **Next.js Fullstack** menjamin kecepatan "secepat kilat" dan kemudahan deployment di infrastruktur cPanel. Keamanan data, validasi server-side, dan snapshot transaksi membentuk fondasi yang kokoh untuk operasional jangka panjang dan skalabilitas bisnis.