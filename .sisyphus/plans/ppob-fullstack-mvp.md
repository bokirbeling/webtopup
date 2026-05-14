# PPOB Fullstack MVP (Node + Supabase + Midtrans + Digiflazz)

## ABSOLUTE EXECUTION RULE (MUTLAK)
- **NON-NEGOTIABLE**: `gpt-5.1-codex-mini` is strictly forbidden for this plan.
- Any attempt/error indicating `gpt-5.1-codex-mini` selection is an immediate policy violation.
- Model routing rule: **easy/low-risk tasks use MiniMax**, complex/high-risk tasks use **`gpt-5.3-codex`**.
- Mandatory runtime fallback when mini error appears: **`gpt-5.3-codex`**.

### Runtime Fallback Procedure (MANDATORY)
1. If delegation fails with `gpt-5.1-codex-mini` unsupported error, **stop immediately** (do not continue retries on mini).
2. Reuse the same task session (`session_id`) with prompt prefix: `FALLBACK-ENFORCED: gpt-5.3-codex only`.
3. If second attempt still resolves to mini, mark task status as **blocked-by-runtime-model** and do not claim progress.
4. Continue only after runtime confirms non-mini model execution.

## TL;DR
> **Summary**: Build a localhost-first fullstack PPOB MVP using the existing `Frontend/` as UI baseline, with a new Node.js + Express backend, Supabase-backed transactional data model, Midtrans payment flow, and Digiflazz fulfillment (with dev-only mock fallback).
> **Deliverables**:
> - End-to-end guest checkout flow (catalog → order → payment callback → fulfillment callback → status page)
> - Secure and idempotent webhook pipeline (Midtrans + Digiflazz)
> - Supabase schema + RLS + migration baseline
> - Automated verification (lint/typecheck/build/tests + Playwright e2e)
> **Effort**: XL
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 1 → Task 2 → Task 4 → Task 7 → Task 10

## Context
### Original Request
- User request (Indonesian): build website based on `readme.md`, align with `Frontend`, target domain `shop.hanzserver.online` (deploy later), run on localhost first.
- User clarified scope: **fullstack**, backend **Node.js + Express**, **Supabase full stack**, gateway **Midtrans**, MVP **core transaction first**, user model **guest checkout first**.

### Interview Summary
- Existing repository currently contains only frontend app and planning docs.
- Frontend baseline is `Frontend/` React + Vite + Tailwind, single-page composed from section components.
- Testing decision: add test infra + tests-after strategy.
- Digiflazz dev behavior: enable mock fallback on localhost when credentials invalid/missing.
- `.env` already exists locally; add `.env.example` for safe template sharing.
- `Frontend/webhook.md` is legacy webhook sample; treat as reference only, not source of truth for live contract.

### Metis Review (gaps addressed)
- Added hard guardrails for scope creep: no admin panel/auth-heavy features in MVP.
- Added mandatory webhook idempotency and transition-monotonicity acceptance checks.
- Added conflict policy requirement for Midtrans vs Digiflazz asynchronous callbacks.
- Added explicit failure scenarios: invalid signature, duplicate webhook, out-of-order events, timeout/retry.
- Added secret hygiene requirements (`.env` local-only, `.env.example`, no legacy secret reuse).

## Work Objectives
### Core Objective
Deliver a decision-complete implementation path for a production-structured localhost MVP that can process guest orders end-to-end with reliable status transitions and secure webhook handling.

### Deliverables
- Backend service scaffold (`backend/`) with Express APIs and provider adapters.
- Supabase schema, migrations, and RLS policies for order/payment/fulfillment/event tables.
- Frontend integration to real backend APIs (replace static transaction flow).
- Midtrans payment integration + webhook verification + idempotency.
- Digiflazz transaction integration + callback handling + dev mock fallback.
- Test suites (frontend + backend) and Playwright e2e smoke.
- CI workflow for lint/typecheck/test/build gates.

### Definition of Done (verifiable conditions with commands)
- `npm --prefix Frontend run lint` exits 0.
- `npm --prefix Frontend run typecheck` exits 0.
- `npm --prefix Frontend run build` exits 0.
- `npm --prefix backend run lint` exits 0.
- `npm --prefix backend run typecheck` exits 0.
- `npm --prefix backend test` exits 0 including idempotency/state-transition tests.
- `npm --prefix Frontend test` exits 0.
- `npm --prefix Frontend run test:e2e` exits 0 for guest checkout + status flow.

### Must Have
- Canonical order state machine enforced server-side with monotonic transitions.
- Canonical default status map: `created -> pending_payment -> paid -> fulfillment_pending -> success | failed | expired`.
- Conflict policy default: Midtrans is authoritative for payment state; Digiflazz updates fulfillment state only after `paid`; out-of-order fulfillment callbacks are stored and reconciled, not applied as paid.
- Signed webhook validation for Midtrans and Digiflazz callback guard.
- Idempotent webhook processing via persisted event keys + dedupe constraints.
- Guest invoice lookup endpoint and UI status check flow.
- Localhost-only Digiflazz mock fallback when credentials invalid/missing.

### Must NOT Have (guardrails, AI slop patterns, scope boundaries)
- No full admin panel CRUD in MVP.
- No mandatory login requirement for guest checkout MVP.
- No manual-only validation claims (all criteria agent-executable).
- No reuse of legacy secrets in `Frontend/webhook.md`.
- No production deployment steps before localhost verification passes.

## Verification Strategy
> ZERO HUMAN INTERVENTION — all verification is agent-executed.
- Test decision: **tests-after** with new infra (Vitest for frontend/unit utility, Jest+Supertest for backend API/integration).
- QA policy: Every task includes executable happy + failure/edge scenario.
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. <3 per wave (except final) = under-splitting.

Wave 1 (foundation): Tasks 1-6
- Repo/workspace scaffolding, environment policy, backend skeleton, Supabase schema baseline, testing baseline, CI baseline.

Wave 2 (transaction core): Tasks 7-12
- Order API/state machine, Midtrans integration/webhook, Digiflazz integration/callback/mock fallback, frontend API wiring, invoice/status flow, security hardening.

Wave 3 (stabilization): Tasks 13-15
- Cross-provider reconciliation, end-to-end regression hardening, docs/runbook completion.

### Dependency Matrix (full, all tasks)
| Task | Depends On | Blocks |
|---|---|---|
| 1 | - | 2,3,5 |
| 2 | 1 | 4,7,9,11 |
| 3 | 1 | 4,5,13 |
| 4 | 2,3 | 7,8,9,11 |
| 5 | 1,3 | 14 |
| 6 | 1,5 | 15 |
| 7 | 2,4 | 8,10,13 |
| 8 | 4,7 | 10,13 |
| 9 | 4,7 | 10,13 |
| 10 | 7,8,9 | 12,14 |
| 11 | 2,4 | 12,14 |
| 12 | 10,11 | 14,15 |
| 13 | 7,8,9 | 14,15 |
| 14 | 5,10,11,12,13 | 15 |
| 15 | 6,12,13,14 | Final Wave |

### Agent Dispatch Summary (wave → task count → categories)
- Wave 1 → 6 tasks → `implementation`, `testing`, `security`, `doc-writer`
- Wave 2 → 6 tasks → `implementation`, `security`, `testing`, `visual-engineering`
- Wave 3 → 3 tasks → `implementation`, `testing`, `doc-writer`

### Agent Model Policy (Execution Constraint)
- **Hard ban**: `gpt-5.1-codex-mini` MUST NOT be used for any task in this plan.
- **Default for easy/low-risk tasks**: MiniMax-compatible model.
- **Mandatory for complex/high-risk tasks**: `gpt-5.3-codex` (Tasks 8, 9, 12, 13, 14, F1-F4).
- **Dispatch gate**: Before each delegation, verify the selected model is not `gpt-5.1-codex-mini`; if uncertain, force `gpt-5.3-codex`.
- **Failure policy**: If runtime returns any `gpt-5.1-codex-mini` compatibility error, treat as policy violation and immediately rerun on `gpt-5.3-codex` (no retries on mini).
- **Completion guard**: A task cannot be marked done if execution logs indicate `gpt-5.1-codex-mini` was selected.

## TODOs
> Implementation + Test = ONE task. Never separate.
> EVERY task MUST have: Agent Profile + Parallelization + QA Scenarios.

- [x] 1. Scaffold backend workspace + `.env.example`
  **What to do**: Create `backend/` Node+TS workspace and add `.env.example` placeholders for Supabase, Midtrans, Digiflazz, app ports.
  **Must NOT do**: Never copy real values from `.env` or `Frontend/webhook.md`.
  **Recommended Agent Profile**: Category `implementation`; Skills [`supabase`]; Omitted [`impeccable-style`].
  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 2,3,5 | Blocked By: none
  **References**: `readme.md`; `Frontend/package.json`; `Frontend/webhook.md`; `https://supabase.com/docs/guides/security/product-security`
  **Acceptance Criteria**: `.env.example` exists with required keys; backend folder exists; secret scan finds no leaked real keys.
  **QA Scenarios**:
  ```
  Scenario: Env template valid
    Tool: Bash
    Steps: Verify placeholder keys in .env.example
    Expected: All required keys present, no real secret values
    Evidence: .sisyphus/evidence/task-1-env-template.txt

  Scenario: Legacy secret not reused
    Tool: Bash
    Steps: Search tracked files for legacy webhook secret values
    Expected: No matches
    Evidence: .sisyphus/evidence/task-1-secret-scan-error.txt
  ```
  **Commit**: YES | Message: `chore(repo): scaffold backend and env template` | Files: `.env.example`, `backend/**`

- [x] 2. Bootstrap Express app and config validation
  **What to do**: Add Express app entry, strict env validator, and `/health` endpoint.
  **Must NOT do**: No business endpoints yet.
  **Recommended Agent Profile**: Category `implementation`; Skills []; Omitted [`supabase-postgres-best-practices`].
  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,7,9,11 | Blocked By: 1
  **References**: `Frontend/package.json`; `Frontend/vite.config.ts`; `https://expressjs.com/en/guide/routing.html`
  **Acceptance Criteria**: lint/typecheck pass in backend; `/health` returns `status=ok`.
  **QA Scenarios**:
  ```
  Scenario: Health endpoint works
    Tool: Bash
    Steps: Start backend and GET /health
    Expected: HTTP 200 with JSON status ok
    Evidence: .sisyphus/evidence/task-2-health.txt

  Scenario: Missing env fails fast
    Tool: Bash
    Steps: Run backend with required key removed
    Expected: Startup fails with clear config error
    Evidence: .sisyphus/evidence/task-2-env-error.txt
  ```
  **Commit**: YES | Message: `feat(backend): express bootstrap and env validation` | Files: `backend/src/**`

- [x] 3. Initialize Supabase scaffold and migration workflow
  **What to do**: Add `supabase/` scaffold and migration command flow.
  **Must NOT do**: No destructive reset-first workflows.
  **Recommended Agent Profile**: Category `implementation`; Skills [`supabase`, `supabase-postgres-best-practices`]; Omitted [].
  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 4,5,13 | Blocked By: 1
  **References**: `readme.md`; `https://supabase.com/docs/reference/cli/introduction`; `https://supabase.com/docs/guides/database/overview`
  **Acceptance Criteria**: Supabase CLI works; scaffold files exist; migration command documented.
  **QA Scenarios**:
  ```
  Scenario: Supabase scaffold ready
    Tool: Bash
    Steps: Run supabase help/status commands and list scaffold files
    Expected: Commands succeed, files exist
    Evidence: .sisyphus/evidence/task-3-supabase-scaffold.txt

  Scenario: Missing Supabase env blocked
    Tool: Bash
    Steps: Run DB command without required env
    Expected: Clear failure, no side effects
    Evidence: .sisyphus/evidence/task-3-supabase-env-error.txt
  ```
  **Commit**: YES | Message: `chore(db): init supabase migration workflow` | Files: `supabase/**`, backend config

- [x] 4. Create transactional schema + RLS + idempotency constraints
  **What to do**: Add migrations for orders/payments/fulfillment/webhook_events/status_history with unique dedupe constraints and RLS policy restrictions.
  **Must NOT do**: No anon/authenticated writes to critical tables.
  **Recommended Agent Profile**: Category `implementation`; Skills [`supabase`, `supabase-postgres-best-practices`]; Omitted [].
  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: 7,8,9,11 | Blocked By: 2,3
  **References**: `readme.md`; `https://supabase.com/docs/guides/auth/row-level-security`; `https://www.postgresql.org/docs/current/ddl-constraints.html`
  **Acceptance Criteria**: migrations apply; dedupe constraints exist; RLS deny checks pass.
  **QA Scenarios**:
  ```
  Scenario: RLS deny write
    Tool: Bash
    Steps: Attempt INSERT using non-service role
    Expected: denied by policy
    Evidence: .sisyphus/evidence/task-4-rls-deny.txt

  Scenario: Duplicate event blocked
    Tool: Bash
    Steps: Insert same provider event key twice
    Expected: second insert rejected/no-op
    Evidence: .sisyphus/evidence/task-4-idempotency-db.txt
  ```
  **Commit**: YES | Message: `feat(db): transaction schema rls idempotency` | Files: `supabase/migrations/**`

- [x] 5. Add test infrastructure (backend + frontend)
  **What to do**: Configure Jest+Supertest (backend), Vitest+RTL (frontend), and base smoke tests.
  **Must NOT do**: No flaky live-network tests.
  **Recommended Agent Profile**: Category `testing`; Skills []; Omitted [`supabase`].
  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 14 | Blocked By: 1,3
  **References**: `Frontend/package.json`; `Frontend/src/main.tsx`; `https://vitest.dev/guide/`; `https://jestjs.io/docs/getting-started`
  **Acceptance Criteria**: `npm --prefix backend test` and `npm --prefix Frontend test` pass.
  **QA Scenarios**:
  ```
  Scenario: Frontend tests run
    Tool: Bash
    Steps: Run npm --prefix Frontend test
    Expected: exit 0
    Evidence: .sisyphus/evidence/task-5-frontend-test.txt

  Scenario: Backend tests run
    Tool: Bash
    Steps: Run npm --prefix backend test
    Expected: exit 0
    Evidence: .sisyphus/evidence/task-5-backend-test.txt
  ```
  **Commit**: YES | Message: `test(setup): configure frontend backend test frameworks` | Files: test configs and test dirs

- [x] 6. Add CI workflow quality gates
  **What to do**: Add CI workflow for frontend/backend lint, typecheck, test, build.
  **Must NOT do**: No optional skip for core branches.
  **Recommended Agent Profile**: Category `testing`; Skills []; Omitted [`supabase-postgres-best-practices`].
  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: 15 | Blocked By: 1,5
  **References**: `Frontend/package.json`; backend package scripts; `https://docs.github.com/actions`
  **Acceptance Criteria**: workflow exists and fails on failing tests.
  **QA Scenarios**:
  ```
  Scenario: CI checks present
    Tool: Bash
    Steps: Validate workflow file includes lint/typecheck/test/build jobs
    Expected: all required checks present
    Evidence: .sisyphus/evidence/task-6-ci-validation.txt

  Scenario: Fail path works
    Tool: Bash
    Steps: Inject failing test and run CI simulation
    Expected: workflow fails
    Evidence: .sisyphus/evidence/task-6-ci-fail-path.txt
  ```
  **Commit**: YES | Message: `chore(ci): enforce lint typecheck test build gates` | Files: `.github/workflows/**`

- [x] 7. Implement guest order API + state transition service
  **What to do**: Add `POST /api/orders`, validation, transition engine, transition history persistence.
  **Must NOT do**: No backward transition; no client-side status authority.
  **Recommended Agent Profile**: Category `implementation`; Skills [`supabase-postgres-best-practices`]; Omitted [`impeccable-style`].
  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 8,10,13 | Blocked By: 2,4
  **References**: `readme.md`; `Frontend/src/components/GameTopUp.tsx`; `https://www.postgresql.org/docs/current/explicit-locking.html`
  **Acceptance Criteria**: valid order returns invoice/order id with `pending_payment`; invalid payload rejected.
  **QA Scenarios**:
  ```
  Scenario: Create order success
    Tool: Bash
    Steps: POST valid order payload
    Expected: HTTP 201 + pending_payment status
    Evidence: .sisyphus/evidence/task-7-order-create.txt

  Scenario: Invalid transition blocked
    Tool: Bash
    Steps: Attempt forbidden transition in test
    Expected: explicit transition error
    Evidence: .sisyphus/evidence/task-7-transition-error.txt
  ```
  **Commit**: YES | Message: `feat(order): guest order api with transition engine` | Files: `backend/src/modules/order/**`

- [x] 8. Integrate Midtrans payment + secure webhook handler
  **What to do**: Add payment init flow and webhook verification/idempotency handling.
  **Must NOT do**: Never process unsigned/invalid webhook.
  **Recommended Agent Profile**: Category `security`; Skills []; Omitted [`supabase`].
  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 10,13 | Blocked By: 4,7
  **References**: `readme.md`; `https://docs.midtrans.com/reference/test.html`; `https://expressjs.com/en/resources/middleware/body-parser.html`
  **Acceptance Criteria**: valid webhook moves order to paid once; replay is idempotent.
  **QA Scenarios**:
  ```
  Scenario: Valid webhook processed once
    Tool: Bash
    Steps: Send signed event and replay identical event
    Expected: first updates, second no-op
    Evidence: .sisyphus/evidence/task-8-midtrans-idempotent.txt

  Scenario: Invalid signature blocked
    Tool: Bash
    Steps: Send payload with wrong signature
    Expected: 401/403 and no state mutation
    Evidence: .sisyphus/evidence/task-8-midtrans-signature-error.txt
  ```
  **Commit**: YES | Message: `feat(payment): midtrans integration with idempotent webhook` | Files: `backend/src/modules/payment/**`

- [x] 9. Integrate Digiflazz fulfillment + callback + dev mock fallback
  **What to do**: Add Digiflazz adapter, callback processing, and localhost/dev mock fallback.
  **Must NOT do**: Mock must be disabled in production.
  **Recommended Agent Profile**: Category `implementation`; Skills []; Omitted [`impeccable-style`].
  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 10,13 | Blocked By: 4,7
  **References**: `readme.md`; `Frontend/webhook.md` (legacy warning only); `https://developer.digiflazz.com/api/buyer/persiapan/`
  **Acceptance Criteria**: paid orders trigger fulfillment; callback updates status; dev mode can use mock path.
  **QA Scenarios**:
  ```
  Scenario: Digiflazz success callback
    Tool: Bash
    Steps: Trigger paid order then send success callback fixture
    Expected: order reaches success with provider reference
    Evidence: .sisyphus/evidence/task-9-digiflazz-success.txt

  Scenario: Mock fallback path
    Tool: Bash
    Steps: Remove invalid creds in localhost and trigger fulfillment
    Expected: provider_mode=mock and controlled success/failure output
    Evidence: .sisyphus/evidence/task-9-digiflazz-mock.txt
  ```
  **Commit**: YES | Message: `feat(fulfillment): digiflazz adapter callback and mock fallback` | Files: `backend/src/modules/fulfillment/**`

- [x] 10. Connect frontend checkout to backend APIs
  **What to do**: Replace static flow with real API create-order/payment-init interaction.
  **Must NOT do**: No secret leakage to client.
  **Recommended Agent Profile**: Category `visual-engineering`; Skills []; Omitted [`supabase`].
  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: 12,14 | Blocked By: 7,8,9
  **References**: `Frontend/src/App.tsx`; `Frontend/src/components/Hero.tsx`; `Frontend/src/components/GameTopUp.tsx`; `Frontend/src/index.css`
  **Acceptance Criteria**: checkout triggers backend calls; loading/error states shown.
  **QA Scenarios**:
  ```
  Scenario: Checkout happy path UI
    Tool: Playwright
    Steps: Open `http://localhost:5173`; click `[data-testid="product-card-0"]`; fill `input[name="customer_id"]` with `12345678`; fill `input[name="zone_id"]` with `1234`; fill `input[name="email"]` with `guest1@example.com`; click `[data-testid="checkout-submit"]`.
    Expected: `[data-testid="invoice-code"]` and `[data-testid="order-id"]` are visible; `[data-testid="payment-status"]` text equals `pending_payment`.
    Evidence: .sisyphus/evidence/task-10-checkout-happy.png

  Scenario: Checkout API error
    Tool: Playwright
    Steps: Stub backend `POST /api/orders` to return 500; repeat checkout submit on `[data-testid="checkout-submit"]`.
    Expected: `[data-testid="checkout-error"]` contains `Gagal membuat order`; `[data-testid="checkout-retry"]` is visible and enabled.
    Evidence: .sisyphus/evidence/task-10-checkout-error.png
  ```
  **Commit**: YES | Message: `feat(frontend): wire checkout to backend order payment apis` | Files: `Frontend/src/**`

- [x] 11. Add invoice status API + frontend status page
  **What to do**: Build guest invoice lookup API and UI polling/status timeline.
  **Must NOT do**: No unrestricted order listing endpoint.
  **Recommended Agent Profile**: Category `implementation`; Skills []; Omitted [`impeccable-style`].
  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 12,14 | Blocked By: 2,4
  **References**: `readme.md`; `Frontend/src/components/PromoCarousel.tsx`; `Frontend/src/components/Header.tsx`
  **Acceptance Criteria**: status endpoint works; UI transitions correctly; invalid invoice handled safely.
  **QA Scenarios**:
  ```
  Scenario: Status progression visible
    Tool: Playwright
    Steps: Open `http://localhost:5173/invoice/INV-TEST-0001`; simulate API sequence `pending_payment -> paid -> fulfillment_pending -> success` every 2s.
    Expected: `[data-testid="status-badge"]` updates in same sequence and ends as `success`; `[data-testid="timeline-item-success"]` visible.
    Evidence: .sisyphus/evidence/task-11-status-happy.png

  Scenario: Invalid invoice handling
    Tool: Playwright
    Steps: Open `http://localhost:5173/invoice/INV-NOT-FOUND`; wait for status fetch completion.
    Expected: `[data-testid="invoice-error"]` contains `Invoice tidak ditemukan`; app shell remains interactive.
    Evidence: .sisyphus/evidence/task-11-status-error.png
  ```
  **Commit**: YES | Message: `feat(status): invoice status api and frontend tracking view` | Files: backend status module + frontend page

- [x] 12. Harden security and add webhook audit logging
  **What to do**: Add rate limits, structured audit logs, signature-failure logs, and production guard disabling mock fallback.
  **Must NOT do**: Never log secrets/raw keys.
  **Recommended Agent Profile**: Category `security`; Skills [`supabase`]; Omitted [`impeccable-style`].
  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: 14,15 | Blocked By: 10,11
  **References**: `readme.md`; `https://supabase.com/docs/guides/auth/row-level-security`; `https://owasp.org/www-project-top-ten/`
  **Acceptance Criteria**: invalid signatures blocked and logged; production forbids mock mode.
  **QA Scenarios**:
  ```
  Scenario: Invalid webhook rejected
    Tool: Bash
    Steps: Send malformed/invalid-signature webhook
    Expected: 401/403 + audit entry + no state change
    Evidence: .sisyphus/evidence/task-12-webhook-security.txt

  Scenario: Prod guard blocks mock
    Tool: Bash
    Steps: Start with NODE_ENV=production and invalid Digiflazz creds
    Expected: mock path blocked, explicit error
    Evidence: .sisyphus/evidence/task-12-prod-guard.txt
  ```
  **Commit**: YES | Message: `chore(security): webhook hardening and audit controls` | Files: security middleware + audit module

- [x] 13. Add reconciliation job for out-of-order events
  **What to do**: Implement reconciliation command/job for inconsistent asynchronous state combinations.
  **Must NOT do**: No blind state overwrite outside allowed transition map.
  **Recommended Agent Profile**: Category `implementation`; Skills [`supabase-postgres-best-practices`]; Omitted [`impeccable-style`].
  **Parallelization**: Can Parallel: YES | Wave 3 | Blocks: 14,15 | Blocked By: 7,8,9
  **References**: `readme.md`; `https://www.postgresql.org/docs/current/sql-select.html`
  **Acceptance Criteria**: job detects inconsistent fixtures and applies safe corrections with audit.
  **QA Scenarios**:
  ```
  Scenario: Out-of-order fixed
    Tool: Bash
    Steps: Seed inconsistent callback order then run reconciliation
    Expected: converges to valid state and logs reason
    Evidence: .sisyphus/evidence/task-13-reconcile-happy.txt

  Scenario: Illegal correction blocked
    Tool: Bash
    Steps: Force forbidden regression case
    Expected: correction denied with explicit error
    Evidence: .sisyphus/evidence/task-13-reconcile-error.txt
  ```
  **Commit**: YES | Message: `feat(reconcile): add event-order reconciliation workflow` | Files: `backend/src/modules/reconcile/**`

- [x] 14. Build full regression suite (integration + e2e)
  **What to do**: Add integration tests for idempotency/out-of-order/signature failures plus Playwright full guest flow tests.
  **Must NOT do**: Do not depend on unstable external live network in CI.
  **Recommended Agent Profile**: Category `testing`; Skills []; Omitted [`supabase`].
  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: 15 | Blocked By: 5,10,11,12,13
  **References**: `Frontend/src/App.tsx`; `readme.md`; `https://playwright.dev/docs/test-intro`
  **Acceptance Criteria**: backend tests pass with idempotency + failure coverage; frontend/e2e tests pass.
  **QA Scenarios**:
  ```
  Scenario: E2E guest flow
    Tool: Playwright
    Steps: Run script to create order from UI using selectors from Task 10, post signed Midtrans callback fixture (`order_id=ORD-TEST-001`), post Digiflazz success callback fixture (`ref_id=DGF-TEST-001`), then open `/invoice/INV-TEST-0001`.
    Expected: UI shows `success`; backend `GET /api/orders/INV-TEST-0001/status` returns matching `order_id=ORD-TEST-001` and terminal status.
    Evidence: .sisyphus/evidence/task-14-e2e-happy.png

  Scenario: Replay idempotency
    Tool: Bash
    Steps: Send same Midtrans callback payload twice with identical `transaction_id=TX-TEST-001`.
    Expected: payment row count unchanged after second call; response includes `idempotent:true` on replay.
    Evidence: .sisyphus/evidence/task-14-idempotency-error.txt
  ```
  **Commit**: YES | Message: `test(regression): integration and e2e lifecycle suites` | Files: backend tests + frontend tests/e2e

- [x] 15. Finalize runbook and localhost operation docs
  **What to do**: Update docs with exact setup/run/test/build/webhook-simulation commands and troubleshooting, then tidy documentation structure so `.env.example` key ordering/grouping is aligned with README environment sections and overall docs are clean and easy to follow.
  **Must NOT do**: No legacy secret exposure in docs.
  **Recommended Agent Profile**: Category `doc-writer`; Skills [`supabase`]; Omitted [`impeccable-style`].
  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: Final Wave | Blocked By: 6,12,13,14
  **References**: `readme.md`; `Frontend/package.json`; `.env.example`
  **Acceptance Criteria**: docs reproducible in clean shell; missing env error path documented; README env section order matches `.env.example` grouping; documentation formatting is consistent and tidy.
  **QA Scenarios**:
  ```
  Scenario: Fresh setup from docs
    Tool: Bash
    Steps: Follow docs in clean shell end-to-end
    Expected: services start and validation commands pass
    Evidence: .sisyphus/evidence/task-15-runbook-happy.txt

  Scenario: Missing key troubleshooting
    Tool: Bash
    Steps: Omit required env key and follow docs
    Expected: docs remediation matches runtime behavior
    Evidence: .sisyphus/evidence/task-15-runbook-error.txt

  Scenario: Env and README alignment
    Tool: Bash
    Steps: Compare `.env.example` key groups with README environment section order after doc cleanup.
    Expected: Group names/order are aligned and no required key is missing from documentation.
    Evidence: .sisyphus/evidence/task-15-env-readme-alignment.txt
  ```
  **Commit**: YES | Message: `docs(runbook): localhost execution and verification guide` | Files: `readme.md`, backend docs/scripts

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.
- [x] F1. Plan Compliance Audit — oracle
- [x] F2. Code Quality Review — unspecified-high
- [x] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [x] F4. Scope Fidelity Check — deep

## Commit Strategy
- Use small atomic commits aligned to task boundaries.
- Prefer sequence: `chore(scaffold)` → `feat(db)` → `feat(order-api)` → `feat(payment)` → `feat/fulfillment)` → `feat(frontend-integration)` → `test(e2e)` → `chore(ci/docs)`.
- Commit format: `type(scope): description`.

## Success Criteria
- Guest user can complete one end-to-end top-up flow in localhost from UI to final status.
- Duplicate/out-of-order webhooks do not create duplicate charges/fulfillments.
- Security checks enforced (signature verification + RLS write restrictions).
- All required lint/typecheck/build/test/e2e commands pass without manual intervention.
