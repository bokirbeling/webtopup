# Digiflazz Buyer API Alignment

## TL;DR
> **Summary**: Align the backend and local documentation with Digiflazz **Buyer API only** from `https://developer.digiflazz.com/api/buyer`, excluding API Management/Seller docs entirely.
> **Deliverables**:
> - Local markdown mirror under `docs/digiflazz-buyer/`
> - Buyer API client/service hardening for topup, price list, saldo, status, webhook, and postpaid Buyer flows
> - Product catalog sync from Digiflazz Buyer price list
> - Admin-only operational surfaces for saldo, sync, webhook/status monitoring
> - Email verification for users/resellers with cPanel SMTP setup guidance
> - Storefront/admin branding changed from BayarKu to Adnanpay
> - Tests and deployment smoke for `adnanpay.com/ppob-api`
> **Effort**: Large
> **Parallel**: YES - 4 waves
> **Critical Path**: Task 1 docs mirror -> Task 2 Buyer client -> Task 3 product sync -> Task 4 fulfillment/status/webhook -> Task 7 email/brand -> Task 8 final deploy smoke

## Context
### Original Request
- User confirmed: `api saya sebagai buyer https://developer.digiflazz.com/api/buyer dokumentasi hanya merujuk sebagai buyer`.
- User additionally requested: copy all `https://developer.digiflazz.com/api/buyer` documentation into a local docs folder so it can be read locally.
- User provided exact Buyer documentation URLs to mirror/reference:
  - `https://developer.digiflazz.com/`
  - `https://developer.digiflazz.com/alasan-gagal/`
  - `https://developer.digiflazz.com/api/buyer/persiapan/`
  - `https://developer.digiflazz.com/api/buyer/cek-saldo/`
  - `https://developer.digiflazz.com/api/buyer/daftar-harga/`
  - `https://developer.digiflazz.com/api/buyer/deposit/`
  - `https://developer.digiflazz.com/api/buyer/topup/`
  - `https://developer.digiflazz.com/api/buyer/cek-tagihan/`
  - `https://developer.digiflazz.com/api/buyer/bayar-tagihan/`
  - `https://developer.digiflazz.com/api/buyer/cek-status/`
  - `https://developer.digiflazz.com/api/buyer/inquiry-pln/`
  - `https://developer.digiflazz.com/api/buyer/test-case/`
  - `https://developer.digiflazz.com/api/buyer/response-code/`
  - `https://developer.digiflazz.com/api/buyer/webhook/`

### Interview Summary
- Use Buyer API docs only.
- Do not reference `https://developer.digiflazz.com/api_management/` or Seller/API Management docs.
- Include the Digiflazz documentation root only as platform orientation and `alasan-gagal` as Buyer failure-reason mapping because user provided those URLs explicitly.
- Existing backend already has partial Digiflazz prepaid topup and webhook handling in `backend/src/modules/fulfillment/*`.
- Existing production backend is deployed under `https://adnanpay.com/ppob-api`.
- User requested reseller/user email verification and cPanel email setup guidance, while user/reseller management remains inside Adnanpay and does not require creating cPanel email accounts for every user.
- User requested store/app name changed from `BayarKu` to `Adnanpay`.
- User requested deployment flow: local coding is pushed to GitHub, then Adnanpay Natanetwork server pulls from GitHub over SSH/Git for production deployment.

### Metis Review (gaps addressed)
- Default decision: include **all Buyer docs pages** in local mirror, not a curated subset, because user asked “salin smua”.
- Default decision: implement prepaid/topup as core, include postpaid Buyer inquiry/pay/status because it is part of Buyer docs, but keep it behind explicit backend APIs and tests.
- Default decision: expose saldo and price-list sync as **admin-only** backend/admin dashboard functions.
- Guardrail: prepaid status recheck must repeat topup with same `ref_id`; do not invent a nonexistent prepaid status endpoint.
- Guardrail: webhook signature verification must be enforced when `DIGIFLAZZ_WEBHOOK_SECRET` is configured.

## Work Objectives
### Core Objective
Make Adnanpay’s Digiflazz integration Buyer-API-complete enough for production use while keeping documentation, code, tests, and deployment smoke traceable to local copies of official Buyer docs.

### Deliverables
- `docs/digiflazz-buyer/index.md` plus markdown pages copied from Buyer API docs.
- Backend Digiflazz Buyer client/service with exact request/response fields and signatures from local docs.
- Price-list sync from Digiflazz Buyer `/v1/price-list` into existing product catalog.
- Admin-only saldo and sync endpoints/UI.
- Email verification before reseller request/activation, using cPanel SMTP or approved transactional email settings.
- Replace visible BayarKu branding with Adnanpay across frontend/docs/evidence/runbooks.
- Hardened prepaid topup, recheck, and webhook signature/idempotency handling.
- Postpaid Buyer inquiry/pay/status support if docs pages are mirrored successfully.
- Evidence files under `.sisyphus/evidence/` and notepad updates.

### Definition of Done (verifiable conditions with commands)
- `docs/digiflazz-buyer/index.md` maps every copied local file to a `https://developer.digiflazz.com/api/buyer/...` source URL.
- No docs copied from API Management/Seller paths.
- Backend/frontend lint, typecheck, tests, and builds pass locally unless environment-only failures are documented for MCP follow-up.
- Live MCP smoke checks `https://adnanpay.com/ppob-api/health`, auth, catalog, price-list sync dry-run or sandbox, and webhook/status test path without exposing secrets.

### Must Have
- Buyer-only source references.
- Secret-safe handling for `DIGIFLAZZ_USERNAME`, `DIGIFLAZZ_API_KEY`, `DIGIFLAZZ_API_BASE_URL`, and new webhook secret if needed.
- Admin-only access for saldo, price-list sync, deposit/request-ticket operations if implemented.
- Reseller requests require verified email.
- cPanel email is used only for SMTP sender/setup, not for managing Adnanpay users/resellers.
- Visible store/app name is `Adnanpay`, not `BayarKu`.
- Deterministic tests using Digiflazz Buyer test cases where possible.

### Must NOT Have
- No API Management/Seller endpoints, links, docs, or implementation.
- No frontend-trusted Digiflazz pricing or final prices.
- No service-role, Digiflazz API key, webhook secret, JWT secret, SSH key, or passphrase in docs/evidence/output.
- No destructive production changes without backups.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed where credentials/environment allow.
- Test decision: tests-after + existing Jest/Vitest suites.
- QA policy: Every task has agent-executed scenarios.
- Evidence: `.sisyphus/evidence/digiflazz-buyer-task-{N}-{slug}.{txt|png}`.
- MCP policy: If local or live environment blocks a check, record exact blocker and continue implementation; rerun final MCP smoke after deployment.

## Execution Strategy
### Parallel Execution Waves
Wave 1: Task 1 docs mirror, Task 2 client contract design
Wave 2: Task 3 price-list sync, Task 4 prepaid/status/webhook hardening
Wave 3: Task 5 postpaid Buyer flows, Task 6 admin UI/ops surfaces
Wave 4: Task 7 email verification/branding, Task 8 deployment/docs/smoke, Final Verification Wave

### Dependency Matrix (full, all tasks)
- Task 1 blocks all code tasks because local docs become source of truth.
- Task 2 blocks Tasks 3-5.
- Task 3 blocks product/catalog UI verification.
- Task 4 blocks fulfillment/webhook production readiness.
- Task 5 depends on Task 2 and may run parallel with Task 6 after API contracts exist.
- Task 7 depends on existing auth/RBAC and frontend routing from previous Adnanpay readiness work.
- Task 8 depends on Tasks 1-7.

### Agent Dispatch Summary
- Wave 1: 2 tasks -> writing, implementation
- Wave 2: 2 tasks -> implementation, testing/security
- Wave 3: 2 tasks -> implementation, visual-engineering
- Wave 4: 2 tasks + final reviews -> security, visual-engineering, doc-writer, review, testing

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Mirror Digiflazz Buyer API docs locally

  **What to do**: Create `docs/digiflazz-buyer/`. Fetch and save markdown copies for the exact user-provided documentation set: `root`, `alasan-gagal`, `persiapan`, `cek-saldo`, `daftar-harga`, `deposit`, `topup`, `cek-tagihan`, `bayar-tagihan`, `cek-status`, `inquiry-pln`, `test-case`, `response-code`, and `webhook`. Create `docs/digiflazz-buyer/index.md` with source URL, local filename, fetch date, endpoint summary, and implementation relevance.
  **Must NOT do**: Do not copy API Management/Seller docs. Do not include credentials, screenshots with secrets, or generated values.

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: documentation mirror plus index curation.
  - Skills: [] - no special skill needed.
  - Omitted: [`supabase`] - no DB work.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 2-7 | Blocked By: none

  **References**:
  - External: `https://developer.digiflazz.com/` - platform/API orientation only.
  - External: `https://developer.digiflazz.com/alasan-gagal/` - failure-reason mapping.
  - External: `https://developer.digiflazz.com/api/buyer/persiapan/` - Buyer setup requirements.
  - External: `https://developer.digiflazz.com/api/buyer/topup/` - prepaid topup.
  - External: `https://developer.digiflazz.com/api/buyer/daftar-harga/` - price list sync.
  - External: `https://developer.digiflazz.com/api/buyer/cek-saldo/` - saldo.
  - External: `https://developer.digiflazz.com/api/buyer/cek-status/` - recheck rules.
  - External: `https://developer.digiflazz.com/api/buyer/inquiry-pln/` - PLN inquiry-specific Buyer flow.
  - External: `https://developer.digiflazz.com/api/buyer/webhook/` - webhook headers/signature.

  **Acceptance Criteria**:
  - [ ] `docs/digiflazz-buyer/index.md` exists and lists all 14 user-provided URLs: documentation root, `alasan-gagal`, and 12 `/api/buyer/` URLs.
  - [ ] Grep for `api_management|seller/prabayar|/api/seller` in `docs/digiflazz-buyer` returns no copied Seller/API Management docs; root orientation may mention Seller in its matrix but implementation plan must ignore Seller paths.
  - [ ] Each local page has source URL and fetched timestamp.

  **QA Scenarios**:
  ```
  Scenario: Buyer docs mirror completeness
    Tool: Bash
    Steps: Run file listing and grep checks for docs/digiflazz-buyer; verify required page filenames exist.
    Expected: Required Buyer pages exist; index maps every file to a Buyer URL; no Seller/API Management refs.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-1-docs-mirror.txt

  Scenario: Forbidden source rejection
    Tool: Bash
    Steps: Grep docs/digiflazz-buyer for api_management and seller-only paths.
    Expected: No forbidden docs copied.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-1-forbidden-sources.txt
  ```

  **Commit**: YES | Message: `docs(digiflazz): mirror buyer api docs` | Files: [`docs/digiflazz-buyer/**`]

- [x] 2. Create a Digiflazz Buyer client contract layer

  **What to do**: Add/reshape backend Digiflazz Buyer client code so all request builders and response parsers are centralized. Implement signatures: topup/status/postpaid `md5(username + apiKey + ref_id)`, price list `md5(username + apiKey + "pricelist")`, saldo `md5(username + apiKey + "depo")`, deposit `md5(username + apiKey + "deposit")` only if deposit is exposed. Ensure JSON POST and response `data` wrapping are consistently parsed.
  **Must NOT do**: Do not leak raw Digiflazz credentials in logs/responses. Do not use Seller docs.

  **Recommended Agent Profile**:
  - Category: `implementation` - Reason: backend client abstraction and tests.
  - Skills: [] - pure backend TypeScript.
  - Omitted: [`adnanpay-natanetwork`] - no deployment yet.

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: Tasks 3-5 | Blocked By: Task 1 for final references

  **References**:
  - Pattern: `backend/src/modules/fulfillment/fulfillment.service.ts` - existing `signDigiflazz` and live `/v1/transaction` behavior.
  - Pattern: `backend/src/config/env.ts` - environment parsing style.
  - Docs: `docs/digiflazz-buyer/topup.md` - topup fields.
  - Docs: `docs/digiflazz-buyer/daftar-harga.md` - price-list signature.
  - Docs: `docs/digiflazz-buyer/cek-saldo.md` - saldo signature.

  **Acceptance Criteria**:
  - [ ] Unit tests prove exact signature strings for topup, price list, saldo, postpaid status, and deposit if exposed.
  - [ ] Production mode requires Digiflazz credentials; test/mock mode never calls live API.
  - [ ] Errors map Digiflazz `rc`, `message`, and `status` without throwing away payload context.

  **QA Scenarios**:
  ```
  Scenario: Signature contract
    Tool: Bash
    Steps: Run focused backend tests for Digiflazz client signatures and payload builders.
    Expected: md5 inputs match Buyer docs exactly.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-2-signatures.txt

  Scenario: Secret-safe failures
    Tool: Bash
    Steps: Trigger missing credential tests in production-like config.
    Expected: Failure message names missing env keys but never prints secret values.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-2-secret-safe.txt
  ```

  **Commit**: YES | Message: `feat(digiflazz): centralize buyer client` | Files: [`backend/src/modules/**`, `backend/src/config/env.ts`]

- [x] 3. Sync Digiflazz Buyer price list into product catalog

  **What to do**: Add admin-only price-list sync using `POST /v1/price-list` with `cmd: prepaid` and optionally `cmd: pasca`. Map `buyer_sku_code` to existing `products.sku_digiflazz`, `product_name` to product name, `category`, `brand/provider`, `price` to `base_price_minor`, and statuses to active/inactive. Store raw fields in metadata (`seller_name`, `type`, `buyer_product_status`, `seller_product_status`, `stock`, `multi`, cut-off times, `desc`). Respect docs rate-limit note by adding cache/sync timestamp and preventing too-frequent full sync.
  **Must NOT do**: Do not call price-list on every public catalog request. Do not expose Digiflazz raw seller data unnecessarily to public clients.

  **Recommended Agent Profile**:
  - Category: `implementation` - Reason: backend admin sync and catalog persistence.
  - Skills: [`supabase`] - if schema/migrations are needed.
  - Omitted: [`adnanpay-natanetwork`] - deployment is later.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 7 | Blocked By: Tasks 1-2

  **References**:
  - Pattern: `backend/src/modules/catalog/catalog.repository.ts` - products/pricing persistence.
  - Pattern: `backend/src/modules/admin/admin.router.ts` - admin-only route style.
  - Docs: `docs/digiflazz-buyer/daftar-harga.md` - fields and rate-limit note.

  **Acceptance Criteria**:
  - [ ] Admin can trigger prepaid price-list sync; non-admin gets 403; unauthenticated gets 401.
  - [ ] Public catalog reads DB-cached products, not live Digiflazz.
  - [ ] Inactive buyer/seller status excludes product from public catalog or marks inactive according to existing product semantics.
  - [ ] Sync evidence includes product count, active/inactive count, and no secrets.

  **QA Scenarios**:
  ```
  Scenario: Admin prepaid sync
    Tool: Bash
    Steps: Run backend tests with mocked Digiflazz price-list response containing active and inactive products.
    Expected: Products upserted by buyer_sku_code; active filtering matches status fields.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-3-price-sync.txt

  Scenario: Rate-limit guard
    Tool: Bash
    Steps: Run sync twice within blocked interval.
    Expected: Second full sync is rejected or served from cache with clear admin-safe message.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-3-rate-limit.txt
  ```

  **Commit**: YES | Message: `feat(catalog): sync digiflazz buyer prices` | Files: [`backend/src/modules/catalog/**`, `backend/src/modules/digiflazz/**`]

- [x] 4. Harden prepaid topup, status recheck, and webhook handling

  **What to do**: Update existing fulfillment flow to use centralized Buyer client. Preserve paid-only trigger. For prepaid pending status, implement recheck by repeating topup payload with the same `ref_id`, as Buyer docs require. Add optional `max_price`, `cb_url`, and `allow_dot` support only from server-controlled config/metadata. Implement `DIGIFLAZZ_WEBHOOK_SECRET`; if configured, verify `X-Hub-Signature: sha1=<hmac>` against raw body. Handle `X-Digiflazz-Event`, `User-Agent`, ping events, idempotency, duplicate events, status mapping, and response-code storage.
  **Must NOT do**: Do not make fulfillment trigger public without existing rate limits. Do not trust client-provided callback URL or max price.

  **Recommended Agent Profile**:
  - Category: `security` - Reason: webhook signature, idempotency, and payment/fulfillment safety.
  - Skills: [] - backend security/testing.
  - Omitted: [`frontend-ui-ux`] - no UI work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Task 7 | Blocked By: Tasks 1-2

  **References**:
  - Pattern: `backend/src/modules/fulfillment/fulfillment.service.ts` - current trigger/callback logic.
  - Pattern: `backend/src/modules/fulfillment/fulfillment.router.test.ts` - current tests.
  - Docs: `docs/digiflazz-buyer/topup.md` - topup/recheck semantics.
  - Docs: `docs/digiflazz-buyer/webhook.md` - signature/events/user-agent.
  - Docs: `docs/digiflazz-buyer/response-code.md` - response code semantics.

  **Acceptance Criteria**:
  - [ ] Pending prepaid can be rechecked using same `ref_id` without creating local duplicate fulfillment.
  - [ ] Webhook signature passes with correct secret and rejects mismatched signature when secret configured.
  - [ ] Unsigned webhook remains accepted only when secret is not configured, with evidence documenting intentional mode.
  - [ ] Ping event returns safe success and is not stored as a transaction event.

  **QA Scenarios**:
  ```
  Scenario: Prepaid pending recheck
    Tool: Bash
    Steps: Mock Pending then Sukses response for same ref_id and run focused fulfillment tests.
    Expected: One fulfillment/order progresses idempotently; no duplicate order/fulfillment.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-4-recheck.txt

  Scenario: Webhook signature enforcement
    Tool: Bash
    Steps: Send mocked webhook with valid and invalid X-Hub-Signature.
    Expected: Valid accepted; invalid rejected 401/403; duplicate accepted idempotently.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-4-webhook-signature.txt
  ```

  **Commit**: YES | Message: `fix(fulfillment): harden digiflazz buyer flow` | Files: [`backend/src/modules/fulfillment/**`, `backend/src/app.ts`]

- [x] 5. Add Buyer postpaid inquiry, payment, and status support

  **What to do**: Implement postpaid Buyer APIs from local docs: `inq-pasca` for `cek-tagihan`, `pay-pasca` for `bayar-tagihan`, `status-pasca` for postpaid status, and PLN-specific inquiry behavior from `inquiry-pln`. Persist inquiry results and structured `desc` metadata safely. Require payment to reference a stored successful inquiry and server-calculated selling price. Support category-specific extra fields (`amount`, `year`, composite `customer_no`) through metadata validation where documented.
  **Must NOT do**: Do not fake postpaid as prepaid topup. Do not let frontend/client set final payable amount.

  **Recommended Agent Profile**:
  - Category: `implementation` - Reason: new Buyer postpaid backend APIs and tests.
  - Skills: [`supabase`] - likely schema additions for inquiries/bills.
  - Omitted: [`adnanpay-natanetwork`] - deployment is later.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Task 7 | Blocked By: Tasks 1-2

  **References**:
  - Docs: `docs/digiflazz-buyer/cek-tagihan.md` - inquiry fields.
  - Docs: `docs/digiflazz-buyer/inquiry-pln.md` - PLN-specific inquiry fields.
  - Docs: `docs/digiflazz-buyer/bayar-tagihan.md` - payment fields.
  - Docs: `docs/digiflazz-buyer/cek-status.md` - `status-pasca`.
  - Docs: `docs/digiflazz-buyer/test-case.md` - Buyer test cases.
  - Pattern: `backend/src/modules/order/order.service.ts` - server-calculated order/payment snapshots.

  **Acceptance Criteria**:
  - [ ] Admin/member API can perform documented postpaid inquiry with mock/test cases.
  - [ ] Payment requires prior successful inquiry and uses server-stored amount.
  - [ ] `status-pasca` rechecks by `ref_id` and maps response into existing fulfillment/payment/order lifecycle.
  - [ ] Category-specific payload fields are validated and documented.

  **QA Scenarios**:
  ```
  Scenario: Postpaid inquiry then pay
    Tool: Bash
    Steps: Mock Buyer docs inquiry and pay responses for PLN test case.
    Expected: Inquiry stores customer_name/price/selling_price/desc; payment uses stored values and transitions safely.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-5-postpaid-pay.txt

  Scenario: Client amount tampering rejected
    Tool: Bash
    Steps: Submit postpaid pay request with mismatched client amount.
    Expected: Backend ignores/rejects client amount and uses stored inquiry snapshot.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-5-postpaid-tamper.txt
  ```

  **Commit**: YES | Message: `feat(digiflazz): add buyer postpaid flows` | Files: [`backend/src/modules/**`, `supabase/migrations/**`]

- [x] 6. Add admin operations UI/API for Buyer saldo, sync, and monitoring

  **What to do**: Add admin-only backend route and frontend admin panel for `cek-saldo`, price-list sync status, latest sync result, Digiflazz webhook/status monitoring, and postpaid inquiry/payment operational view. Use existing `/admin` UI patterns. Saldo must never be public/member-visible unless user explicitly asks later.
  **Must NOT do**: Do not expose API key, raw signature, or full request payload with secrets in UI/logs.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: admin UI plus backend API integration.
  - Skills: [`frontend-ui-ux`] - dashboard UI consistency.
  - Omitted: [`impeccable-style`] - use existing style unless high polish requested.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: Task 7 | Blocked By: Tasks 2-4

  **References**:
  - Pattern: `Frontend/src/components/AdminDashboard.tsx` - current admin dashboard.
  - Pattern: `backend/src/modules/dashboard/dashboard.router.ts` - monitoring route style.
  - Docs: `docs/digiflazz-buyer/cek-saldo.md` - saldo fields.
  - Docs: `docs/digiflazz-buyer/daftar-harga.md` - price sync.

  **Acceptance Criteria**:
  - [ ] Admin sees saldo, last price sync, sync button, and webhook/status summary.
  - [ ] Non-admin `/admin` cannot access Digiflazz operations controls.
  - [ ] UI states cover loading, success, failure, and empty catalog.

  **QA Scenarios**:
  ```
  Scenario: Admin Buyer operations panel
    Tool: Playwright or Vitest
    Steps: Login/mock admin, open /admin, inspect Digiflazz operations panel, trigger mocked sync.
    Expected: Admin sees saldo/sync status; bearer auth used; no secrets rendered.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-6-admin-ops.txt

  Scenario: Non-admin forbidden
    Tool: Vitest
    Steps: Login/mock pengguna and open /admin.
    Expected: No Digiflazz operations controls; forbidden state remains.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-6-nonadmin.txt
  ```

  **Commit**: YES | Message: `feat(admin): add digiflazz buyer operations` | Files: [`Frontend/src/**`, `backend/src/modules/**`]

- [x] 7. Add email verification for reseller safety and rename branding to Adnanpay

  **What to do**: Add email verification to the custom auth flow before reseller request/activation. Add DB columns such as `email_verified_at`, hashed verification token/OTP, expiry, resend counters, and timestamps. Add endpoints for requesting/resending verification and verifying token/OTP. Integrate email delivery through a single configured sender mailbox/SMTP account on cPanel, such as `no-reply@adnanpay.com`, while keeping Adnanpay user/reseller records inside the application database. Gate reseller request and reseller activation paths so unverified users cannot become reseller. Replace visible `BayarKu` branding with `Adnanpay` in frontend title/header/copy/tests/docs/evidence/runbooks.
  **Must NOT do**: Do not create one cPanel mailbox per user/reseller. Do not store raw verification tokens. Do not expose SMTP password, cPanel login, JWT secret, or service-role key. Do not use Supabase Auth email unless explicitly selected later; current custom auth remains source of truth.

  **Recommended Agent Profile**:
  - Category: `security` - Reason: auth verification, token hashing, resend/rate-limit safety.
  - Skills: [`adnanpay-natanetwork`] - cPanel SMTP setup/runbook verification.
  - Omitted: [`supabase-postgres-best-practices`] - only needed if migration design becomes complex.

  **Parallelization**: Can Parallel: YES | Wave 4 | Blocks: Task 8 | Blocked By: existing auth/RBAC from Adnanpay readiness work

  **References**:
  - Pattern: `backend/src/modules/auth/auth.service.ts` - custom auth/register/login/token flow.
  - Pattern: `backend/src/modules/auth/auth.router.ts` - auth route validation/error response style.
  - Pattern: `backend/src/modules/account/account.service.ts` - reseller request gating.
  - Pattern: `Frontend/src/components/AuthDashboard.tsx` - dashboard login/reseller UI.
  - Pattern: `Frontend/src/components/Header.tsx` and `Frontend/src/App.tsx` - visible storefront branding.
  - Server: `/home/adnanpay` / cPanel email setup - SMTP sender only, no root/sudo.

  **Acceptance Criteria**:
  - [ ] New migration adds email verification fields without breaking existing users.
  - [ ] Register/login response includes email verification status without exposing token/hash.
  - [ ] Verification token/OTP is stored hashed, expires, and resend is rate-limited.
  - [ ] Reseller request returns 403/409 with clear message until email is verified.
  - [ ] CPanel email setup guide documents creating/configuring only sender mailbox/SMTP credentials, not app users.
  - [ ] Frontend no longer shows `BayarKu`; visible store/app name is `Adnanpay`.
  - [ ] Tests cover register -> verify email -> request reseller, unverified reseller rejection, resend rate-limit, and branding smoke.

  **QA Scenarios**:
  ```
  Scenario: Verified email unlocks reseller request
    Tool: Bash
    Steps: Run backend auth/account tests registering a user, requesting verification, verifying token/OTP, then requesting reseller.
    Expected: Unverified user blocked; verified user can request reseller; token hash never returned.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-7-email-verification.txt

  Scenario: cPanel SMTP sender-only setup
    Tool: Bash + SSH/MCP
    Steps: Inspect/document cPanel SMTP env placeholders and run/send mocked email test without printing secrets.
    Expected: Runbook shows sender mailbox setup only; app users remain in Adnanpay DB; no SMTP secrets exposed.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-7-cpanel-email.txt

  Scenario: Adnanpay branding smoke
    Tool: Vitest/Playwright
    Steps: Render landing, dashboard, admin, docs references.
    Expected: `Adnanpay` visible; `BayarKu` absent except historical changelog/evidence if explicitly labeled old.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-7-branding.txt
  ```

  **Commit**: YES | Message: `feat(auth): verify reseller email` | Files: [`backend/src/modules/auth/**`, `backend/src/modules/account/**`, `Frontend/src/**`, `supabase/migrations/**`, `panduan_adnanpay.md`]

- [x] 8. Deployment, MCP smoke, and operator docs

  **What to do**: Update `panduan_adnanpay.md`, `readme.md`, and/or `server_spec.md` with Buyer-only Digiflazz operation instructions plus email verification/cPanel SMTP setup and GitHub-based deployment flow: docs mirror location, env keys, webhook secret setup, Digiflazz webhook URL, IP whitelist, price sync cadence, saldo checks, status recheck policy, SMTP sender mailbox setup, email verification troubleshooting, Adnanpay branding, GitHub push from local coding workspace, Natanetwork SSH pull/build/restart, and production smoke. Deploy to `adnanpay.com` only after local gates pass. Use Adnanpay Natanetwork SSH and Adnanpay Supabase MCP for smoke where available.
  **Must NOT do**: Do not print or commit real Digiflazz credentials. Do not overwrite production without timestamped backup. Do not commit `.env.production`, MCP env files, SSH keys, passphrases, service-role keys, Digiflazz API keys, or SMTP passwords to GitHub.

  **Recommended Agent Profile**:
  - Category: `doc-writer` - Reason: runbook and smoke evidence.
  - Skills: [`adnanpay-natanetwork`, `supabase`] - production/MCP checks.
  - Omitted: [`frontend-ui-ux`] - only docs/deployment smoke.

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: Final Verification | Blocked By: Tasks 1-7

  **References**:
  - Pattern: `panduan_adnanpay.md` - current operator guide.
  - Pattern: `.sisyphus/evidence/task-8-adnanpay-domain-smoke.txt` - live deployment evidence format.
  - Docs: `docs/digiflazz-buyer/persiapan.md` - IP whitelist and POST JSON.
  - Pattern: `manual_ssh.md` - Natanetwork SSH constraints and cPanel account workflow.
  - Server: `/home/adnanpay/ppob-backend/.env.production` - env exists but must not be printed.
  - Deployment: GitHub repository remote for source-of-truth deployment; Natanetwork pulls over SSH/Git after code is pushed.

  **Acceptance Criteria**:
  - [ ] Runbook includes Buyer-only Digiflazz setup and excludes Seller/API Management.
  - [ ] Runbook includes cPanel email sender setup and states user/reseller management is inside Adnanpay, not cPanel email accounts.
  - [ ] Runbook includes GitHub deployment flow: local commit/push, SSH to `adnanpay`, `git pull` or fresh clone on server, install/build, preserve `.env.production`, Passenger restart, and rollback.
  - [ ] Server-side Git setup verifies deploy key/access without exposing private key material.
  - [ ] Runbook and UI references use `Adnanpay` as store/app name.
  - [ ] Local backend/frontend lint/typecheck/test/build pass or environment-only blockers are documented.
  - [ ] Live smoke verifies `/ppob-api/health`, auth, catalog, and at least mocked/test-mode Digiflazz endpoint behavior.
  - [ ] Evidence records backup path and deployment status without secrets.

  **QA Scenarios**:
  ```
  Scenario: Production Buyer smoke
    Tool: Bash + MCP
    Steps: Run health/auth/catalog and Digiflazz mock/test-mode smoke against https://adnanpay.com/ppob-api.
    Expected: Health OK; auth OK; Buyer operations respond safely; no real secret exposed.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-8-production-smoke.txt

  Scenario: Runbook secret safety
    Tool: Bash
    Steps: Grep docs/evidence and Git-tracked files for DIGIFLAZZ_API_KEY actual assignments, SMTP passwords, service_role JWTs, private keys, and passphrases.
    Expected: No live secret values committed or pushed to GitHub.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-8-secret-scan.txt

  Scenario: GitHub pull deployment
    Tool: Bash + SSH
    Steps: Verify local branch clean after commit, push to GitHub, SSH to Natanetwork, pull latest commit, install/build with cPanel Node runtime, preserve env files, restart Passenger.
    Expected: Server HEAD matches pushed commit; `/ppob-api/health` OK; frontend serves Adnanpay branding.
    Evidence: .sisyphus/evidence/digiflazz-buyer-task-8-github-pull-deploy.txt
  ```

  **Commit**: YES | Message: `docs(digiflazz): add buyer operations runbook` | Files: [`panduan_adnanpay.md`, `readme.md`, `server_spec.md`, `.sisyphus/evidence/**`]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit per task after verification.
- Use concise conventional commit messages listed per task.
- Never commit real `.env.production`, SSH keys, MCP env files, service-role JWTs, Digiflazz API keys, Midtrans server keys, or passphrases.

## Success Criteria
- Buyer API docs are readable locally under `docs/digiflazz-buyer/`.
- Backend Buyer integration is traceable to local docs and official Buyer URLs.
- Product catalog can be seeded/synced from Buyer price list.
- Prepaid topup/status/webhook flow follows Buyer docs and is idempotent/signature-safe.
- Postpaid Buyer flow is implemented or explicitly feature-flagged with tests.
- Admin can monitor saldo/sync/webhook/status without exposing secrets.
- Email verification is enforced before reseller activation/request, with cPanel SMTP sender-only setup documented.
- Visible app/store branding is `Adnanpay`, not `BayarKu`.
- `adnanpay.com/ppob-api` smoke passes after deployment or documents exact external blocker.
- Production deployment flow uses GitHub as source of truth: local code -> GitHub push -> Natanetwork SSH pull/build/restart.
