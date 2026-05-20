# Plan: Security Hardening + Development Deploy + E2E Simulation

## TL;DR
> **Summary**: Complete remaining security hardening (catalog Zod migration), run full e2e payment simulation with real Digiflazz API, automated testing, commit, and final report.
> **Deliverables**: All API inputs Zod-validated, e2e payment flow documented, test results, final security report
> **Effort**: Medium
> **Parallel**: YES - 3 waves
> **Critical Path**: Task 5b → Task 8 → Task 10 → Task 11

## Context
### Original Request
Anti SQL injection, Zod validation on all endpoints, e2e payment simulation (Gopay/QRIS → Digiflazz), automated testing, finalisasi report.

### Review Findings (from plan review)
- Tasks 1-4, 6-7: VERIFIED COMPLETE
- Task 5: PARTIALLY DONE — `catalog.router.ts` has 3 endpoints using Zod (`catalogQuerySchema`, `createProductSchema`, `updateProductSchema`) but 4 endpoints still use manual validation functions (`validateTrustedPricePayload`, `validateCreatePricingRulePayload`, `validateUpdatePricingRulePayload`)
- Task 7: ACCEPTABLE AS-IS — `dashboard.router.ts` only has param-less GET endpoints with auth middleware, no user-supplied body/query
- Tasks 8-11 + F1-F4: Correctly marked pending

### Architecture Note (E2E Flow)
The actual payment-to-topup flow is:
1. `POST /api/orders` → `order.service.ts:createOrder()` → status "pending_payment"
2. `POST /api/payment/midtrans/initialize` → creates Midtrans payment, returns `token` + `redirect_url`
3. User pays via Midtrans (QRIS/Gopay)
4. Midtrans sends webhook to `POST /api/payment/midtrans/webhook` with `transaction_status: "settlement"`
5. `payment.service.ts:handleMidtransWebhook()` verifies signature, transitions order to "paid"
6. Payment service calls `fulfillmentService.triggerPaidOrderFulfillment({orderId})`
7. `fulfillment.service.ts:sendLiveTopup()` calls Digiflazz `POST /v1/transaction` with `{username, buyer_sku_code, customer_no, ref_id, sign, testing}`
8. Digiflazz responds with `{rc, status, message, sn}`
9. Fulfillment creates record, transitions order to success/failed based on rc

## Work Objectives
### Core Objective
Complete all remaining security hardening tasks and run full e2e verification.

### Must Have
- All catalog endpoints using Zod validation (no manual validation functions)
- Full e2e payment simulation documented with curl commands
- Clean TypeScript compilation
- Final security report

### Must NOT Have
- Breaking changes to existing working endpoints
- Changes to API response shapes
- Removal of the manual validation helper functions until ALL callers are migrated (they may be used elsewhere)

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: tests-after (verify existing tests still pass)
- QA policy: Every task has agent-executed scenarios
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves

Wave 1: Task 5b (catalog Zod completion)
Wave 2: Task 8 (e2e simulation) — depends on clean validation
Wave 3: Task 10 + 11 (commit + report) — parallel with each other

### Dependency Matrix
- Task 5b: no blockers
- Task 8: blocked by Task 5b
- Task 10: blocked by Task 8
- Task 11: blocked by Task 8

### Agent Dispatch Summary
| Wave | Tasks | Categories |
|------|-------|------------|
| 1 | 5b | implementation |
| 2 | 8 | testing |
| 3 | 10, 11 | quick, writing |

## TODOs

### Phase 2b: Complete Catalog Zod Migration (REMAINING)

- [ ] 5b. Complete Zod migration for remaining `catalog.router.ts` endpoints

  **What to do**: Migrate 3 manual validation functions to Zod schemas in `backend/src/shared/validation.ts`, then replace manual function calls in `catalog.router.ts` with `zodValidate()` middleware. Finally, delete the unused manual validation code.

  **Must NOT do**:
  - Do NOT change the API response format of any endpoint
  - Do NOT remove `readString`, `readInteger`, etc. helper functions yet (they may be used by response formatters — only remove the 3 `validate*Payload` functions after confirming zero remaining callers)
  - Do NOT modify the `TRUSTED_PRICE_FIELDS` set or `isPlainObject` helper — these are still needed

  **Recommended Agent Profile**:
  - Category: `implementation` - Reason: straightforward code migration with clear patterns
  - Skills: [`supabase`] - backend uses Supabase patterns
  - Omitted: [`frontend-ui-ux`] - no UI work

  **Parallelization**: Can Parallel: NO (Wave 1, foundation) | Wave 1 | Blocks: Task 8 | Blocked By: none

  **Step-by-step implementation**:

  ### Step 1: Add 3 new Zod schemas to `backend/src/shared/validation.ts`

  Add AFTER the existing `updateProductSchema` (around line 220). Use existing primitives `zodId`, `zodMetadata`, `zodBoolean` already in the file.

  ```typescript
  // === Catalog: Pricing Rules ===

  export const scopeTypeEnum = z.enum(["global", "category", "product"]);
  export const roleTypeEnum = z.enum(["admin", "seller", "pengguna"]);

  export const createPricingRuleSchema = z.object({
    scope_type: scopeTypeEnum,
    product_id: z.string().uuid().optional(),
    category: z.string().min(1).max(100).optional(),
    role_type: roleTypeEnum,
    markup_fixed: z.number().int().min(0).default(0),
    markup_percentage: z.number().min(0).default(0),
    priority: z.number().int().default(0),
    is_active: z.boolean().default(true),
    metadata: zodMetadata.default({}),
  }).refine((data) => {
    if (data.scope_type === "global") {
      return !data.product_id && !data.category;
    }
    if (data.scope_type === "category") {
      return !data.product_id && !!data.category;
    }
    if (data.scope_type === "product") {
      return !!data.product_id && !data.category;
    }
    return false;
  }, {
    message: "Invalid scope: global requires no product_id/category, category requires category only, product requires product_id only"
  });

  export const updatePricingRuleSchema = z.object({
    scope_type: scopeTypeEnum.optional(),
    product_id: z.string().uuid().optional(),
    category: z.string().min(1).max(100).optional(),
    role_type: roleTypeEnum.optional(),
    markup_fixed: z.number().int().min(0).optional(),
    markup_percentage: z.number().min(0).optional(),
    priority: z.number().int().optional(),
    is_active: z.boolean().optional(),
    metadata: zodMetadata.optional(),
  });

  // Trusted price: reject if body contains server-controlled fields
  const TRUSTED_PRICE_FIELD_NAMES = [
    "final_price", "price", "base_price", "admin_fee",
    "commission", "commission_rate", "markup", "markup_fixed", "markup_percentage"
  ] as const;

  export const trustedPriceBodySchema = z.object({}).catchall(z.unknown()).refine(
    (body) => {
      const keys = Object.keys(body);
      const forbidden = keys.filter(k => (TRUSTED_PRICE_FIELD_NAMES as readonly string[]).includes(k));
      return forbidden.length === 0;
    },
    (body) => {
      const keys = Object.keys(body);
      const forbidden = keys.filter(k => (TRUSTED_PRICE_FIELD_NAMES as readonly string[]).includes(k));
      return { message: `Body must not contain server-controlled fields: ${forbidden.join(", ")}` };
    }
  );

  export const deleteProductParamsSchema = z.object({
    productId: zodId,
  });
  ```

  ### Step 2: Update imports in `catalog.router.ts`

  File: `backend/src/modules/catalog/catalog.router.ts`

  At line 3, the existing import is:
  ```typescript
  import { catalogQuerySchema, createProductSchema, updateProductSchema, zodValidate } from "../../shared/validation.js";
  ```

  Change to:
  ```typescript
  import { catalogQuerySchema, createProductSchema, updateProductSchema, createPricingRuleSchema, updatePricingRuleSchema, trustedPriceBodySchema, deleteProductParamsSchema, zodValidate } from "../../shared/validation.js";
  ```

  ### Step 3: Replace manual validation calls with zodValidate

  **3a. `POST /products/:productId/prepare-order` (member route, ~line 427)**
  Current code pattern:
  ```typescript
  catalogRouter.post("/:productId/prepare-order", authMiddleware, async (request, response) => {
    const issues = validateTrustedPricePayload(request.body);
    if (issues.length > 0) { ... }
  ```
  Replace with:
  ```typescript
  catalogRouter.post("/:productId/prepare-order", authMiddleware, zodValidate(trustedPriceBodySchema), async (request, response) => {
    // Remove the manual validateTrustedPricePayload call and its error handling block
  ```

  **3b. `POST /pricing-rules` (admin route, ~line 531-532)**
  Current code pattern:
  ```typescript
  adminRouter.post("/pricing-rules", authMiddleware, adminOnly, async (request, response) => {
    const issues = validateCreatePricingRulePayload(request.body);
    if (issues.length > 0) { ... }
  ```
  Replace with:
  ```typescript
  adminRouter.post("/pricing-rules", authMiddleware, adminOnly, zodValidate(createPricingRuleSchema), async (request, response) => {
    // Remove manual validation call and error handling
    // request.body is now typed and validated by Zod
  ```

  **3c. `PATCH /pricing-rules/:ruleId` (admin route, ~line 542-543)**
  Current code pattern:
  ```typescript
  adminRouter.patch("/pricing-rules/:ruleId", authMiddleware, adminOnly, async (request, response) => {
    const issues = validateUpdatePricingRulePayload(request.body);
    if (issues.length > 0) { ... }
  ```
  Replace with:
  ```typescript
  adminRouter.patch("/pricing-rules/:ruleId", authMiddleware, adminOnly, zodValidate(updatePricingRuleSchema), async (request, response) => {
    // Remove manual validation call and error handling
  ```

  **3d. `POST /products/:productId/prepare-order` (admin route, ~line 557-558)**
  Same pattern as 3a but on admin router. Replace `validateTrustedPricePayload` with `zodValidate(trustedPriceBodySchema)`.

  **3e. `DELETE /products/:productId` (admin route, ~line 517)**
  Currently has NO validation on params. Add:
  ```typescript
  adminRouter.delete("/products/:productId", authMiddleware, adminOnly, zodValidate(deleteProductParamsSchema, "params"), async (request, response) => {
  ```

  ### Step 4: Remove dead manual validation functions

  After ALL callers are migrated, DELETE these functions from `catalog.router.ts`:
  - `validateTrustedPricePayload()` (lines ~300-314) — replaced by `trustedPriceBodySchema`
  - `validateCreatePricingRulePayload()` (lines ~351-367) — replaced by `createPricingRuleSchema`
  - `validateUpdatePricingRulePayload()` (lines ~370-393) — replaced by `updatePricingRuleSchema`

  Also DELETE if confirmed zero callers:
  - `validateCreateProductPayload()` (lines ~316-328) — already unused (replaced by `createProductSchema` earlier)
  - `validateUpdateProductPayload()` (lines ~330-349) — already unused (replaced by `updateProductSchema` earlier)

  **KEEP** the `readString`, `readInteger`, etc. helpers (lines 192-298) — they may be used by response formatters or other code. Run `grep -r "readString\|readInteger\|readNumber\|readBoolean\|readMetadata\|readRole\|readScope" backend/src/ --include="*.ts"` to confirm callers before deciding.

  ### Step 5: Verify TypeScript compiles

  Run `npx tsc --noEmit` from `backend/` directory. Fix any type errors.

  **References**:
  - Pattern: `backend/src/shared/validation.ts:1-332` — existing Zod schemas follow this pattern
  - Pattern: `backend/src/modules/catalog/catalog.router.ts:1-23` — existing zodValidate imports
  - Pattern: `backend/src/modules/catalog/catalog.router.ts:395-410` — existing zodValidate usage on GET /products
  - Pattern: `backend/src/modules/catalog/catalog.router.ts:484-498` — existing zodValidate usage on POST/PATCH products

  **Acceptance Criteria**:
  - [ ] `grep -n "validateTrustedPricePayload\|validateCreatePricingRulePayload\|validateUpdatePricingRulePayload" backend/src/modules/catalog/catalog.router.ts` returns zero matches (as function calls — dead function definitions also removed)
  - [ ] `grep -c "zodValidate" backend/src/modules/catalog/catalog.router.ts` returns ≥7 (3 existing + 4 new + DELETE params)
  - [ ] `npx tsc --noEmit` passes with zero errors from `backend/`
  - [ ] `createPricingRuleSchema`, `updatePricingRuleSchema`, `trustedPriceBodySchema`, `deleteProductParamsSchema` exist in `validation.ts`

  **QA Scenarios**:
  ```
  Scenario: Pricing rule creation with valid global scope
    Tool: Bash (curl)
    Steps: POST /api/catalog/admin/pricing-rules with body {"scope_type":"global","role_type":"seller","markup_fixed":500}
    Expected: 200/201 response, rule created
    Evidence: .sisyphus/evidence/task-5b-pricing-rule-create.json

  Scenario: Pricing rule creation with invalid scope (global + product_id)
    Tool: Bash (curl)
    Steps: POST /api/catalog/admin/pricing-rules with body {"scope_type":"global","product_id":"some-uuid","role_type":"seller"}
    Expected: 400 with Zod validation error mentioning "Invalid scope"
    Evidence: .sisyphus/evidence/task-5b-pricing-rule-invalid.json

  Scenario: Prepare-order with forbidden field
    Tool: Bash (curl)
    Steps: POST /api/catalog/products/{id}/prepare-order with body {"customer_no":"08123","final_price":1000}
    Expected: 400 with validation error mentioning "server-controlled fields"
    Evidence: .sisyphus/evidence/task-5b-trusted-price-reject.json

  Scenario: Delete product with invalid productId
    Tool: Bash (curl)
    Steps: DELETE /api/catalog/admin/products/not-a-uuid
    Expected: 400 with Zod validation error on productId
    Evidence: .sisyphus/evidence/task-5b-delete-invalid-id.json
  ```

  **Commit**: YES | Message: `security(catalog): complete Zod migration for pricing-rules and prepare-order endpoints` | Files: `backend/src/shared/validation.ts`, `backend/src/modules/catalog/catalog.router.ts`

---

### Phase 3: E2E Payment Simulation (Gopay/QRIS → Digiflazz)

- [ ] 8. Full e2e payment simulation with real Digiflazz API

  **What to do**: Execute the complete payment flow end-to-end using curl commands against the running backend at `https://demo.hanzserver.online/api`. This tests the real flow: register → login → get products → create order → initialize payment → simulate Midtrans webhook → verify Digiflazz topup fires. Use Digiflazz testing mode (`testing: true` in env).

  **Must NOT do**:
  - Do NOT use production Digiflazz mode (ensure `DIGIFLAZZ_TOPUP_TESTING=true` in env)
  - Do NOT skip webhook signature verification — use real Midtrans server key to generate signatures
  - Do NOT modify any application code — this is pure testing

  **Recommended Agent Profile**:
  - Category: `testing` - Reason: e2e verification, no code changes
  - Skills: [] - no special skills needed
  - Omitted: [`supabase`] - not modifying DB schema

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: Task 10, 11 | Blocked By: Task 5b

  **Pre-requisites**:
  - Backend must be running at `https://demo.hanzserver.online`
  - `DIGIFLAZZ_TOPUP_TESTING` must be `true` in backend env
  - Midtrans sandbox keys must be configured

  **Step-by-step simulation**:

  ### Step 1: Check server health
  ```bash
  curl -s https://demo.hanzserver.online/api/health | jq .
  ```
  Expected: `{"status":"ok"}` or similar health response

  ### Step 2: Register a test user (skip if already exists)
  ```bash
  curl -s -X POST https://demo.hanzserver.online/api/auth/register \
    -H "Content-Type: application/json" \
    -d '{
      "email": "e2etest@example.com",
      "password": "TestPassword123!",
      "name": "E2E Test User",
      "phone": "081234567890",
      "pin": "123456"
    }' | jq .
  ```
  Expected: 201 with user object, or 409 if already exists

  ### Step 3: Login
  ```bash
  curl -s -X POST https://demo.hanzserver.online/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "e2etest@example.com",
      "password": "TestPassword123!"
    }' | jq .
  ```
  Expected: 200 with `{token, user}`. Save the token as `$TOKEN`.

  ### Step 4: Get products (find a cheap test product)
  ```bash
  curl -s "https://demo.hanzserver.online/api/catalog/products?limit=10&search=pulsa" \
    -H "Authorization: Bearer $TOKEN" | jq '.data[] | {id, sku: .sku_digiflazz, name: .nama, price: .harga_jual}'
  ```
  Expected: Array of products. Pick one with lowest price. Save its `id` and `sku_digiflazz`.

  **Digiflazz test products** (from Digiflazz docs — use these SKU codes in testing mode):
  - Pulsa: `xr5` (XL 5000), `tsel5` (Telkomsel 5000) — cheapest options
  - The `testing: true` flag makes Digiflazz process without real charging

  ### Step 5: Create order
  ```bash
  curl -s -X POST https://demo.hanzserver.online/api/orders \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "productId": "<PRODUCT_ID_FROM_STEP_4>",
      "customerNo": "081234567890"
    }' | jq .
  ```
  Expected: 201 with order object containing `{id, invoiceCode, status: "pending_payment", ...}`. Save `orderId`.

  ### Step 6: Initialize Midtrans payment
  ```bash
  curl -s -X POST https://demo.hanzserver.online/api/payment/midtrans/initialize \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $TOKEN" \
    -d '{
      "orderId": "<ORDER_ID_FROM_STEP_5>"
    }' | jq .
  ```
  Expected: 200/201 with `{token, redirect_url}` from Midtrans sandbox.

  ### Step 7: Simulate Midtrans settlement webhook
  The Midtrans webhook requires a valid signature. Signature formula: `SHA512(orderId + statusCode + grossAmount + serverKey)`.

  ```bash
  # Generate signature (replace values from step 5/6)
  ORDER_ID="<ORDER_ID>"
  STATUS_CODE="200"
  GROSS_AMOUNT="<AMOUNT>.00"  # from order response
  SERVER_KEY="<MIDTRANS_SERVER_KEY>"  # from env

  SIGNATURE=$(echo -n "${ORDER_ID}${STATUS_CODE}${GROSS_AMOUNT}${SERVER_KEY}" | sha512sum | cut -d' ' -f1)

  curl -s -X POST https://demo.hanzserver.online/api/payment/midtrans/webhook \
    -H "Content-Type: application/json" \
    -d '{
      "transaction_type": "on-us",
      "transaction_time": "2025-05-19 12:00:00",
      "transaction_status": "settlement",
      "transaction_id": "test-txn-'$(date +%s)'",
      "status_message": "midtrans payment notification",
      "status_code": "200",
      "signature_key": "'$SIGNATURE'",
      "payment_type": "gopay",
      "order_id": "'$ORDER_ID'",
      "merchant_id": "G-TEST",
      "gross_amount": "'$GROSS_AMOUNT'",
      "fraud_status": "accept",
      "currency": "IDR"
    }' | jq .
  ```
  Expected: 200 OK. This should trigger:
  1. Order status → "paid"
  2. `fulfillmentService.triggerPaidOrderFulfillment({orderId})`
  3. Digiflazz POST `/v1/transaction` with `testing: true`

  ### Step 8: Verify order status after fulfillment
  ```bash
  # Wait 5-10 seconds for async fulfillment
  sleep 10

  curl -s "https://demo.hanzserver.online/api/orders?limit=1" \
    -H "Authorization: Bearer $TOKEN" | jq '.data[0] | {id, status, invoiceCode}'
  ```
  Expected: Order status should be one of: `"success"`, `"processing"`, or `"failed"`. In testing mode with valid SKU, expect `"success"` or `"processing"`.

  ### Step 9: Check backend logs for Digiflazz response
  Check the backend logs (or Supabase fulfillment table) for the Digiflazz response:
  ```bash
  # If accessible via Supabase
  # Check fulfillments table for the order
  ```
  Expected: Fulfillment record created with Digiflazz response containing `rc`, `status`, `sn` (serial number in testing mode).

  ### Step 10: Document results
  Save all curl outputs to `.sisyphus/evidence/task-8-e2e-payment-flow.md` with:
  - Each step's request and response
  - Order state transitions observed
  - Digiflazz response details
  - Any errors or unexpected behavior

  **References**:
  - Flow: `backend/src/modules/payment/payment.service.ts` — webhook handler and Midtrans signature verification
  - Flow: `backend/src/modules/fulfillment/fulfillment.service.ts:triggerPaidOrderFulfillment()` — Digiflazz topup trigger
  - Flow: `backend/src/modules/digiflazz/buyer-client.ts:buildDigiflazzTopupRequest()` — request builder
  - API: `backend/src/modules/order/order.router.ts` — POST / and GET /
  - API: `backend/src/modules/payment/payment.router.ts` — POST /midtrans/initialize and /midtrans/webhook
  - Env: `backend/src/shared/env.ts` — MIDTRANS_SERVER_KEY, DIGIFLAZZ_* vars

  **Acceptance Criteria**:
  - [ ] User registration/login succeeds (200/201)
  - [ ] Order creation returns status "pending_payment"
  - [ ] Payment initialization returns Midtrans token
  - [ ] Webhook simulation triggers order status transition to "paid"
  - [ ] Fulfillment service fires Digiflazz topup (visible in logs/DB)
  - [ ] Final order status is "success" or "processing" (not stuck at "paid")
  - [ ] All results documented in evidence file

  **QA Scenarios**:
  ```
  Scenario: Happy path — full e2e flow
    Tool: Bash (curl)
    Steps: Execute Steps 1-10 above in sequence
    Expected: Order transitions: created → pending_payment → paid → success/processing
    Evidence: .sisyphus/evidence/task-8-e2e-payment-flow.md

  Scenario: Invalid webhook signature
    Tool: Bash (curl)
    Steps: Send webhook with wrong signature_key "invalid-signature"
    Expected: 400 or 403 error, order status unchanged
    Evidence: .sisyphus/evidence/task-8-e2e-invalid-webhook.json

  Scenario: Order with invalid product ID
    Tool: Bash (curl)
    Steps: POST /api/orders with non-existent productId
    Expected: 400/404 error with descriptive message
    Evidence: .sisyphus/evidence/task-8-e2e-invalid-product.json
  ```

  **Commit**: NO (testing only, no code changes)

---

### Phase 4: Finalisasi

- [ ] 10. Commit all security + validation changes

  **What to do**: Stage and commit all modified files from Task 5b. Verify git diff is clean and only expected files are modified.

  **Must NOT do**:
  - Do NOT commit test evidence files to git (they go to .sisyphus/evidence/)
  - Do NOT amend previous commits

  **Recommended Agent Profile**:
  - Category: `quick` - Reason: single git operation
  - Skills: [] - no special skills needed

  **Parallelization**: Can Parallel: YES (with Task 11) | Wave 3 | Blocks: none | Blocked By: Task 8

  **Steps**:
  1. `cd backend && git status` — verify only expected files modified
  2. Expected modified files:
     - `backend/src/shared/validation.ts` (new schemas added)
     - `backend/src/modules/catalog/catalog.router.ts` (manual → Zod migration)
  3. `git add src/shared/validation.ts src/modules/catalog/catalog.router.ts`
  4. `git commit -m "security(catalog): complete Zod migration for pricing-rules and prepare-order endpoints"`
  5. `git push`

  **References**:
  - Files: `backend/src/shared/validation.ts`, `backend/src/modules/catalog/catalog.router.ts`

  **Acceptance Criteria**:
  - [ ] `git log -1 --oneline` shows the security commit
  - [ ] `git diff HEAD` is empty (clean working tree)

  **QA Scenarios**:
  ```
  Scenario: Verify commit content
    Tool: Bash
    Steps: git log -1 --stat
    Expected: Shows exactly 2 files changed
    Evidence: .sisyphus/evidence/task-10-commit.txt
  ```

  **Commit**: YES (this IS the commit task) | Message: `security(catalog): complete Zod migration for pricing-rules and prepare-order endpoints` | Files: `backend/src/shared/validation.ts`, `backend/src/modules/catalog/catalog.router.ts`

---

- [ ] 11. Generate final security summary report

  **What to do**: Create a comprehensive security report documenting all hardening work done across both Task 1-7 (previously completed) and Task 5b, 8 (newly completed). Include findings, fixes applied, remaining recommendations.

  **Must NOT do**:
  - Do NOT create new README.md files
  - Do NOT modify any code files

  **Recommended Agent Profile**:
  - Category: `writing` - Reason: documentation task
  - Skills: [] - no special skills needed

  **Parallelization**: Can Parallel: YES (with Task 10) | Wave 3 | Blocks: none | Blocked By: Task 8

  **Report structure** (save to `.sisyphus/evidence/security-hardening-report.md`):

  ```markdown
  # Security Hardening Report — PPOB Payment Backend

  ## Executive Summary
  - Date: [completion date]
  - Scope: SQL injection prevention, input validation, e2e verification
  - Status: COMPLETE

  ## Findings & Fixes

  ### 1. SQL Injection Prevention (Task 1)
  - [summary of parameterized query fixes]

  ### 2. Zod Input Validation (Tasks 2-7, 5b)
  - validation.ts: [count] shared schemas
  - Routers migrated: auth, order, catalog, payment, dashboard
  - Catalog manual-to-Zod migration: [details]
  - Endpoints covered: [list]

  ### 3. E2E Payment Verification (Task 8)
  - Flow tested: order → payment → webhook → fulfillment → Digiflazz
  - Result: [pass/fail with details]
  - Digiflazz response: [rc, status, sn]

  ## Security Posture Summary
  | Area | Status | Notes |
  |------|--------|-------|
  | SQL Injection | MITIGATED | Parameterized queries |
  | Input Validation | COMPLETE | Zod on all endpoints |
  | Webhook Auth | VERIFIED | Midtrans signature check |
  | Rate Limiting | ACTIVE | 30 req/min global, 120 catalog |

  ## Remaining Recommendations
  - [any items discovered during audit]
  ```

  **References**:
  - Evidence: `.sisyphus/evidence/task-5b-*.json` — validation test results
  - Evidence: `.sisyphus/evidence/task-8-e2e-*.md` — e2e test results
  - Code: `backend/src/shared/validation.ts` — all schemas
  - Code: `backend/src/app.ts:111-136` — helmet, cors, rateLimit middleware

  **Acceptance Criteria**:
  - [ ] Report file exists at `.sisyphus/evidence/security-hardening-report.md`
  - [ ] All 3 sections (SQL injection, Zod validation, e2e) have concrete details
  - [ ] No placeholder text like "[TBD]" or "[fill in]"

  **QA Scenarios**:
  ```
  Scenario: Report completeness check
    Tool: Bash (grep)
    Steps: grep -c "MITIGATED\|COMPLETE\|VERIFIED\|ACTIVE" .sisyphus/evidence/security-hardening-report.md
    Expected: ≥4 matches (all status fields filled)
    Evidence: .sisyphus/evidence/task-11-report-check.txt
  ```

  **Commit**: NO (evidence file, not source code)

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**

- [ ] F1. Security Audit — oracle
  **What to do**: Verify zero raw SQL string concatenation in all repository files. Verify all API endpoints have Zod validation middleware. Check `mysql-catalog.repository.ts`, `provider-audit.repository.ts`, `commission.repository.ts` for parameterized queries. Check all router files for `zodValidate()` usage.
  **Acceptance Criteria**:
  - [ ] `grep -r "\\$\{" backend/src/modules/ --include="*.ts" | grep -v node_modules | grep -v ".d.ts"` returns zero SQL-related concatenation
  - [ ] Every POST/PUT/PATCH endpoint in all routers uses `zodValidate()`
  - [ ] No manual validation functions (`validateTrustedPricePayload`, `validateCreatePricingRulePayload`, `validateUpdatePricingRulePayload`) remain as sole validators on any endpoint

- [ ] F2. TypeScript Typecheck — unspecified-high
  **What to do**: Run `npx tsc --noEmit` from `backend/` directory. Fix any type errors.
  **Acceptance Criteria**:
  - [ ] `npx tsc --noEmit` exits with code 0
  - [ ] Zero type errors reported

- [ ] F3. Real Manual QA — unspecified-high
  **What to do**: Execute the e2e curl sequence from Task 8 against the running server. Verify each step returns expected status codes and response shapes.
  **Acceptance Criteria**:
  - [ ] All curl commands from Task 8 execute successfully
  - [ ] Order transitions through all expected states
  - [ ] Evidence screenshots/logs saved

- [ ] F4. Scope Fidelity Check — deep
  **What to do**: Compare completed work against this plan. Verify no scope creep, no missing deliverables, no broken existing functionality.
  **Acceptance Criteria**:
  - [ ] All tasks marked [x] have evidence
  - [ ] No files modified outside scope
  - [ ] Existing API responses unchanged

## Commit Strategy
- Single commit per task completion
- Message format: `security(scope): description`

## Success Criteria
- All API inputs validated via Zod (zero manual validation as sole guard)
- E2E payment flow verified with real Digiflazz API response
- TypeScript compiles cleanly
- Final report generated with all findings
