# Adnan Payment Next Phase: Auth, RBAC, Reseller Pricing, Dashboards

## TL;DR
> **Summary**: Preserve the existing functional PPOB MVP and evolve it into a reseller-capable platform with custom JWT auth, backend-enforced RBAC, server-authoritative dynamic pricing, admin/member dashboards, and cPanel/Passenger-safe deployment gates.
> **Deliverables**:
> - Auth + account lifecycle for `pengguna`, `seller`, and `admin`
> - Backend RBAC middleware and protected API surface
> - Product/catalog + pricing rules engine with immutable order-time pricing snapshots
> - Admin dashboard for catalog, margin, reseller approval, and transaction/log monitoring
> - Member/reseller dashboard for history, reseller status, and role-aware catalog pricing
> - Deployment/security verification updates for cPanel shared hosting
> - Production placement target: `adnanpay.com` as the primary public domain served from `/home/adnanpay/public_html` on the Adnanpay Natanetwork cPanel account
> **Effort**: XL
> **Parallel**: YES - 4 waves
> **Critical Path**: Task 1 → Task 2 → Task 3 → Task 4 → Task 6 → Final Verification

## Context
### Original Request
- User asked in Indonesian: review `D:\coding\1.PPOB PAYMENT\PRD adnan payment.md` so it is ready to work on, and add anything needed into the plan without removing the originality of the plan.

### Interview Summary
- The PRD is treated as the source of truth for the next phase, not a rewrite of MVP.
- Originality preserved: Vite React, Express TypeScript, Supabase, Midtrans, Digiflazz, cPanel/Passenger deployment, no root assumptions.
- Additions are execution-readiness guardrails: explicit sequencing, dependencies, acceptance criteria, QA scenarios, auth/pricing defaults, migration/RLS strategy, and regression gates.

### Metis Review (gaps addressed)
- Auth authority must be explicit; this plan follows the PRD default: **custom backend JWT auth** using app-owned `users` table and password hashing.
- Guest checkout and public invoice status must remain available after auth is added.
- Midtrans/Digiflazz webhooks must bypass user JWT auth but retain provider signature/idempotency validation.
- Pricing must be calculated on the backend only; frontend must never submit trusted prices/margins.
- Orders must store immutable pricing snapshots because product cost and markup can change after checkout.
- RBAC must include row ownership checks, not just route-level role checks.
- cPanel/Passenger constraints prohibit PM2/systemd/root-only deployment assumptions.
- Final deployment readiness must use the Adnanpay Natanetwork MCP for server/public_html inspection and the Adnanpay Supabase MCP for database/API verification; completion requires testing until the public site and backend flows are normal.
- Execution priority update: remaining work should prioritize code writing and implementation speed first. Full end-to-end testing is deferred to the final MCP verification phase, especially through Adnanpay Natanetwork MCP for deployed/public behavior; local tests remain useful but must not block coding when failures are environment-only.
- Subagent fallback update: if a subagent is stuck, aborted, or does not respond after reasonable retry, the main agent must continue the implementation/documentation path directly instead of waiting indefinitely.

## Work Objectives
### Core Objective
Turn the existing MVP into a production-ready reseller-capable PPOB platform while preserving all current guest checkout, payment, fulfillment, invoice, audit, and rate-limit behavior.

### Deliverables
- Backend auth module with register/login/session verification, password hashing, JWT issuance, and env validation.
- RBAC middleware and protected routes for admin/member APIs.
- Supabase migrations for `users`, `products`, `pricing_rules`, reseller requests/status fields, order user linkage, and pricing snapshot columns.
- Product and pricing modules with deterministic rule precedence.
- Frontend routing/auth state and dashboard UI for admin/member/reseller use cases.
- Regression tests proving current MVP flows still pass.
- cPanel deployment/runbook updates for new env vars and verification gates.

### Definition of Done (verifiable conditions with commands)
- `cd backend && npm run lint && npm run typecheck && npm run test && npm run build` passes.
- `cd Frontend && npm run lint && npm run typecheck && npm run test && npm run build` passes.
- If local tests fail because of missing local services, host connectivity, browser/runtime environment, or other non-code environment blockers, document the exact failure and continue; final normal-flow testing must be completed later through MCP, with primary focus on Adnanpay Natanetwork public deployment behavior.
- Guest checkout, Midtrans webhook, Digiflazz callback, and `/invoice/:code` regression tests pass.
- Unauthorized users cannot access admin/member APIs; wrong roles receive `403`.
- Logged-in `pengguna` and `seller` receive different backend-calculated prices for the same product when pricing rules differ.
- Order creation ignores client-submitted price and stores server-calculated price snapshot.
- Deployment notes document cPanel Passenger startup, env keys, static frontend upload, webhook URLs, and no-root constraints.

### Must Have
- Preserve existing public API compatibility from `backend/src/app.ts:131-148` for `/api/orders`, `/api/payments`, `/api/fulfillments`, `/api/invoices`, `/health`, and `/ppob-api/*` mirrors.
- Keep current frontend invoice path behavior from `Frontend/src/App.tsx:12-25`.
- Add auth as opt-in protection for new admin/member APIs; do not place global auth middleware before existing webhook/public routes.
- Store secrets only in backend/cPanel env; never expose service role keys or JWT secrets to frontend.
- Use `SUPABASE_TABLE_PREFIX` behavior from `.env.example:5-9` consistently for dev/demo tables.

### Must NOT Have
- No rewrite of existing MVP modules unless needed for additive integration.
- No PM2/systemd/root/package-manager server changes.
- No trusted frontend pricing or role checks as security source.
- No webhook JWT requirement for provider callbacks.
- No separate second identity system beyond the chosen custom JWT users table.

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after using existing Jest/Supertest backend and Vitest/Testing Library frontend.
- QA policy: Every task has agent-executed happy and failure scenarios.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`.

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. This plan has architecture-heavy dependencies, so waves are intentionally smaller where schema/auth must precede UI.

Wave 1: Task 1 schema/contracts, Task 2 auth/env foundation
Wave 2: Task 3 RBAC, Task 4 catalog/pricing engine, Task 5 order integration/regression
Wave 3: Task 6 frontend auth/routing/member dashboard, Task 7 admin dashboard
Wave 4: Task 8 deployment/runbook/security gates

### Dependency Matrix (full, all tasks)
- Task 1 blocks Tasks 2, 3, 4, 5, 6, 7.
- Task 2 blocks Tasks 3, 6, 7.
- Task 3 blocks Tasks 6, 7.
- Task 4 blocks Tasks 5, 6, 7.
- Task 5 blocks final verification and deployment readiness.
- Tasks 6 and 7 can run in parallel after Tasks 2-4.
- Task 8 can start after Task 2 env decisions and must finish after Tasks 5-7.

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 2 tasks → implementation, security
- Wave 2 → 3 tasks → implementation, security, testing
- Wave 3 → 2 tasks → visual-engineering, implementation
- Wave 4 → 1 task → doc-writer/testing

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Add Supabase schema for accounts, catalog, pricing, and order snapshots

  **What to do**: Create migrations for app-owned `users`, `products`, `pricing_rules`, reseller status/request metadata, and order pricing snapshot fields. Use custom JWT identity per PRD: `users.id` is app UUID, `email` unique, `password_hash`, `role` enum-compatible text constrained to `admin|seller|pengguna`, `is_reseller_active`, timestamps. Add product uniqueness on `sku_digiflazz`. Add pricing rule precedence fields: `scope_type` (`global|category|product`), nullable `product_id`, nullable `category`, `role_type`, `markup_fixed`, `markup_percentage`, `priority`, `is_active`. Add order snapshot fields: `user_id` nullable, `base_price_snapshot`, `markup_snapshot`, `role_price_snapshot`, `pricing_rule_id_snapshot`. Add RLS policies consistent with backend service-role access and future user ownership checks.
  **Must NOT do**: Do not remove or rename existing transactional tables. Do not break `SUPABASE_TABLE_PREFIX=demo_` development isolation.

  **Recommended Agent Profile**:
  - Category: `implementation` - Reason: schema + migration work with app integration impact.
  - Skills: [`supabase`, `supabase-postgres-best-practices`] - Needed for migration/RLS/index correctness.
  - Omitted: [`frontend-ui-ux`] - No UI work.

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: Tasks 2,3,4,5,6,7 | Blocked By: none

  **References** (executor has NO interview context - be exhaustive):
  - PRD: `PRD adnan payment.md:91-105` - proposed tables and schema intent.
  - Existing schema: `supabase/migrations/20260422010406_transactional_schema_rls_idempotency_task4_v2.sql` - transactional baseline to extend.
  - Demo isolation: `supabase/migrations/20260514021500_demo_tables_for_development_mode.sql` - prefix/demo behavior.
  - Env prefix: `.env.example:5-9` - `SUPABASE_TABLE_PREFIX` contract.

  **Acceptance Criteria** (agent-executable only):
  - [ ] Migration applies cleanly to local/project Supabase branch or documented SQL dry-run environment.
  - [ ] Constraints reject invalid roles and negative effective sell prices.
  - [ ] Indexes exist for `users.email`, `products.sku_digiflazz`, pricing lookup columns, and `orders.user_id`.
  - [ ] Existing transactional tests still pass after schema extension.

  **QA Scenarios** (MANDATORY - task incomplete without these):
  ```
  Scenario: Migration creates pricing-ready schema
    Tool: Bash / Supabase SQL
    Steps: Apply migration; query information_schema for users/products/pricing_rules and new orders snapshot columns.
    Expected: All columns, constraints, and indexes exist; no existing table is dropped.
    Evidence: .sisyphus/evidence/task-1-schema-happy.txt

  Scenario: Invalid role and invalid pricing rejected
    Tool: Bash / Supabase SQL
    Steps: Attempt insert user role `owner`; attempt pricing rule producing negative effective price.
    Expected: Both inserts fail with constraint errors; valid `pengguna`, `seller`, `admin` rows succeed.
    Evidence: .sisyphus/evidence/task-1-schema-error.txt
  ```

  **Commit**: YES | Message: `feat(db): add reseller auth pricing schema` | Files: [`supabase/migrations/*`]

- [x] 2. Implement backend auth module and environment validation

  **What to do**: Add backend dependencies for password hashing and JWT. Implement `auth` module with register, login, get current session/user, password hashing, JWT issuance/verification, token TTL, and input validation. Add env keys to `.env.example`: `JWT_SECRET`, `JWT_EXPIRES_IN`, `PASSWORD_HASH_COST`, `CORS_ALLOWED_ORIGINS`, `ADMIN_BOOTSTRAP_EMAIL`, `ADMIN_BOOTSTRAP_PASSWORD` or document safer one-time admin seed path. Register `/api/auth/register`, `/api/auth/login`, `/api/auth/me` under both root and `/ppob-api` base paths via existing `mountRoutes` pattern.
  **Must NOT do**: Do not expose JWT secret or service role key to frontend. Do not require auth globally.

  **Recommended Agent Profile**:
  - Category: `security` - Reason: credential/session handling.
  - Skills: [] - Existing stack is Express/Jest.
  - Omitted: [`supabase`] - Only needed if executor changes DB policies beyond Task 1.

  **Parallelization**: Can Parallel: PARTIAL | Wave 1 | Blocks: Tasks 3,6,7 | Blocked By: Task 1 for final persistence

  **References**:
  - Backend route mounting: `backend/src/app.ts:131-148` - preserve dual base path route registration.
  - Backend env/deps: `backend/package.json:19-35` - add auth dependencies and types.
  - Current env surface: `.env.example:1-21` - extend safely.
  - PRD auth requirement: `PRD adnan payment.md:24-29`, `PRD adnan payment.md:170-178`.

  **Acceptance Criteria**:
  - [ ] `POST /api/auth/register` creates `pengguna` by default and never accepts client-supplied `admin` role.
  - [ ] `POST /api/auth/login` returns JWT for valid credentials and generic `401` for invalid credentials.
  - [ ] `GET /api/auth/me` returns current user with role when token is valid and `401` when missing/invalid.
  - [ ] Backend lint/typecheck/test/build commands pass.

  **QA Scenarios**:
  ```
  Scenario: User registers and logs in
    Tool: Bash / Supertest
    Steps: Register `buyer@example.test`; login with password; call `/api/auth/me` using Bearer token.
    Expected: User role is `pengguna`; password hash is not returned; token authenticates.
    Evidence: .sisyphus/evidence/task-2-auth-happy.txt

  Scenario: Role escalation rejected
    Tool: Bash / Supertest
    Steps: Register with request body including `role: admin`; login; inspect `/api/auth/me`.
    Expected: Role remains `pengguna`; no admin privileges granted.
    Evidence: .sisyphus/evidence/task-2-auth-error.txt
  ```

  **Commit**: YES | Message: `feat(auth): add jwt account module` | Files: [`backend/src/modules/auth/*`, `backend/src/app.ts`, `backend/package.json`, `.env.example`]

- [x] 3. Add backend RBAC middleware and protected account/admin APIs

  **What to do**: Implement authentication middleware and role guard helpers. Add account APIs for reseller request/status. Add admin APIs to list users, approve/demote/suspend sellers, and inspect basic user status. Enforce ownership: regular users can only read their own account/history; sellers only their own seller data; admins can manage all. Keep provider webhooks and invoice lookup public.
  **Must NOT do**: Do not protect `/api/payments/*` webhook routes with JWT. Do not rely on frontend hiding links for security.

  **Recommended Agent Profile**:
  - Category: `security` - Reason: authorization boundaries.
  - Skills: [] - Uses project middleware/test patterns.
  - Omitted: [`frontend-ui-ux`] - Backend-only.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Tasks 6,7 | Blocked By: Tasks 1,2

  **References**:
  - Existing public route mount: `backend/src/app.ts:131-148`.
  - Rate-limit/audit pattern: `backend/src/app.ts:122-129`.
  - PRD RBAC/user flows: `PRD adnan payment.md:25-37`.
  - Oracle guardrail: webhooks public but signed; backend RBAC authoritative.

  **Acceptance Criteria**:
  - [ ] Missing token returns `401`; wrong role returns `403`; valid admin succeeds.
  - [ ] Seller approval changes `role` to `seller` and `is_reseller_active=true` only through admin API.
  - [ ] Existing guest order, payment webhook, fulfillment callback, and invoice APIs remain callable without JWT where previously public.

  **QA Scenarios**:
  ```
  Scenario: Admin approves reseller request
    Tool: Bash / Supertest
    Steps: Create pengguna; submit reseller request; login admin; approve request; fetch user status.
    Expected: Role becomes `seller`, reseller active true, audit/status record exists if implemented.
    Evidence: .sisyphus/evidence/task-3-rbac-happy.txt

  Scenario: Pengguna blocked from admin API
    Tool: Bash / Supertest
    Steps: Login regular user; call admin user-management endpoint.
    Expected: HTTP 403 with stable error body; no data leakage.
    Evidence: .sisyphus/evidence/task-3-rbac-error.txt
  ```

  **Commit**: YES | Message: `feat(auth): enforce rbac for accounts` | Files: [`backend/src/modules/auth/*`, `backend/src/modules/account/*`, `backend/src/modules/admin/*`, `backend/src/app.ts`]

- [x] 4. Implement product catalog and dynamic pricing engine

  **What to do**: Add backend product/pricing modules. Support admin-managed products and pricing rules. Implement deterministic precedence: product-specific role rule > category role rule > global role rule > default zero markup. Support fixed and percentage markup; when both exist, apply fixed first then percentage unless tests/documentation choose otherwise. Round final prices to nearest Rp1 by default unless existing business docs specify another rounding. Return role-aware catalog prices from backend; ignore client-submitted price values.
  **Must NOT do**: Do not call Digiflazz directly from frontend. Do not calculate trusted prices in React.

  **Recommended Agent Profile**:
  - Category: `implementation` - Reason: service/repository/API + deterministic tests.
  - Skills: [] - Project-local backend module work.
  - Omitted: [`frontend-ui-ux`] - No UI work.

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: Tasks 5,6,7 | Blocked By: Task 1

  **References**:
  - PRD pricing/catalog: `PRD adnan payment.md:27-30`, `PRD adnan payment.md:101-105`.
  - Existing backend modular pattern: `backend/src/app.ts:3-22`, `backend/src/app.ts:131-148`.
  - Digiflazz config baseline: `backend/src/app.ts:106-111`.

  **Acceptance Criteria**:
  - [ ] Same product returns higher/equal `pengguna` price than `seller` price when configured that way.
  - [ ] Pricing precedence is covered by tests for product/category/global/default.
  - [ ] Inactive products are excluded from public catalog and cannot be ordered.
  - [ ] Backend rejects or ignores client-submitted final price.

  **QA Scenarios**:
  ```
  Scenario: Seller sees lower configured role price
    Tool: Bash / Supertest
    Steps: Seed product base price 10000; set pengguna markup 2000, seller markup 500; call catalog as each role.
    Expected: pengguna price 12000, seller price 10500; source rule IDs returned or traceable.
    Evidence: .sisyphus/evidence/task-4-pricing-happy.txt

  Scenario: Product-specific rule beats global rule
    Tool: Bash / Supertest
    Steps: Create global seller markup 1000 and product seller markup 300; request price for product.
    Expected: Final price uses product markup 300, not global 1000.
    Evidence: .sisyphus/evidence/task-4-pricing-error.txt
  ```

  **Commit**: YES | Message: `feat(pricing): add catalog margin engine` | Files: [`backend/src/modules/product/*`, `backend/src/modules/pricing/*`, `backend/src/app.ts`]

- [x] 5. Integrate auth/pricing snapshots into order flow without breaking guest checkout

  **What to do**: Update order creation so authenticated users attach `user_id` and role-derived price snapshots. Guest checkout still works with `pengguna` pricing rules or default public pricing. Server recalculates product/base/markup/final price at order time and stores snapshot fields. Preserve payment and fulfillment transitions, webhook idempotency, and invoice status responses. Add regression tests around existing MVP flows.
  **Must NOT do**: Do not require login for current public checkout. Do not let frontend decide `total_price`.

  **Recommended Agent Profile**:
  - Category: `testing` - Reason: high regression risk across order/payment/fulfillment.
  - Skills: [] - Uses existing Jest/Supertest.
  - Omitted: [`frontend-ui-ux`] - Backend integration focus.

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: final verification | Blocked By: Tasks 1,4; Task 2 for authenticated path

  **References**:
  - Existing route mount: `backend/src/app.ts:131-143`.
  - PRD validated MVP features: `PRD adnan payment.md:16-23`.
  - PRD flow: `PRD adnan payment.md:32-37`.
  - Verification gates: `PRD adnan payment.md:208-215`.

  **Acceptance Criteria**:
  - [ ] Guest order tests still pass.
  - [ ] Authenticated seller order stores seller price snapshot.
  - [ ] Client-supplied `total_price` mismatch does not affect charged/stored backend price.
  - [ ] Payment/fulfillment callbacks remain idempotent.

  **QA Scenarios**:
  ```
  Scenario: Guest checkout regression passes
    Tool: Bash / Supertest
    Steps: Create guest order, initialize payment, simulate paid webhook, simulate fulfillment callback, fetch invoice.
    Expected: Same status progression as MVP; no JWT required.
    Evidence: .sisyphus/evidence/task-5-guest-regression.txt

  Scenario: Client price tampering ignored
    Tool: Bash / Supertest
    Steps: Auth seller submits order with product and fake low `total_price: 1`.
    Expected: Stored total equals backend pricing engine result; evidence includes snapshot fields.
    Evidence: .sisyphus/evidence/task-5-price-tamper.txt
  ```

  **Commit**: YES | Message: `feat(order): snapshot server pricing` | Files: [`backend/src/modules/order/*`, `backend/src/modules/payment/*`, backend tests]

- [x] 6. Add frontend auth routing and member/reseller dashboard

  **What to do**: Introduce client-side routing/state while preserving current landing and invoice behavior. Add login/register forms, auth token storage strategy, `/dashboard` member page, reseller request/status UI, transaction history, and role-aware catalog display using backend prices. Keep `/invoice/:code` route behavior intact from current path parser or replace with router equivalent that preserves URL compatibility.
  **Must NOT do**: Do not store service role key or trusted pricing logic in frontend. Do not remove existing landing components.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: UI routing/forms/dashboard with user-facing states.
  - Skills: [`frontend-ui-ux`] - Needed for cohesive dashboard UX.
  - Omitted: [`supabase`] - Frontend should use backend API, not direct service role DB access.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: final verification | Blocked By: Tasks 2,3,4

  **References**:
  - Current app routing: `Frontend/src/App.tsx:12-25`.
  - Current page composition: `Frontend/src/App.tsx:21-39`.
  - Frontend scripts/deps: `Frontend/package.json:6-18`.
  - PRD user flows: `PRD adnan payment.md:32-36`.

  **Acceptance Criteria**:
  - [ ] `/invoice/:code` still renders invoice status.
  - [ ] User can register, login, see `/dashboard`, logout, and see unauthorized redirect/state.
  - [ ] Reseller request status is displayed from backend.
  - [ ] Catalog prices come from backend API responses.

  **QA Scenarios**:
  ```
  Scenario: Member login reaches dashboard
    Tool: Playwright
    Steps: Open app; click Sign In/Daftar; register `member@example.test`; login; navigate to `/dashboard`.
    Expected: Dashboard shows email/role `pengguna`, transaction history empty state, and reseller request action.
    Evidence: .sisyphus/evidence/task-6-member-dashboard.png

  Scenario: Protected dashboard rejects anonymous user
    Tool: Playwright
    Steps: Clear storage; open `/dashboard` directly.
    Expected: Login prompt or redirect appears; no private account data rendered.
    Evidence: .sisyphus/evidence/task-6-dashboard-unauth.png
  ```

  **Commit**: YES | Message: `feat(frontend): add member auth dashboard` | Files: [`Frontend/src/*`, frontend tests]

- [x] 7. Add admin dashboard for products, margins, users, and operational logs

  **What to do**: Add `/admin` UI restricted to admin role. Provide product list/create/edit/toggle active, pricing rule management for global/category/product role rules, reseller approval/demotion, and read-only transaction/webhook/log monitoring. UI must call backend admin APIs only. Include clear forbidden state for non-admin users.
  **Must NOT do**: Do not expose admin controls based only on frontend role checks; backend must enforce every action.

  **Recommended Agent Profile**:
  - Category: `visual-engineering` - Reason: complex management UI.
  - Skills: [`frontend-ui-ux`] - Needed for usable admin workflows.
  - Omitted: [] - Backend admin APIs from Tasks 3/4 are dependencies.

  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: final verification | Blocked By: Tasks 2,3,4

  **References**:
  - PRD admin requirements: `PRD adnan payment.md:28-30`, `PRD adnan payment.md:37`.
  - Current frontend baseline: `Frontend/src/App.tsx:1-10` components to preserve.
  - Backend RBAC/admin APIs from Task 3.
  - Pricing APIs from Task 4.

  **Acceptance Criteria**:
  - [ ] Admin can create/update/toggle product and pricing rules through UI.
  - [ ] Admin can approve a reseller request through UI and see status update.
  - [ ] Non-admin visiting `/admin` receives forbidden/redirect state.
  - [ ] Frontend tests cover at least render, forbidden state, and one successful admin action with mocked API.

  **QA Scenarios**:
  ```
  Scenario: Admin updates seller margin
    Tool: Playwright
    Steps: Login as admin; open `/admin/pricing`; set seller product markup to 500; save; refresh.
    Expected: Rule persists and catalog API reflects updated seller price.
    Evidence: .sisyphus/evidence/task-7-admin-pricing.png

  Scenario: Pengguna blocked from admin page
    Tool: Playwright
    Steps: Login as regular pengguna; open `/admin`.
    Expected: Forbidden or redirect screen; no product/user management controls visible.
    Evidence: .sisyphus/evidence/task-7-admin-forbidden.png
  ```

  **Commit**: YES | Message: `feat(frontend): add admin management dashboard` | Files: [`Frontend/src/*`, frontend tests]

- [x] 8. Update deployment, security, and verification runbooks for cPanel production readiness

  **What to do**: Update `readme.md` and/or `server_spec.md` with final production-readiness instructions. Document backend startup via `dist/index.js`, cPanel Node.js App env keys, static frontend build/upload, SPA fallback, webhook callback URLs, HTTPS requirement, secret checklist, admin bootstrap procedure, rollback steps, and verification commands. Add the final production target: domain `adnanpay.com` must be the primary public site, with public frontend placement under `/home/adnanpay/public_html` on the Adnanpay Natanetwork cPanel account. Use Adnanpay Natanetwork MCP for user-level server/public_html checks and Adnanpay Supabase MCP for database/API checks. Add tests/scripts only if already supported; avoid root-only commands.
  **Must NOT do**: Do not attempt root operations, system package updates, PM2, systemd, or destructive server changes.

  **Recommended Agent Profile**:
  - Category: `doc-writer` - Reason: deployment and verification documentation.
  - Skills: [`adnanpay-natanetwork`, `supabase`] - Needed for cPanel/user-level constraints, `adnanpay.com` public placement, and Supabase API/database verification.
  - Omitted: [`supabase-postgres-best-practices`] - Schema design already handled in Task 1; Task 8 only verifies applied state and connectivity.

  **Parallelization**: Can Parallel: PARTIAL | Wave 4 | Blocks: final verification | Blocked By: Tasks 2,5,6,7 for final env/routes

  **References**:
  - PRD deployment architecture: `PRD adnan payment.md:50-55`.
  - cPanel constraints: `PRD adnan payment.md:181-188`.
  - Verification gates: `PRD adnan payment.md:190-215`.
  - Backend start script: `backend/package.json:6-13`.
  - Frontend build script: `Frontend/package.json:6-12`.

  **Acceptance Criteria**:
  - [ ] Runbook lists every required env key and clearly marks frontend-safe vs backend-secret.
  - [ ] Verification commands include backend and frontend lint/typecheck/test/build.
  - [ ] cPanel deployment steps avoid root/PM2/systemd assumptions.
  - [ ] Webhook URLs and HTTPS/SSL checks are documented.
  - [ ] `adnanpay.com` is documented as the final public primary domain, with frontend/public assets placed under `/home/adnanpay/public_html` and backend/API routing documented for cPanel/Passenger.
  - [ ] Adnanpay Natanetwork MCP checks verify SSH/account-level visibility of `/home/adnanpay/public_html`, domain/public path assumptions, and available app logs without sudo/root.
  - [ ] Adnanpay Supabase MCP checks verify migrations/API reachability/RLS-security posture relevant to the completed tasks.
  - [ ] Final smoke checklist requires testing until normal: public homepage, `/invoice/:code`, auth register/login/me, dashboard/admin protected states, catalog pricing, order/payment/fulfillment webhook-safe flows.
  - [ ] Testing strategy explicitly prioritizes implementation first, then final MCP-based smoke testing on Adnanpay Natanetwork; environment-only local failures are documented as blockers instead of stopping code/documentation progress.
  - [ ] Runbook states that if a subagent becomes stuck/aborted/non-responsive, the main agent proceeds directly with the remaining implementation/docs/evidence work.

  **QA Scenarios**:
  ```
  Scenario: Local production build verification
    Tool: Bash
    Steps: Run backend build/start smoke and frontend build according to runbook.
    Expected: Commands match documented steps and complete without missing env documentation.
    Evidence: .sisyphus/evidence/task-8-runbook-build.txt

  Scenario: Secret exposure checklist
    Tool: Bash
    Steps: Search built frontend artifacts for `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `MIDTRANS_SERVER_KEY`, `DIGIFLAZZ_API_KEY` literal env names/values where safe.
    Expected: No backend secrets appear in frontend build artifacts.
    Evidence: .sisyphus/evidence/task-8-secret-scan.txt

  Scenario: adnanpay.com public placement and MCP smoke
    Tool: adnanpay-natanetwork MCP + adnanpay-supabase MCP + Bash/curl
    Steps: After implementation/docs are complete, verify `/home/adnanpay/public_html` visibility, document final `adnanpay.com` placement, verify Supabase project API/database state, then smoke public homepage/API flows until normal. If local tests failed from environment-only causes, re-run equivalent verification through MCP here.
    Expected: `adnanpay.com` deployment path and Supabase connectivity are documented; implementation was not blocked by local environment-only failures; any MCP blocker is recorded with exact failing command/log and remediation.
    Evidence: .sisyphus/evidence/task-8-adnanpay-domain-smoke.txt
  ```

  **Commit**: YES | Message: `docs(deploy): add cpanel verification gates` | Files: [`readme.md`, deployment docs, `.env.example`, `.sisyphus/evidence/*` as applicable]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright for frontend/dashboard flows)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit each task separately after its tests/evidence pass.
- Use conventional commits listed in each task.
- Never commit `.env`, production secrets, cPanel credentials, or real provider keys.
- If hooks/tests modify files, inspect and commit only relevant changes.

## Success Criteria
- Original PRD direction remains intact: MVP continuation into auth/RBAC/reseller pricing/dashboard platform.
- All additions are execution-readiness improvements, not product-scope replacement.
- Current MVP guest checkout/payment/fulfillment/invoice remains functional.
- New admin/seller/member capabilities are backend-authoritative and covered by tests.
- Deployment remains compatible with Adnanpay cPanel shared hosting constraints.
