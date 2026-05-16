# Summary Lengkap Adnanpay PPOB

Dokumen ini merangkum hasil pekerjaan Adnanpay PPOB, status deploy, akun login, integrasi backend/frontend, Digiflazz Buyer API, Supabase, dan catatan operasional.

## 1. Status Umum

- Domain utama: <https://adnanpay.com>
- Frontend utama: `/home/adnanpay/public_html`
- Backend Node.js/Passenger: `/home/adnanpay/ppob-backend`
- Backend base URL: <https://adnanpay.com/ppob-api>
- Health check: <https://adnanpay.com/ppob-api/health>
- Branch GitHub: `PPOB-Adnanpay`
- Remote push: `bokirbeling/PPOB-Adnanpay`

Status akhir:

- Source code sudah dipush ke GitHub.
- Frontend sudah tampil sebagai Adnanpay di domain utama.
- Backend `/ppob-api` aktif dan health OK.
- Supabase remote migrations untuk fitur baru sudah diterapkan.
- Akun user, reseller, dan admin sudah dibuat serta dites login.

## 2. Plan yang Selesai

### Plan 1: `adnan-payment-next-phase-readiness.md`

Status: selesai 12/12.

Isi utama:

- Schema users/products/pricing/order snapshots.
- Backend auth register/login/me.
- RBAC account/admin.
- Product catalog dan pricing engine.
- Order pricing snapshot.
- Frontend dashboard member/reseller.
- Frontend dashboard admin.
- Runbook cPanel/Natanetwork/Supabase.
- Final verification wave selesai.

### Plan 2: `digiflazz-buyer-api-alignment.md`

Status: selesai 12/12.

Isi utama:

- Mirror dokumentasi Digiflazz Buyer lokal di `docs/digiflazz-buyer/`.
- Central Buyer client/signature builder.
- Price-list sync admin-only.
- Prepaid topup recheck dan webhook HMAC.
- Postpaid inquiry/pay/status dan PLN inquiry.
- Admin operations panel untuk saldo/sync/monitoring.
- Email verification untuk user/reseller.
- Branding BayarKu diganti Adnanpay.
- Deployment/runbook GitHub -> Natanetwork.
- Final verification wave selesai.

## 3. Deploy dan Push

Commit penting terakhir:

- `5edcf23 feat: align backend with Digiflazz Buyer`
- `73a0bf9 feat: add Adnanpay account dashboards`
- `3a9284b docs: add Buyer API and deployment runbooks`
- `0093cc9 docs: record Sisyphus verification evidence`
- `849c272 docs: add admin reseller login guide`

Push terakhir:

- Remote: `bokirbeling`
- Branch: `PPOB-Adnanpay`
- Status git lokal setelah push: clean.

Deploy server:

- Source GitHub diclone ke `/home/adnanpay/webtopup-src`.
- Backend artifact dipasang ke `/home/adnanpay/ppob-backend`.
- Frontend artifact dipasang ke `/home/adnanpay/public_html`.
- Backup deploy terakhir: `/home/adnanpay/backups/push_deploy_artifact_20260515_201240`.
- Passenger restart via `/home/adnanpay/ppob-backend/tmp/restart.txt`.

Catatan deploy:

- Build langsung di server terkendala npm cPanel yang omit dev dependency sehingga `tsc` tidak tersedia.
- Solusi yang dipakai: build artifact lokal yang sudah dites, upload/deploy ke server.

## 4. Smoke Test Terakhir

Hasil smoke live:

- <https://adnanpay.com> -> Adnanpay page OK.
- <https://adnanpay.com/dashboard> -> SPA dashboard OK.
- <https://adnanpay.com/admin> -> SPA admin OK.
- <https://adnanpay.com/ppob-api/health> -> `{"status":"ok"}`.
- `GET /ppob-api/api/auth/me` tanpa token -> 401 expected.
- Register smoke user -> OK.
- `GET /ppob-api/api/auth/me` dengan token -> OK.
- `GET /ppob-api/api/catalog/products` dengan token -> OK, count `0` karena produk belum di-sync/seed.

Local test terakhir sebelum push/deploy:

- Backend lint/typecheck/test/build: OK.
- Backend Jest: 16 suites / 57 tests.
- Frontend lint/typecheck/test/build: OK.
- Frontend Vitest: 12 tests.

## 5. Akun Login

Akun live sudah dibuat:

- User biasa.
- Reseller aktif.
- Admin.

Detail email/password disimpan di folder lokal privat:

```text
local/private/akun_login_adnanpay.md
```

Penting:

- File `local/private/akun_login_adnanpay.md` berisi password.
- Jangan commit/push file tersebut.
- Jika password tersebar, rotasi/ganti akun.

## 6. Alur Login

### User Biasa

URL:

```text
https://adnanpay.com/dashboard
```

Alur:

1. Login dengan email/password user.
2. Dashboard menampilkan profil, status reseller, katalog, dan riwayat transaksi.
3. Role default: `pengguna`.

### Reseller

URL:

```text
https://adnanpay.com/dashboard
```

Syarat:

- Email verified.
- Request reseller.
- Admin approve.
- Role menjadi `seller`.
- `is_reseller_active=true`.
- `reseller_status=approved`.

### Admin

URL:

```text
https://adnanpay.com/admin
```

Syarat:

- Akun harus `role=admin`.
- Promosi admin hanya lewat backend/server-side trusted process.
- Tidak ada endpoint publik untuk menjadikan user admin.

Admin dapat mengelola:

- user,
- reseller approval/demote/suspend,
- produk,
- pricing rule,
- Digiflazz price sync,
- saldo Digiflazz Buyer,
- monitoring transaksi/webhook.

## 7. Email Verification

Fitur email verification sudah ditambahkan.

Backend:

- Token mentah hanya dikirim ke email sender boundary.
- Database menyimpan SHA-256 token hash saja.
- Token punya expiry dan resend cooldown/rate limit.
- User belum verified tidak bisa request reseller.
- Admin tidak boleh approve reseller yang email belum verified.

SMTP cPanel:

- Gunakan satu sender mailbox, contoh `no-reply@adnanpay.com`.
- Jangan buat mailbox cPanel per user/reseller.
- Panduan: `docs/cpanel-smtp-sender-runbook.md`.

## 8. Digiflazz Buyer API

Scope hanya Buyer API.

Dokumentasi lokal:

```text
docs/digiflazz-buyer/index.md
```

Fitur backend:

- Buyer client terpusat.
- Signature MD5 sesuai Buyer docs.
- Price-list sync admin-only.
- Public catalog baca dari cache database, bukan call langsung ke Digiflazz tiap user buka katalog.
- Prepaid topup dan recheck pakai `ref_id` sama.
- Webhook HMAC `X-Hub-Signature` jika secret dikonfigurasi.
- Postpaid inquiry/pay/status.
- PLN inquiry.
- Admin panel untuk saldo, sync, dan monitoring.

Belum ada produk katalog aktif:

- Endpoint catalog live mengembalikan `products: []`.
- Perlu admin sync Digiflazz price-list atau seed/input produk.

## 9. Supabase

Remote migrations sudah diterapkan, termasuk:

- transactional schema,
- demo tables,
- accounts/catalog/pricing/order snapshots,
- postpaid inquiries dan PLN inquiries,
- email verification fields.

Security advisors terakhir: no lints.

Tables penting:

- `demo_users` dipakai karena production env memakai prefix demo.
- `users`, `products`, `pricing_rules` juga tersedia untuk non-demo mode.
- `postpaid_inquiries`, `pln_inquiries` dan demo equivalents tersedia.

## 10. Natanetwork / SSH / MCP

Direct SSH berhasil:

```powershell
ssh -p 31988 -i "$env:USERPROFILE\.ssh\id_rsa_natanetwork" adnanpay@103.164.173.46
```

MCP `adnanpay-natanetwork` sebelumnya gagal karena `ssh-mcp` tidak bisa membaca encrypted private key.

Perbaikan yang dilakukan:

- Backup encrypted key dibuat.
- Key copy khusus MCP tanpa passphrase dibuat.
- OpenCode config diarahkan ke key MCP.

Catatan:

- Current session MCP mungkin perlu restart/reload OpenCode agar membaca config baru.
- Direct SSH tetap bisa dipakai.

Panduan SSH:

```text
manual_ssh.md
```

## 11. File Dokumentasi Penting

- `panduan_adnanpay.md` — panduan operasional lengkap.
- `manual_ssh.md` — panduan SSH Natanetwork.
- `readme.md` — runbook developer/deploy.
- `server_spec.md` — catatan server/cPanel.
- `docs/cpanel-smtp-sender-runbook.md` — setup SMTP sender.
- `docs/digiflazz-buyer/index.md` — dokumentasi lokal Buyer API.
- `akun_login_adnanpay.md` — kredensial akun live, jangan commit/push.

## 12. Yang Perlu Dilakukan Berikutnya

1. Login admin ke `/admin`.
2. Jalankan sync produk Digiflazz Buyer atau input produk manual.
3. Cek catalog di `/dashboard`.
4. Tes order kecil/sandbox bila Digiflazz dan Midtrans siap.
5. Konfigurasi SMTP cPanel jika ingin email verification benar-benar mengirim email.
6. Jaga file kredensial agar tidak masuk GitHub.
