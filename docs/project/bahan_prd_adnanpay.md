# Bahan PRD Adnanpay PPOB

Dokumen ini dibuat sebagai bahan masukan untuk AI/produk manager saat menyusun PRD Adnanpay PPOB. Isi dokumen menjelaskan aplikasi, tujuan, aktor, fitur, flow, integrasi, batasan teknis, deployment, dan kebutuhan lanjutan. Dokumen ini tidak memuat password, secret, API key, atau kredensial server.

## 1. Ringkasan Produk

Adnanpay adalah aplikasi PPOB berbasis web untuk menjual produk digital/topup dan pembayaran tagihan. Aplikasi terdiri dari frontend React SPA, backend Node.js/Express TypeScript, Supabase sebagai database, Midtrans untuk pembayaran, dan Digiflazz Buyer API untuk fulfillment produk digital.

Domain produksi:

```text
https://adnanpay.com
```

Backend public base URL:

```text
https://adnanpay.com/ppob-api
```

Tujuan utama aplikasi:

- Menyediakan landing page dan checkout PPOB.
- Mendukung user biasa, reseller, dan admin.
- Menghitung harga secara server-side berdasarkan role.
- Menghubungkan pembayaran ke Midtrans.
- Menghubungkan fulfillment produk ke Digiflazz Buyer API.
- Memberikan dashboard member/reseller dan admin.
- Menyediakan runbook deployment cPanel/Natanetwork.

## 2. Target Pengguna

### 2.1 Pengguna Umum / Member

Pengguna yang membeli produk digital/topup melalui website. Bisa checkout sebagai guest atau login sebagai member.

Kebutuhan:

- Daftar akun.
- Login/logout.
- Melihat katalog produk.
- Melihat harga sesuai role.
- Membuat order.
- Melihat invoice/status transaksi.
- Melihat riwayat transaksi.
- Mengajukan diri menjadi reseller.

### 2.2 Reseller

Pengguna yang sudah disetujui admin menjadi seller/reseller. Reseller mendapat harga khusus berdasarkan rule pricing backend.

Kebutuhan:

- Login melalui dashboard yang sama dengan member.
- Melihat status reseller aktif.
- Melihat harga role reseller.
- Membuat order dengan snapshot harga reseller.
- Melihat riwayat transaksi.

### 2.3 Admin

Operator internal Adnanpay. Admin mengelola user, reseller, produk, harga, dan operasional Digiflazz.

Kebutuhan:

- Login sebagai admin.
- Melihat daftar user.
- Approve/demote/suspend reseller.
- Mengelola produk.
- Mengelola pricing rule.
- Sync produk Digiflazz Buyer price-list.
- Cek saldo Digiflazz Buyer.
- Monitoring transaksi dan webhook.

## 3. Role dan Permission

Role utama:

```text
pengguna
seller
admin
```

### 3.1 Pengguna

- Role default setelah register.
- Bisa login ke dashboard.
- Bisa request reseller setelah email verified.
- Tidak bisa akses admin.

### 3.2 Seller / Reseller

- Role setelah admin approve reseller.
- `is_reseller_active=true`.
- `reseller_status=approved`.
- Bisa melihat harga reseller.
- Tidak bisa akses admin.

### 3.3 Admin

- Role untuk operator internal.
- Bisa akses `/admin`.
- Bisa approve/demote/suspend reseller.
- Bisa mengelola produk/pricing.
- Bisa akses operasi Digiflazz admin-only.

Admin tidak dibuat lewat endpoint publik. Promosi admin harus melalui proses backend/server-side tepercaya.

## 4. Modul Utama Aplikasi

## 4.1 Frontend

Tech stack:

- React.
- Vite.
- TypeScript.
- Tailwind-style utility class/UI existing system.

Route utama:

| Route | Fungsi |
| --- | --- |
| `/` | Landing page Adnanpay |
| `/dashboard` | Login, register, dashboard member/reseller |
| `/admin` | Dashboard admin |
| `/invoice/:code` | Halaman invoice/status transaksi |

Frontend menggunakan backend API base:

```text
https://adnanpay.com/ppob-api
```

Frontend tidak boleh menyimpan secret seperti service-role key, Digiflazz API key, Midtrans server key, SMTP password, atau JWT secret.

## 4.2 Backend

Tech stack:

- Node.js.
- Express.
- TypeScript.
- Jest tests.
- Supabase REST/service-role repository layer.

Backend mount:

```text
/api/*
/ppob-api/api/*
```

Produksi memakai `/ppob-api` karena cPanel Passenger mount.

Health endpoint:

```text
GET /ppob-api/health
```

## 4.3 Database

Database menggunakan Supabase/Postgres.

Mode produksi saat ini memakai prefix demo:

```text
SUPABASE_TABLE_PREFIX=demo_
```

Tabel penting:

- `users` / `demo_users`.
- `products` / `demo_products`.
- `pricing_rules` / `demo_pricing_rules`.
- `orders` / `demo_orders`.
- `payments` / `demo_payments`.
- `fulfillments` / `demo_fulfillments`.
- `webhook_events` / `demo_webhook_events`.
- `postpaid_inquiries` / `demo_postpaid_inquiries`.
- `pln_inquiries` / `demo_pln_inquiries`.

RLS aktif dan service-role policy digunakan untuk backend server-side access. Frontend tidak akses Supabase langsung.

## 5. Auth dan Account Flow

## 5.1 Register

Endpoint:

```text
POST /ppob-api/api/auth/register
```

Input:

- email.
- password.

Output:

- user public data.
- JWT token.

User baru otomatis:

- role `pengguna`.
- reseller inactive.
- email belum verified jika flow email verification aktif.

Backend menolak field server-controlled seperti role, password_hash, reseller status, dan email verification internal fields.

## 5.2 Login

Endpoint:

```text
POST /ppob-api/api/auth/login
```

Login mengembalikan JWT token. Password disimpan sebagai hash, bukan plaintext.

## 5.3 Me / Session Check

Endpoint:

```text
GET /ppob-api/api/auth/me
```

Header:

```text
Authorization: Bearer TOKEN
```

Tanpa token hasilnya `401 Unauthorized`.

## 5.4 Email Verification

Tujuan:

- Mencegah akun palsu langsung menjadi reseller.
- Memastikan admin hanya approve reseller dengan email verified.

Endpoint:

```text
POST /ppob-api/api/auth/email-verification/request
POST /ppob-api/api/auth/email-verification/resend
POST /ppob-api/api/auth/email-verification/verify
```

Desain keamanan:

- Token mentah hanya dikirim ke email sender.
- Database menyimpan SHA-256 hash token.
- Token punya expiry.
- Resend punya cooldown/rate-limit.
- API response tidak mengembalikan token mentah.

Email dikirim dari satu mailbox cPanel sender, misalnya:

```text
no-reply@adnanpay.com
```

Tidak ada mailbox per user/reseller.

## 6. Reseller Flow

Alur reseller:

1. User register/login.
2. User verifikasi email.
3. User request reseller dari dashboard.
4. Backend set status `requested`.
5. Admin review dari dashboard admin.
6. Admin approve.
7. Backend set:
   - `role=seller`,
   - `is_reseller_active=true`,
   - `reseller_status=approved`.
8. Reseller login ke `/dashboard`.
9. Harga katalog mengikuti role seller.

Jika email belum verified, request reseller ditolak dengan:

```text
403 EMAIL_VERIFICATION_REQUIRED
```

## 7. Admin Flow

Admin dashboard:

```text
https://adnanpay.com/admin
```

Admin harus login dengan akun `role=admin`.

Fitur admin:

- Lihat user.
- Inspect user detail.
- Approve reseller.
- Suspend reseller/seller.
- Demote seller menjadi pengguna.
- CRUD produk.
- CRUD pricing rule.
- Sync produk dari Digiflazz price-list.
- Lihat saldo Digiflazz Buyer.
- Lihat monitoring transaksi.
- Lihat monitoring webhook.

Non-admin:

- Bisa membuka route SPA `/admin`, tetapi kontrol admin disembunyikan.
- Backend endpoint admin mengembalikan `403 Forbidden`.

## 8. Product Catalog dan Pricing

Produk disimpan di database Adnanpay. Frontend membaca dari backend, bukan langsung dari Digiflazz.

Field produk utama:

- `sku_digiflazz`.
- `name`.
- `category`.
- `provider`.
- `base_price_minor`.
- `is_active`.
- `metadata`.

Sync produk:

- Admin menekan sync Digiflazz.
- Backend call Buyer `POST /v1/price-list`.
- Produk di-upsert berdasarkan `buyer_sku_code`.
- Status aktif berdasarkan `buyer_product_status` dan `seller_product_status`.
- Metadata menyimpan seller_name, type, stock, cutoff, desc, sync timestamp.

Rate-limit:

- Sync price-list dijaga minimal interval, default 15 menit.
- Public catalog tidak memanggil Digiflazz langsung.

Pricing rule precedence:

1. Product-specific role rule.
2. Category role rule.
3. Global role rule.
4. Default tanpa markup.

Markup:

- fixed markup dahulu,
- percentage markup setelah fixed,
- dibulatkan ke Rupiah terdekat.

Harga final selalu dihitung backend.

## 9. Order, Payment, Fulfillment

## 9.1 Order

Guest checkout tetap didukung.

Authenticated order menyimpan:

- `user_id`,
- `base_price_snapshot`,
- `markup_snapshot`,
- `role_price_snapshot`,
- `pricing_rule_id_snapshot`.

Frontend tidak boleh menentukan trusted final price. Jika client mengirim harga palsu, backend mengabaikan atau menolak sesuai endpoint.

## 9.2 Payment Midtrans

Backend menginisialisasi payment ke Midtrans.

Webhook Midtrans tetap public tetapi divalidasi signature/idempotency.

Endpoint webhook produksi:

```text
https://adnanpay.com/ppob-api/api/payments/midtrans/webhook
```

## 9.3 Fulfillment Digiflazz Prepaid

Scope Digiflazz hanya Buyer API.

Prepaid topup memakai:

```text
POST https://api.digiflazz.com/v1/transaction
```

Signature:

```text
md5(username + apiKey + ref_id)
```

Pending recheck:

- ulang topup dengan `ref_id` yang sama.
- tidak membuat local fulfillment duplicate.

Webhook Digiflazz:

```text
https://adnanpay.com/ppob-api/api/fulfillments/digiflazz/callback
```

Jika `DIGIFLAZZ_WEBHOOK_SECRET` diset, backend verifikasi:

```text
X-Hub-Signature: sha1=<hmac>
```

## 10. Digiflazz Buyer Postpaid

Fitur Buyer postpaid yang disiapkan:

- inquiry/tagihan `inq-pasca`,
- bayar tagihan `pay-pasca`,
- status `status-pasca`,
- PLN inquiry `/v1/inquiry-pln`.

Prinsip:

- Payment postpaid harus memakai inquiry tersimpan.
- Nominal dari client tidak dipercaya.
- Backend memakai stored `ref_id`, `buyer_sku_code`, `customer_no`, dan `selling_price`.
- Category-specific metadata seperti `amount`, `year`, dan composite customer number divalidasi backend.

## 11. Digiflazz Admin Operations

Admin panel menampilkan operasi Digiflazz Buyer:

- saldo Buyer,
- total produk tersinkron,
- jumlah produk aktif/nonaktif,
- last sync timestamp,
- webhook recent/failed count,
- tombol sync price-list.

Semua endpoint admin Digiflazz harus:

- pakai JWT,
- role `admin`,
- tidak mengembalikan API key/signature/secret.

## 12. Deployment dan Infrastruktur

Server:

- Host: `103.164.173.46`.
- SSH port: `31988`.
- User cPanel: `adnanpay`.
- Web root: `/home/adnanpay/public_html`.
- Backend: `/home/adnanpay/ppob-backend`.
- Source clone: `/home/adnanpay/webtopup-src`.

Runtime:

- cPanel Passenger Node.js.
- Node path: `/home/adnanpay/nodevenv/ppob-backend/20/bin/node`.
- npm path: `/home/adnanpay/nodevenv/ppob-backend/20/bin/npm`.

Deployment flow ideal:

1. Local code selesai.
2. Local tests pass.
3. Commit dan push ke GitHub.
4. SSH ke server.
5. Pull/fetch branch terbaru.
6. Preserve `.env.production`.
7. Build backend/frontend atau deploy artifact lokal jika server build tool terbatas.
8. Copy frontend `dist` ke `/home/adnanpay/public_html`.
9. Copy backend `dist/package*.json` ke `/home/adnanpay/ppob-backend`.
10. `npm install --omit=dev` di backend production.
11. Restart Passenger dengan `touch /home/adnanpay/ppob-backend/tmp/restart.txt`.
12. Smoke test domain.

Catatan saat ini:

- Build langsung di server terkendala dev dependency `tsc` tidak tersedia.
- Solusi berhasil: build lokal, upload artifact, deploy ke server.

## 13. Environment Variables

Backend server-only:

- `SUPABASE_URL`.
- `SUPABASE_SERVICE_ROLE_KEY`.
- `SUPABASE_TABLE_PREFIX`.
- `JWT_SECRET`.
- `JWT_EXPIRES_IN`.
- `PASSWORD_HASH_COST`.
- `MIDTRANS_SERVER_KEY`.
- `MIDTRANS_API_BASE_URL`.
- `DIGIFLAZZ_USERNAME`.
- `DIGIFLAZZ_API_KEY`.
- `DIGIFLAZZ_API_BASE_URL`.
- `DIGIFLAZZ_WEBHOOK_SECRET`.
- `DIGIFLAZZ_TOPUP_TESTING`.
- `DIGIFLAZZ_TOPUP_MAX_PRICE`.
- `DIGIFLAZZ_TOPUP_CALLBACK_URL`.
- `DIGIFLAZZ_TOPUP_ALLOW_DOT`.
- `SMTP_HOST`.
- `SMTP_PORT`.
- `SMTP_USER`.
- `SMTP_PASSWORD`.
- `SMTP_FROM_EMAIL`.
- `SMTP_FROM_NAME`.

Frontend safe:

- `VITE_API_BASE_URL`.

Jangan expose server-only env ke frontend atau docs publik.

## 14. Current Live Status

Terakhir dites:

- Landing page Adnanpay OK.
- `/dashboard` OK.
- `/admin` OK.
- `/ppob-api/health` OK.
- Register/login/me OK.
- Catalog products OK tapi masih kosong.
- User/reseller/admin test accounts dibuat.

Produk belum aktif karena belum ada sync/seed produk Digiflazz di catalog.

## 15. Known Gaps / Backlog

Saran PRD lanjutan:

1. Fitur ganti password.
2. Forgot password/reset password via email.
3. UI input token verifikasi email yang lebih jelas.
4. Admin seed/sync produk pertama kali dari Digiflazz.
5. Manual product override dan margin per kategori.
6. Audit log admin action.
7. Export transaksi CSV.
8. Reconciliation dashboard Midtrans vs internal order.
9. Cron/scheduled Digiflazz price-list sync.
10. Notifikasi email/WhatsApp untuk order sukses/gagal.
11. Role permission matrix lebih granular.
12. Rate limit dashboard dan audit security.
13. Production secret rotation workflow.
14. GitHub Actions CI/CD pipeline.
15. Server-side build fix agar tidak perlu deploy artifact lokal.

## 16. Acceptance Criteria yang Sudah Terbukti

- Backend tests pass.
- Frontend tests pass.
- Build backend/frontend pass lokal.
- Domain live menampilkan Adnanpay.
- Backend health live OK.
- Auth live OK.
- Admin/reseller role di database bisa digunakan login.
- Supabase migrations sudah diterapkan.
- Digiflazz Buyer docs mirror tersedia lokal.
- No Seller/API Management implementation scope.

## 17. Referensi File

- `panduan_adnanpay.md` — panduan operasional.
- `summary_adnanpay.md` — summary hasil pekerjaan.
- `manual_ssh.md` — panduan SSH server.
- `readme.md` — developer/deploy runbook.
- `server_spec.md` — server/cPanel notes.
- `docs/digiflazz-buyer/index.md` — Buyer API docs mirror.
- `docs/cpanel-smtp-sender-runbook.md` — setup SMTP sender.
- `.sisyphus/plans/digiflazz-buyer-api-alignment.md` — plan teknis Digiflazz Buyer.
- `.sisyphus/plans/adnan-payment-next-phase-readiness.md` — plan readiness awal.

## 18. Catatan untuk AI Pembuat PRD

Saat membuat PRD dari dokumen ini, fokus pada:

- Problem statement PPOB/reseller.
- User journey member, reseller, admin.
- Role/permission matrix.
- Order/payment/fulfillment lifecycle.
- Catalog/pricing lifecycle.
- Digiflazz Buyer-only scope.
- Email verification sebagai syarat reseller.
- Deployment cPanel/Natanetwork constraint.
- Security: no secret in frontend, server-authoritative pricing, hashed password/token, RLS/service-role backend only.
- Backlog prioritas: produk sync, password reset, CI/CD, audit log, reconciliation.
