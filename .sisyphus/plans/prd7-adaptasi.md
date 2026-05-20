# PRD 7 — Adaptasi Plan (Tanpa Rombak Ulang)

## TL;DR
> **Summary**: Adaptasi PRD 7 ke codebase yang sudah ada dengan minimal breaking change. Fokus pada gap yang belum ada: middleware keamanan, auth UI, transaksi real Digiflazz, riwayat transaksi, dan migrasi produk ke MySQL lokal.
> **Deliverables**: MySQL lokal untuk produk, middleware helmet+cors+ratelimit, auth UI (login/register), halaman transaksi, Digiflazz real topup wired, admin sync UI
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: Task 1 (MySQL setup) → Task 2 (migrasi data) → Task 3 (backend MySQL adapter) → Task 9 (transaksi real)

## Context
### Original Request
User minta adaptasi PRD 7 ke codebase yang sudah jalan di demo.hanzserver.online tanpa rombak ulang.

### Interview Summary
- Keputusan arsitektur: Hybrid database (MySQL lokal untuk produk, Supabase untuk data sensitif)
- API base URL tetap /api (bukan /ppob-api seperti di PRD)
- Semua fitur yang sudah jalan tidak diubah
- Fokus pada gap: middleware keamanan, auth UI, transaksi real, riwayat transaksi

### Metis Review
- Guardrail: Jangan ubah API base URL yang sudah jalan
- Guardrail: MySQL hanya untuk produk, jangan pindahkan user/transaksi
- Guardrail: Test setiap wave sebelum lanjut ke wave berikutnya

## Work Objectives
### Core Objective
Adaptasi PRD 7 dengan menambahkan fitur yang missing tanpa breaking existing features.

### Deliverables
1. MySQL lokal di 192.168.1.8 dengan 12.775 produk
2. Backend middleware: helmet, cors, rate-limit
3. Auth UI: login + register pages
4. Halaman riwayat transaksi
5. Digiflazz real topup integration
6. Admin sync UI

### Definition of Done
- [ ] MySQL installed dan berisi 12.775 produk
- [ ] Backend API response time < 100ms untuk catalog
- [ ] User bisa login/register via UI
- [ ] User bisa lihat riwayat transaksi
- [ ] Order otomatis trigger Digiflazz topup
- [ ] Admin bisa sync produk via UI
- [ ] Rate limit 30 req/min aktif
- [ ] Semua fitur existing masih jalan

### Must Have
- MySQL lokal untuk produk (performance critical)
- Middleware keamanan (helmet, cors, rate-limit)
- Auth UI (login/register)
- Digiflazz real topup wired

### Must NOT Have
- Jangan ubah API base URL dari /api
- Jangan pindahkan user/transaksi ke MySQL
- Jangan rombak voucher system yang sudah jalan
- Jangan ubah multi-item checkout flow

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after + framework existing (Jest/Vitest)
- QA policy: Every task has agent-executed scenarios
- Evidence: .sisyphus/evidence/task-{N}-{slug}.{ext}

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.

Wave 1: Foundation (2 tasks) - MySQL setup + data migration
Wave 2: Backend adapters (3 tasks) - MySQL adapter, middleware, webhook
Wave 3: Frontend features (3 tasks) - Auth UI, transaction history, admin sync
Wave 4: Integration (2 tasks) - Digiflazz wiring, deployment

### Dependency Matrix
Task 1 → Task 2 → Task 3 → Task 9 → Task 10 (critical path)
Task 4, 5 → Task 6, 7, 8 (parallel after Wave 2)

### Agent Dispatch Summary
Wave 1: 2 tasks → implementation
Wave 2: 3 tasks → implementation
Wave 3: 3 tasks → visual-engineering
Wave 4: 2 tasks → implementation

## TODOs

- [x] 1. Install MySQL di server 192.168.1.8 + buat tabel produk

  **What to do**: 
  1. SSH ke 192.168.1.8
  2. Install MySQL 8: apt install mysql-server -y
  3. Secure installation: mysql_secure_installation
  4. Buat database ppob_products
  5. Buat user ppob dengan password
  6. Buat tabel produk dengan schema lengkap (id, sku_digiflazz, nama, kategori, provider, harga_modal, harga_jual, status, main_category, sub_category, product_type, image_url, deskripsi, metadata, timestamps)
  7. Tambah indexes: sku, kategori, provider, status, FULLTEXT(nama, provider)
  8. Update backend/.env dengan MySQL credentials

  **Must NOT do**: Jangan pindahkan tabel lain ke MySQL, hanya produk

  **Recommended Agent Profile**:
  - Category: implementation
  - Skills: []
  - Omitted: frontend skills

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Task 2, 3 | Blocked By: none

  **References**:
  - Server: ssh root@192.168.1.8 password 1@241223
  - Current products: Supabase demo_products table (12,775 rows)

  **Acceptance Criteria**:
  - [ ] mysql -u ppob -p ppob_products -e "SHOW TABLES;" menampilkan tabel produk
  - [ ] DESCRIBE produk; menampilkan semua kolom sesuai schema
  - [ ] SHOW INDEX FROM produk; menampilkan FULLTEXT index

  **QA Scenarios**:
  `
  Scenario: MySQL installation verification
    Tool: Bash
    Steps: 
      1. SSH ke 192.168.1.8
      2. mysql -u ppob -p<password> ppob_products -e "SELECT COUNT(*) FROM produk;"
    Expected: Query berhasil (meski count 0)
    Evidence: .sisyphus/evidence/task-1-mysql-setup.txt

  Scenario: FULLTEXT index test
    Tool: Bash
    Steps:
      1. mysql -u ppob -p<password> ppob_products -e "SHOW INDEX FROM produk WHERE Index_type='FULLTEXT';"
    Expected: Minimal 1 FULLTEXT index pada kolom nama/provider
    Evidence: .sisyphus/evidence/task-1-fulltext-index.txt
  `

  **Commit**: YES | Message: eat(db): setup MySQL produk table | Files: backend/.env

---

- [x] 2. Migrasi 12.775 produk dari Supabase → MySQL

  > **⚠️ REVIEW NOTE (May 2025)**: Migration script `backend/scripts/migrate-products-to-mysql.ts` is NOT in the repository (`backend/scripts/` is empty). However, MySQL data IS present (12,775 products verified in `produk` table). Script was likely run as one-time operation and deleted. **STATUS: DATA MIGRATED, SCRIPT ARTIFACT MISSING.** Action: document as one-time operation or recreate script for reproducibility.

  **What to do**:
  1. Buat script backend/scripts/migrate-products-to-mysql.ts
  2. Connect ke Supabase dengan service role key
  3. Fetch ALL dari demo_products (pagination 1000/batch)
  4. Map kolom: name→nama, category→kategori, base_price_minor→harga_modal dan harga_jual
  5. INSERT ke MySQL batch 500 dengan ON DUPLICATE KEY UPDATE
  6. Log progress per batch
  7. Jalankan script: npx ts-node backend/scripts/migrate-products-to-mysql.ts
  8. Verifikasi count dan sample data

  **Must NOT do**: Jangan hapus data dari Supabase (keep as backup)

  **Recommended Agent Profile**:
  - Category: implementation
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Task 3 | Blocked By: Task 1

  **References**:
  - Supabase URL: https://wprbrqmimwwukrhuawms.supabase.co
  - Service role key: in backend/.env
  - Source table: demo_products (12,775 rows)

  **Acceptance Criteria**:
  - [ ] SELECT COUNT(*) FROM produk; returns 12775
  - [ ] SELECT COUNT(*) FROM produk WHERE kategori='Games'; returns ~3893
  - [ ] Script logs "Migration complete: 12775 products"

  **QA Scenarios**:
  `
  Scenario: Migration count verification
    Tool: Bash
    Steps:
      1. Run migration script
      2. mysql query: SELECT kategori, COUNT(*) FROM produk GROUP BY kategori;
    Expected: 6 categories with correct counts (Games ~3893, Data ~3446, etc)
    Evidence: .sisyphus/evidence/task-2-migration-counts.txt

  Scenario: Sample data integrity
    Tool: Bash
    Steps:
      1. mysql query: SELECT * FROM produk WHERE sku_digiflazz LIKE 'Pulsa-%' LIMIT 5;
    Expected: 5 rows with complete data (nama, kategori, harga_modal, provider)
    Evidence: .sisyphus/evidence/task-2-sample-data.txt
  `

  **Commit**: YES | Message: eat(db): migrate 12775 products to MySQL | Files: backend/scripts/migrate-products-to-mysql.ts

---

- [x] 3. Backend mysql2 adapter — ganti catalog source ke MySQL

  **What to do**:
  1. npm install mysql2 di backend/
  2. Buat backend/src/modules/catalog/mysql-catalog.repository.ts
  3. Implement CatalogRepository interface dengan mysql2 pool
  4. Method getPaginatedProducts dengan FULLTEXT search + category filter
  5. Method getProductBySku, listCategories
  6. Update app.ts: kondisional MySQL vs Supabase based on MYSQL_HOST env
  7. Update catalog.router.ts: mapping field MySQL (nama→name)
  8. Test API endpoints

  **Must NOT do**: Jangan hapus SupabaseCatalogRepository (keep as fallback)

  **Recommended Agent Profile**:
  - Category: implementation
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Task 9 | Blocked By: Task 2

  **References**:
  - Pattern: backend/src/modules/catalog/supabase-catalog.repository.ts
  - Interface: CatalogRepository in catalog.service.ts
  - MySQL pool config: connectionLimit 10, waitForConnections true

  **Acceptance Criteria**:
  - [ ] curl localhost:3001/api/catalog/products?page=1&limit=50 returns 50 products
  - [ ] curl "localhost:3001/api/catalog/products?search=telkomsel" returns Telkomsel products
  - [ ] Response time < 100ms (measure with curl -w "%{time_total}")

  **QA Scenarios**:
  `
  Scenario: Pagination test
    Tool: Bash
    Steps:
      1. curl localhost:3001/api/catalog/products?page=1&limit=50
      2. curl localhost:3001/api/catalog/products?page=2&limit=50
    Expected: Page 1 and 2 return different products, total 100 unique
    Evidence: .sisyphus/evidence/task-3-pagination.json

  Scenario: Search performance
    Tool: Bash
    Steps:
      1. curl -w "%{time_total}" "localhost:3001/api/catalog/products?search=telkomsel&limit=20"
    Expected: Response time < 0.1 seconds
    Evidence: .sisyphus/evidence/task-3-search-perf.txt
  `

  **Commit**: YES | Message: eat(catalog): MySQL adapter with FULLTEXT search | Files: backend/src/modules/catalog/mysql-catalog.repository.ts, app.ts

---

- [x] 4. Middleware keamanan — helmet + cors + rate-limit

  **What to do**:
  1. npm install helmet cors express-rate-limit
  2. Update app.ts: tambah helmet(), cors(), rateLimit middleware
  3. CORS origin: localhost:5173 + demo.hanzserver.online
  4. Rate limit: 30 req/min global, 120 req/min untuk /api/catalog/
  5. Tambah ALLOWED_ORIGINS ke backend/.env
  6. Test: kirim 31 request cepat → expect 429

  **Must NOT do**: Jangan block localhost saat development

  **Recommended Agent Profile**:
  - Category: implementation
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 10 | Blocked By: none

  **References**:
  - Pattern: standard Express middleware setup
  - Helmet docs: https://helmetjs.github.io/

  **Acceptance Criteria**:
  - [ ] curl -I localhost:3001/api/health shows X-Content-Type-Options: nosniff
  - [ ] 31st rapid request to /api/vouchers/list returns 429
  - [ ] Frontend localhost:5173 no CORS error in console

  **QA Scenarios**:
  `
  Scenario: Rate limit enforcement
    Tool: Bash
    Steps:
      1. for i in {1..35}; do curl -s localhost:3001/api/vouchers/list; done
      2. Check last 5 responses
    Expected: Responses 31-35 return 429 status
    Evidence: .sisyphus/evidence/task-4-rate-limit.txt

  Scenario: Helmet headers
    Tool: Bash
    Steps:
      1. curl -I localhost:3001/api/health
    Expected: Headers include X-Content-Type-Options, X-Frame-Options
    Evidence: .sisyphus/evidence/task-4-helmet-headers.txt
  `

  **Commit**: YES | Message: eat(security): add helmet, cors, rate-limit middleware | Files: backend/src/app.ts, package.json

---

- [x] 5. Register webhook Digiflazz + auth profile/PIN endpoint

  **What to do**:
  1. Di app.ts: register fulfillmentRouter ke /api/webhook
  2. Test webhook: POST /api/webhook/digiflazz/callback
  3. Di auth.router.ts: tambah GET /profile, PUT /profile, POST /change-pin
  4. Supabase migration: tambah kolom pin_hash, no_hp, nama ke users table
  5. Implement bcrypt untuk PIN validation
  6. Test endpoints dengan valid token

  **Must NOT do**: Jangan expose PIN plaintext di response

  **Recommended Agent Profile**:
  - Category: implementation
  - Skills: []

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 6 | Blocked By: none

  **References**:
  - Existing: backend/src/modules/fulfillment/fulfillment.router.ts
  - Existing: backend/src/modules/auth/auth.router.ts
  - Pattern: bcrypt.compare for PIN validation

  **Acceptance Criteria**:
  - [ ] POST /api/webhook/digiflazz/callback without signature returns 401
  - [ ] PUT /api/auth/profile with valid token returns 200
  - [ ] POST /api/auth/change-pin with wrong PIN returns 400

  **QA Scenarios**:
  `
  Scenario: Webhook signature validation
    Tool: Bash
    Steps:
      1. curl -X POST localhost:3001/api/webhook/digiflazz/callback -d '{}'
    Expected: 401 Unauthorized (signature missing)
    Evidence: .sisyphus/evidence/task-5-webhook-auth.txt

  Scenario: Change PIN validation
    Tool: Bash
    Steps:
      1. Register user, get token
      2. POST /api/auth/change-pin with old_pin=wrong, new_pin=1234
    Expected: 400 with error message "PIN lama salah"
    Evidence: .sisyphus/evidence/task-5-pin-validation.txt
  `

  **Commit**: YES | Message: eat(auth): add profile and change-pin endpoints | Files: backend/src/modules/auth/auth.router.ts, app.ts

---

- [x] 6. Auth UI — halaman login + register di frontend

  **What to do**:
  1. Buat LoginPage.tsx: form email+password, POST /api/auth/login
  2. Buat RegisterPage.tsx: form nama+email+no_hp+password
  3. Update App.tsx: route /login, /register, /profile
  4. Update Header.tsx: tampilkan nama user jika logged in, tombol Masuk/Daftar jika tidak
  5. Buat lib/auth.ts: getAuthToken, setAuthToken, clearAuthToken helpers
  6. Test: register → login → token tersimpan → nama di header

  **Must NOT do**: Jangan simpan password di localStorage

  **Recommended Agent Profile**:
  - Category: visual-engineering
  - Skills: [frontend-ui-ux]

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Task 7 | Blocked By: Task 5

  **References**:
  - Existing: Frontend/src/components/Header.tsx
  - Existing: Frontend/src/App.tsx routing pattern
  - API: POST /api/auth/register, POST /api/auth/login

  **Acceptance Criteria**:
  - [ ] Open /login, enter valid credentials → redirect to / with name in header
  - [ ] Open /register, fill form → success redirect to /login
  - [ ] Click "Keluar" → token cleared, header shows Masuk/Daftar buttons

  **QA Scenarios**:
  `
  Scenario: Login flow
    Tool: Playwright
    Steps:
      1. Navigate to http://localhost:5173/login
      2. Fill email, password
      3. Click "Masuk"
      4. Wait for redirect to /
      5. Check header contains user name
    Expected: User name visible in header after login
    Evidence: .sisyphus/evidence/task-6-login-flow.png

  Scenario: Register validation
    Tool: Playwright
    Steps:
      1. Navigate to /register
      2. Fill form with invalid email
      3. Click "Daftar"
    Expected: Error message "Email tidak valid"
    Evidence: .sisyphus/evidence/task-6-register-validation.png
  `

  **Commit**: YES | Message: eat(auth): add login and register UI | Files: Frontend/src/components/LoginPage.tsx, RegisterPage.tsx, lib/auth.ts

---

- [x] 7. Halaman riwayat transaksi user

  **What to do**:
  1. Buat TransaksiPage.tsx: fetch GET /api/orders dengan Authorization header
  2. Tampilkan list order: order_number, tanggal, status badge, total
  3. Expandable row: klik → detail items
  4. Filter: status (Semua/Sukses/Pending/Gagal)
  5. Update App.tsx: route /transaksi
  6. Update Header.tsx: link "Transaksi" jika logged in
  7. Backend order.router.ts: filter by user_id dari JWT

  **Must NOT do**: Jangan tampilkan order user lain

  **Recommended Agent Profile**:
  - Category: visual-engineering
  - Skills: [frontend-ui-ux]

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: none | Blocked By: Task 6

  **References**:
  - API: GET /api/orders (existing)
  - Pattern: Frontend/src/components/VoucherManagement.tsx (list + detail)

  **Acceptance Criteria**:
  - [ ] Login → click "Transaksi" → page shows order list
  - [ ] Order number format ORD-xxx with status badge
  - [ ] Click order → detail items expandable
  - [ ] Not logged in → redirect to /login

  **QA Scenarios**:
  `
  Scenario: Transaction list display
    Tool: Playwright
    Steps:
      1. Login as user
      2. Create test order via API
      3. Navigate to /transaksi
      4. Check order appears in list
    Expected: Order visible with correct order_number and status
    Evidence: .sisyphus/evidence/task-7-transaction-list.png

  Scenario: Auth guard
    Tool: Playwright
    Steps:
      1. Clear localStorage
      2. Navigate to /transaksi
    Expected: Redirect to /login
    Evidence: .sisyphus/evidence/task-7-auth-guard.png
  `

  **Commit**: YES | Message: eat(transaction): add transaction history page | Files: Frontend/src/components/TransaksiPage.tsx

---

- [x] 8. Admin sync Digiflazz UI + server-side pagination di catalog

  **What to do**:
  
  **A. Server-side pagination frontend:**
  1. Update ProductCatalog.tsx: hapus "fetch all" logic
  2. Tambah state: page, hasMore, loading
  3. Fetch /api/catalog/products?page=1&limit=50
  4. Infinite scroll: IntersectionObserver di bottom sentinel
  5. Scroll ke bawah → increment page → append products
  
  **B. Admin Sync UI:**
  1. Update AdminDashboard.tsx: section "Sinkronisasi Produk"
  2. Button "Sync Sekarang" → POST /api/admin/sync-digiflazz
  3. Progress: loading spinner, success/error message
  4. Display: "Last sync: X menit lalu", "Total produk: 12.775"

  **Must NOT do**: Jangan load semua produk sekaligus di frontend

  **Recommended Agent Profile**:
  - Category: visual-engineering
  - Skills: [frontend-ui-ux]

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: none | Blocked By: Task 3

  **References**:
  - Existing: Frontend/src/components/ProductCatalog.tsx
  - Existing: Frontend/src/components/AdminDashboard.tsx
  - API: GET /api/catalog/products (pagination), POST /api/admin/sync-digiflazz

  **Acceptance Criteria**:
  - [ ] Scroll down in catalog → products load automatically
  - [ ] Network tab shows only 50 products per request
  - [ ] Login admin → click Sync → progress shows → success with total

  **QA Scenarios**:
  `
  Scenario: Infinite scroll
    Tool: Playwright
    Steps:
      1. Navigate to /catalog
      2. Scroll to bottom
      3. Wait for new products to load
      4. Check network requests
    Expected: Multiple requests with page=1, page=2, etc
    Evidence: .sisyphus/evidence/task-8-infinite-scroll.png

  Scenario: Admin sync
    Tool: Playwright
    Steps:
      1. Login as admin
      2. Navigate to /admin
      3. Click "Sync Sekarang"
      4. Wait for completion
    Expected: Success message with product count
    Evidence: .sisyphus/evidence/task-8-admin-sync.png
  `

  **Commit**: YES | Message: eat(catalog): add infinite scroll and admin sync UI | Files: Frontend/src/components/ProductCatalog.tsx, AdminDashboard.tsx

---

- [x] 9. Wire Digiflazz real topup ke order flow

  > **⚠️ REVIEW NOTE (May 2025)**: Plan says "Di order.service.ts: setelah order created, call digiflazzClient.topup()" — this is NOT the actual implementation. The real architecture is BETTER: topup is triggered AFTER payment settlement via webhook, not at order creation time. The flow is:
  > 1. `order.service.ts:createOrder()` → status "pending_payment" (NO Digiflazz call)
  > 2. User pays via Midtrans
  > 3. Midtrans webhook → `payment.service.ts:handleMidtransWebhook()` → transitions order to "paid"
  > 4. Payment service calls `fulfillmentService.triggerPaidOrderFulfillment({orderId})`
  > 5. `fulfillment.service.ts:sendLiveTopup()` calls Digiflazz `POST /v1/transaction`
  >
  > **STATUS: IMPLEMENTED with better architecture than planned.** The plan description below is inaccurate but the actual code (`fulfillment.service.ts` + `buyer-client.ts`) correctly implements payment-triggered topup.

  **What to do**:
  1. Di order.service.ts: setelah order created, call digiflazzClient.topup()
  2. Parameters: buyerSkuCode, customerNo, refId (order_number), testing=true
  3. Buat tabel Supabase transaksi: id, order_id, digiflazz_ref_id, digiflazz_rc, status, sn
  4. Simpan response ke transaksi table
  5. Update order item status: rc='00' → sukses, 'waiting' → pending, else → gagal
  6. Test dengan testing=true mode

  **Must NOT do**: Jangan panggil Digiflazz production tanpa testing flag

  **Recommended Agent Profile**:
  - Category: implementation
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Task 10 | Blocked By: Task 3

  **References**:
  - Existing: backend/src/modules/digiflazz/buyer-client.ts (topup method)
  - Existing: backend/src/modules/order/order.service.ts
  - Pattern: fulfillment.service.ts (Digiflazz integration)

  **Acceptance Criteria**:
  - [ ] POST /api/orders/create with testing=true → response includes digiflazz_status
  - [ ] SELECT * FROM transaksi shows record after order
  - [ ] Order item status updated based on Digiflazz response
  - [ ] Digiflazz unreachable → order saved with status pending

  **QA Scenarios**:
  `
  Scenario: Topup success flow
    Tool: Bash
    Steps:
      1. POST /api/orders/create with valid product
      2. Check transaksi table for record
      3. Check order_items status
    Expected: transaksi record exists, status=sukses if rc='00'
    Evidence: .sisyphus/evidence/task-9-topup-success.json

  Scenario: Topup failure handling
    Tool: Bash
    Steps:
      1. Mock Digiflazz error response
      2. POST /api/orders/create
      3. Check order still saved
    Expected: Order saved with status=pending, error logged
    Evidence: .sisyphus/evidence/task-9-topup-failure.json
  `

  **Commit**: YES | Message: eat(order): wire Digiflazz real topup integration | Files: backend/src/modules/order/order.service.ts

---

- [x] 10. Deploy ke server + test end-to-end

  **What to do**:
  1. Build frontend: npm run build
  2. SCP frontend dist → /var/www/ppob-demo/frontend/
  3. SCP backend src → /mnt/sdcard/ppob-demo/backend/
  4. SSH: npm install && npx tsc
  5. pm2 restart ppob-backend
  6. Test all endpoints via curl
  7. Test via browser: demo.hanzserver.online
  8. Run MySQL migration on server
  9. Verify: catalog, login, checkout, transactions

  **Must NOT do**: Jangan deploy tanpa test lokal dulu

  **Recommended Agent Profile**:
  - Category: implementation
  - Skills: []

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: none | Blocked By: Task 9

  **References**:
  - Server: ssh root@192.168.1.8
  - Frontend path: /var/www/ppob-demo/frontend/
  - Backend path: /mnt/sdcard/ppob-demo/backend/
  - PM2: pm2 restart ppob-backend

  **Acceptance Criteria**:
  - [ ] curl https://demo.hanzserver.online/api/health returns 200
  - [ ] Catalog loads < 1.5 seconds in browser
  - [ ] Login successful, token stored
  - [ ] Checkout with real product → order saved
  - [ ] PM2 status: online, 0 unexpected restarts

  **QA Scenarios**:
  `
  Scenario: Full deployment verification
    Tool: Bash
    Steps:
      1. curl https://demo.hanzserver.online/api/health
      2. curl https://demo.hanzserver.online/api/catalog/products?limit=10
      3. Check PM2 status
    Expected: All endpoints return 200, PM2 online
    Evidence: .sisyphus/evidence/task-10-deployment.txt

  Scenario: Browser end-to-end test
    Tool: Playwright
    Steps:
      1. Navigate to https://demo.hanzserver.online
      2. Click catalog
      3. Login
      4. Create order
    Expected: All flows work without errors
    Evidence: .sisyphus/evidence/task-10-e2e-test.png
  `

  **Commit**: YES | Message: chore: deploy PRD7 adaptations to production | Files: deployment logs

---

## Final Verification Wave (MANDATORY)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.

- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high  
- [x] F3. Real Manual QA — unspecified-high + playwright
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Atomic commits per task
- Conventional Commits format: feat/fix/chore(scope): message
- No commits to main without PR (if using git flow)

## Success Criteria
- MySQL contains 12,775 products with <100ms query time
- All middleware active (helmet, cors, rate-limit)
- Auth UI functional (login/register/profile)
- Transaction history page shows user orders
- Digiflazz topup wired and tested with testing=true
- Admin sync UI operational
- Zero breaking changes to existing features
- PM2 stable with 0 unexpected restarts
- All 4 final verification agents approve
