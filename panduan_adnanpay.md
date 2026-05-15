# Panduan Lengkap Adnanpay PPOB

Panduan ini berisi cara akses, login, pengelolaan dashboard, pengecekan API, SSH, deployment, smoke test, dan troubleshooting untuk aplikasi Adnanpay PPOB yang sudah dipasang di domain utama.

## 1. Ringkasan Produksi

- Domain utama: `https://adnanpay.com`
- Frontend publik: `/home/adnanpay/public_html`
- Backend Node.js/Passenger: `/home/adnanpay/ppob-backend`
- Base URL backend publik: `https://adnanpay.com/ppob-api`
- Health check backend: `https://adnanpay.com/ppob-api/health`
- Frontend SPA fallback aktif untuk route seperti `/dashboard` dan `/invoice/:code`.

Status smoke terakhir:

- `https://adnanpay.com` memuat landing page Adnanpay.
- `https://adnanpay.com/dashboard` memuat aplikasi dashboard.
- `https://adnanpay.com/invoice/INV-TEST-0001` memuat halaman invoice SPA.
- `https://adnanpay.com/ppob-api/health` mengembalikan `{"status":"ok"}`.
- Register user via API berhasil.
- `/ppob-api/api/auth/me` dengan token berhasil.
- `/ppob-api/api/catalog/products` berhasil, tetapi daftar produk masih kosong sampai produk di-seed/input admin.

## 2. URL Penting

| Kebutuhan | URL |
| --- | --- |
| Landing page | `https://adnanpay.com` |
| Login/Register user | `https://adnanpay.com/dashboard` |
| Dashboard member/reseller | `https://adnanpay.com/dashboard` |
| Dashboard admin | `https://adnanpay.com/admin` |
| Cek invoice | `https://adnanpay.com/invoice/KODE_INVOICE` |
| Backend health | `https://adnanpay.com/ppob-api/health` |
| API auth | `https://adnanpay.com/ppob-api/api/auth/*` |
| API catalog | `https://adnanpay.com/ppob-api/api/catalog/*` |
| API order | `https://adnanpay.com/ppob-api/api/orders` |

## 3. Login dan Register Pengguna

> Update Digiflazz Buyer: user/reseller tetap dikelola di database Adnanpay. cPanel email hanya dipakai sebagai satu akun pengirim verifikasi, bukan akun email per user.

### Register dari Website

1. Buka `https://adnanpay.com/dashboard`.
2. Pilih mode daftar/register jika tersedia.
3. Masukkan email dan password.
4. Setelah berhasil, user akan mendapat role default `pengguna`.
5. Session token disimpan di browser local storage aplikasi.

Catatan:

- Jangan gunakan password yang sama dengan akun penting lain.
- Jangan membagikan token login kepada siapa pun.
- User baru bukan admin secara otomatis.

### Login dari Website

1. Buka `https://adnanpay.com/dashboard`.
2. Masukkan email dan password yang sudah terdaftar.
3. Jika berhasil, dashboard akan memuat:
   - profil akun,
   - status reseller,
   - katalog harga dari backend,
   - riwayat transaksi member.

### Logout

Gunakan tombol logout di dashboard. Logout akan menghapus session token dari browser.

## 4. Login dan Akses Admin

Dashboard admin berada di:

```text
https://adnanpay.com/admin
```

Admin setelah login dapat mengelola operasi Digiflazz Buyer dari panel admin:

- cek saldo Buyer lewat backend server-side;
- sinkron produk dari Buyer `price-list` ke database produk Adnanpay;
- lihat status sync produk, total aktif/nonaktif, dan ringkasan webhook;
- kelola user/reseller tanpa membuat mailbox cPanel per user.

## 4A. Verifikasi Email User/Reseller

Alur produksi:

1. User register/login di `/dashboard`.
2. Backend membuat token verifikasi email dan menyimpan **hash** token saja.
3. Backend mengirim email dari satu mailbox sender, contoh `no-reply@adnanpay.com`.
4. User memasukkan token/link verifikasi.
5. Setelah `email_verified=true`, user boleh request reseller.
6. Admin hanya boleh approve reseller yang email-nya sudah verified.

Setup cPanel email sender ada di `docs/cpanel-smtp-sender-runbook.md`. Jangan buat mailbox untuk tiap user/reseller.

Env backend yang dibutuhkan:

```env
SMTP_HOST=mail.adnanpay.com
SMTP_PORT=465
SMTP_USER=no-reply@adnanpay.com
SMTP_PASSWORD=<isi hanya di server secret/env>
SMTP_FROM_EMAIL=no-reply@adnanpay.com
SMTP_FROM_NAME=Adnanpay
```

## 4B. Operasi Digiflazz Buyer Only

Dokumentasi lokal ada di `docs/digiflazz-buyer/index.md`. Scope hanya Buyer API; jangan pakai API Management/Seller.

Env backend Digiflazz:

```env
DIGIFLAZZ_USERNAME=<server only>
DIGIFLAZZ_API_KEY=<server only>
DIGIFLAZZ_API_BASE_URL=https://api.digiflazz.com
DIGIFLAZZ_WEBHOOK_SECRET=<opsional, server only>
DIGIFLAZZ_TOPUP_TESTING=<true/false opsional>
DIGIFLAZZ_TOPUP_MAX_PRICE=<opsional>
DIGIFLAZZ_TOPUP_CALLBACK_URL=https://adnanpay.com/ppob-api/api/fulfillments/digiflazz/callback
DIGIFLAZZ_TOPUP_ALLOW_DOT=<true/false opsional>
```

Checklist Buyer:

- whitelist IP server Adnanpay di dashboard Digiflazz;
- whitelist IP Digiflazz `52.74.250.133` jika firewall aplikasi membatasi callback;
- set webhook callback ke `https://adnanpay.com/ppob-api/api/fulfillments/digiflazz/callback`;
- sync produk via admin, jangan panggil `price-list` setiap user buka katalog;
- prepaid pending dicek ulang dengan topup ulang memakai `ref_id` sama;
- postpaid bayar harus memakai inquiry tersimpan, bukan nominal dari frontend.

## 4C. Deployment GitHub -> Natanetwork

Flow deployment yang dipakai:

1. Coding lokal selesai dan semua gate lokal pass.
2. Commit lalu push ke remote GitHub yang dipakai proyek.
3. SSH ke server cPanel user `adnanpay`.
4. Masuk ke backend app root `/home/adnanpay/ppob-backend`.
5. Pull commit terbaru atau fresh clone jika repo belum ada.
6. Preserve `.env.production`; jangan overwrite secret server.
7. Install dependency backend dengan Node cPanel `/home/adnanpay/nodevenv/ppob-backend/20/bin/npm install --omit=dev`.
8. Build backend/frontend sesuai runbook.
9. Salin frontend build ke `/home/adnanpay/public_html`.
10. Restart Passenger dengan `touch /home/adnanpay/ppob-backend/tmp/restart.txt`.
11. Smoke test domain.

Rollback: gunakan backup timestamp di `/home/adnanpay/backups/` dan restore `public_html`/`ppob-backend` sesuai kebutuhan.

Syarat:

- User harus sudah login.
- Role user harus `admin`.
- Jika role bukan admin, halaman admin akan menampilkan akses ditolak dan kontrol admin disembunyikan.

Admin dapat mengelola:

- daftar user,
- approval reseller,
- demote/suspend seller,
- produk,
- pricing rule,
- monitoring transaksi dan webhook.

> Admin bootstrap/promosi admin harus dilakukan dari proses backend/server-side terpercaya. Jangan membuat endpoint publik untuk menjadikan user sebagai admin.

## 5. API Auth Dasar

Base API:

```text
https://adnanpay.com/ppob-api
```

### Register

```bash
curl -X POST https://adnanpay.com/ppob-api/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"PasswordContoh123!"}'
```

Response sukses berisi user dan token. Simpan token hanya di sisi client/session yang aman.

### Login

```bash
curl -X POST https://adnanpay.com/ppob-api/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"PasswordContoh123!"}'
```

### Cek Session `/me`

```bash
curl https://adnanpay.com/ppob-api/api/auth/me \
  -H "Authorization: Bearer TOKEN_ANDA"
```

Tanpa token atau token salah akan menghasilkan `401 Unauthorized`.

## 6. Dashboard Member dan Reseller

Member dashboard tersedia di:

```text
https://adnanpay.com/dashboard
```

Fitur utama:

- login/register/logout,
- profil akun,
- status reseller,
- tombol pengajuan reseller,
- katalog harga role-aware dari backend,
- riwayat transaksi member.

### Pengajuan Reseller

1. Login sebagai user biasa.
2. Buka dashboard.
3. Klik tombol pengajuan reseller.
4. Status akan menjadi `requested` sampai admin menyetujui.
5. Setelah admin approve, role menjadi `seller` dan harga reseller aktif.

## 7. Dashboard Admin

Admin dashboard tersedia di:

```text
https://adnanpay.com/admin
```

Fitur admin:

- lihat user,
- approve reseller,
- suspend seller,
- demote seller,
- tambah/edit produk,
- aktif/nonaktif produk,
- buat/update pricing rule,
- monitoring transaksi terbaru,
- monitoring webhook terbaru.

Endpoint admin dilindungi oleh JWT dan role `admin`. User non-admin akan mendapat `403 Forbidden`.

## 8. Produk, Catalog, dan Pricing

Produk dikelola oleh admin. Catalog publik/member mengambil harga dari backend, bukan dari frontend.

Urutan pricing backend:

1. product-specific role rule,
2. category role rule,
3. global role rule,
4. default tanpa markup.

Markup dihitung fixed dahulu, lalu persentase, lalu dibulatkan ke Rupiah terdekat.

Jika catalog kosong, berarti produk belum diinput/seed oleh admin.

## 9. Order dan Invoice

Guest checkout tetap didukung tanpa login.

Route invoice:

```text
https://adnanpay.com/invoice/KODE_INVOICE
```

Contoh:

```text
https://adnanpay.com/invoice/INV-TEST-0001
```

Backend menyimpan snapshot harga saat order dibuat:

- user id jika login,
- base price,
- markup,
- final role price,
- pricing rule id jika ada.

Frontend tidak boleh menentukan harga final tepercaya. Harga final dihitung ulang oleh backend.

## 10. SSH dan Lokasi Server

Data server:

- Host: `103.164.173.46`
- Port: `31988`
- User: `adnanpay`
- Home: `/home/adnanpay`
- Web root: `/home/adnanpay/public_html`
- Backend: `/home/adnanpay/ppob-backend`

Command SSH PowerShell:

```powershell
ssh -p 31988 -i "$env:USERPROFILE\.ssh\id_rsa_natanetwork" adnanpay@103.164.173.46
```

Inspeksi cepat:

```powershell
ssh -p 31988 -i "$env:USERPROFILE\.ssh\id_rsa_natanetwork" adnanpay@103.164.173.46 "pwd && whoami && ls -la /home/adnanpay/public_html | head -20"
```

Lihat panduan SSH detail di:

```text
manual_ssh.md
```

## 11. Struktur Deployment

Frontend utama:

```text
/home/adnanpay/public_html/index.html
/home/adnanpay/public_html/assets/
```

Backend:

```text
/home/adnanpay/ppob-backend/app.js
/home/adnanpay/ppob-backend/dist/
/home/adnanpay/ppob-backend/.env.production
```

Passenger mount:

```text
/home/adnanpay/public_html/ppob-api/.htaccess
```

Node cPanel runtime:

```text
/home/adnanpay/nodevenv/ppob-backend/20/bin/node
/home/adnanpay/nodevenv/ppob-backend/20/bin/npm
```

Restart backend Passenger:

```bash
touch /home/adnanpay/ppob-backend/tmp/restart.txt
```

## 12. Backup dan Rollback

Sebelum deploy terakhir, backup dibuat di:

```text
/home/adnanpay/backups/deploy_backup_20260514_221958
```

Isi backup mencakup:

- `index.php` lama,
- `.htaccess` lama,
- archive `ppob-backend.tar.gz`.

Rollback frontend sederhana:

```bash
cp /home/adnanpay/backups/deploy_backup_YYYYMMDD_HHMMSS/index.php /home/adnanpay/public_html/index.php
cp /home/adnanpay/backups/deploy_backup_YYYYMMDD_HHMMSS/public_html.htaccess /home/adnanpay/public_html/.htaccess
```

Rollback backend:

```bash
cd /home/adnanpay
mv ppob-backend ppob-backend.failed
tar -xzf /home/adnanpay/backups/deploy_backup_YYYYMMDD_HHMMSS/ppob-backend.tar.gz -C /home/adnanpay
touch /home/adnanpay/ppob-backend/tmp/restart.txt
```

## 13. Smoke Test Setelah Deploy

Jalankan dari lokal:

```powershell
Invoke-RestMethod https://adnanpay.com/ppob-api/health
```

Expected:

```json
{"status":"ok"}
```

Register test user:

```powershell
$body = @{ email = "smoke@example.com"; password = "PasswordContoh123!" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "https://adnanpay.com/ppob-api/api/auth/register" -ContentType "application/json" -Body $body
```

Login:

```powershell
$body = @{ email = "smoke@example.com"; password = "PasswordContoh123!" } | ConvertTo-Json
$login = Invoke-RestMethod -Method Post -Uri "https://adnanpay.com/ppob-api/api/auth/login" -ContentType "application/json" -Body $body
$login.token
```

Cek `/me`:

```powershell
$headers = @{ Authorization = "Bearer $($login.token)" }
Invoke-RestMethod -Method Get -Uri "https://adnanpay.com/ppob-api/api/auth/me" -Headers $headers
```

Cek catalog:

```powershell
Invoke-RestMethod -Method Get -Uri "https://adnanpay.com/ppob-api/api/catalog/products" -Headers $headers
```

Jika hasil catalog kosong, produk belum diinput admin.

## 14. Troubleshooting

### Website masih menampilkan placeholder

Periksa:

```bash
ls -la /home/adnanpay/public_html
cat /home/adnanpay/public_html/.htaccess
```

Pastikan `index.html` dan folder `assets/` dari build frontend ada.

### `/dashboard` atau `/invoice/...` 404

Periksa SPA fallback `.htaccess` di `/home/adnanpay/public_html/.htaccess`.

### `/ppob-api/health` 503

Cek log Passenger:

```bash
tail -120 /home/adnanpay/ppob-backend/passenger.log
```

Penyebab umum:

- env wajib belum ada,
- dependency belum terinstall,
- build backend belum cocok,
- Passenger belum restart.

### Login gagal 401

Periksa:

- email/password benar,
- user sudah register,
- frontend memakai backend base `https://adnanpay.com/ppob-api`,
- `JWT_SECRET`, `JWT_EXPIRES_IN`, dan `PASSWORD_HASH_COST` sudah ada di `.env.production`.

### Admin ditolak 403

User belum role `admin`. Promosi admin harus dilakukan melalui proses server-side terpercaya, bukan dari frontend publik.

### Catalog kosong

Produk belum dibuat. Login sebagai admin lalu input produk/pricing rule dari `/admin`.

## 15. Keamanan

- Jangan commit `.env.production`.
- Jangan tampilkan `SUPABASE_SERVICE_ROLE_KEY` di frontend.
- Jangan bagikan JWT token user.
- Jangan bagikan SSH key/passphrase.
- Gunakan role admin hanya untuk akun tepercaya.
- Jika ada secret pernah masuk dokumen, lakukan rotasi di dashboard provider terkait.

## 16. File Referensi

- `manual_ssh.md` — panduan SSH detail.
- `readme.md` — runbook development/deployment umum.
- `server_spec.md` — catatan server dan cPanel.
- `.sisyphus/evidence/task-8-adnanpay-domain-smoke.txt` — bukti smoke/deployment terakhir.
