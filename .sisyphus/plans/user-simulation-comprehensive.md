# User Simulation Comprehensive - All User Flows

## TL;DR
> **Summary**: Create comprehensive simulation scenarios for all user types (Guest, Reseller, Admin) covering complete workflows from registration to transaction completion, with TestSprite MCP final validation and automated fixes.
> **Deliverables**: 
> - Simulation scripts for each user type
> - Test data fixtures
> - Playwright automation for each scenario
> - TestSprite MCP validation results
> - Automated fixes for TestSprite findings
> - Evidence files for each flow
> - Fix report with before/after comparison
> **Effort**: Medium
> **Parallel**: YES - 4 waves (Setup, Execution, TestSprite, Fixes)
> **Critical Path**: Setup test data → Execute simulations → TestSprite validation → Apply fixes → Verify results

## Context
### Original Request
User requested: "buat simulasi lengkap pada setiap penggunanan user" - create complete simulation for every user usage scenario.

### Current State
- Demo environment: https://adnanpay.com/demo/
- Backend API: https://adnanpay.com/ppob-api/
- Database: demo_ tables (isolated from production)
- Development API: 5 products available (gopay10, gopay20, gopay25, gopay50, telkomsel5)

### User Types
1. **Guest** - Checkout tanpa login, track order via invoice code
2. **Reseller** - Login, view dashboard, manage transactions, request payout
3. **Admin** - Full access, manage products, approve resellers, view all transactions

## Work Objectives
### Core Objective
Create and execute comprehensive simulation scenarios that cover all user workflows from start to finish, with automated verification and evidence collection.

### Deliverables
1. Test data fixtures (users, products, orders)
2. Simulation scripts for each user type
3. Playwright automation for UI flows
4. API test scripts for backend flows
5. Evidence files for each scenario
6. TestSprite MCP validation results
7. Automated fixes for TestSprite findings
8. Fix report with before/after comparison
9. Summary report with pass/fail status

### Definition of Done
- [ ] All 3 user types have complete simulation scenarios
- [ ] Each scenario has test data, execution script, and verification
- [ ] Playwright automation runs successfully for all UI flows
- [ ] API tests verify backend behavior
- [ ] TestSprite MCP validation completed
- [ ] All TestSprite findings fixed and verified
- [ ] Evidence files created for each scenario
- [ ] Fix report created with before/after comparison
- [ ] Summary report shows all scenarios passed

### Must Have
- Guest checkout flow (select product → fill form → payment → track order)
- Reseller registration flow (register → verify email → login → dashboard)
- Reseller transaction flow (buy product → view history → request payout)
- Admin approval flow (approve reseller → manage products → view reports)
- Error handling scenarios (invalid input, payment failure, API errors)

### Must NOT Have
- Production data modification
- Real payment processing (use sandbox only)
- Real email sending (mock or log only)
- Destructive operations on production tables

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: Playwright for UI flows, API tests for backend
- QA policy: Every scenario has automated verification
- Evidence: .sisyphus/evidence/simulation-{scenario}-{timestamp}.{ext}

## Execution Strategy
### Parallel Execution Waves
> Target: 5-8 tasks per wave. Extract shared dependencies as Wave-1 tasks for max parallelism.

**Wave 1: Setup and Test Data** (3 tasks)
- T1: Create test data fixtures (quick)
- T2: Setup Playwright test environment (quick)
- T3: Create API test utilities (quick)

**Wave 2: User Simulations** (6 tasks)
- T4: Guest checkout simulation (quick)
- T5: Guest order tracking simulation (quick)
- T6: Reseller registration simulation (quick)
- T7: Reseller transaction simulation (quick)
- T8: Reseller payout simulation (quick)
- T9: Admin management simulation (quick)

**Wave 3: TestSprite Validation** (2 tasks)
- T10: Verify all simulations passed (quick)
- T11: Run TestSprite MCP final validation (quick)

**Wave 4: Fixes and Reporting** (3 tasks)
- T12: Apply fixes for TestSprite findings (quick)
- T13: Re-run TestSprite validation (quick)
- T14: Create fix report and summary (quick)

### Dependency Matrix
```
T1 → T4, T5, T6, T7, T8, T9
T2 → T4, T5, T6, T7, T8, T9
T3 → T4, T5, T6, T7, T8, T9
T4 → T10
T5 → T10
T6 → T10
T7 → T10
T8 → T10
T9 → T10
T10 → T11
T11 → T12
T12 → T13
T13 → T14
```

### Agent Dispatch Summary
- Wave 1: 3 tasks → quick category
- Wave 2: 6 tasks → quick category
- Wave 3: 2 tasks → quick category
- Wave 4: 3 tasks → quick category

## TODOs

- [x] 1. Create test data fixtures

  **What to do**:
  - Create JSON fixtures for test users (guest, reseller, admin)
  - Create fixtures for test products (5 dev API products)
  - Create fixtures for test orders (various statuses)
  - Save to `test-fixtures/` directory
  
  **Must NOT do**:
  - Do not use production data
  - Do not hardcode real credentials
  - Do not create fixtures in production tables

  **Recommended Agent Profile**:
  - Category: `quick` - Simple JSON file creation
  - Skills: [] - No special skills needed
  - Omitted: All - Basic file operations only

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [T4,T5,T6,T7,T8,T9] | Blocked By: []

  **References**:
  - Schema: `supabase/migrations/*.sql` - Table structures
  - Example: `backend/src/modules/*/*.types.ts` - Type definitions

  **Acceptance Criteria**:
  - [x] `test-fixtures/users.json` created with 3 users (guest, reseller, admin)
  - [x] `test-fixtures/products.json` created with 5 dev products
  - [x] `test-fixtures/orders.json` created with sample orders
  - [x] All fixtures use valid data matching database schema

  **QA Scenarios**:
  ```
  Scenario: Verify fixtures created
    Tool: Bash
    Steps: Test-Path test-fixtures/*.json
    Expected: 3 JSON files exist
    Evidence: .sisyphus/evidence/simulation-fixtures-created.txt

  Scenario: Verify JSON validity
    Tool: Bash
    Steps: Get-Content test-fixtures/users.json | ConvertFrom-Json
    Expected: Valid JSON, no parse errors
    Evidence: .sisyphus/evidence/simulation-fixtures-valid.txt
  ```

  **Commit**: NO

- [x] 2. Setup Playwright test environment

  **What to do**:
  - Create `test-simulations/` directory
  - Create base Playwright config for demo environment
  - Create utility functions for common actions (login, fillForm, waitForElement)
  - Create screenshot/video capture helpers
  
  **Must NOT do**:
  - Do not install new npm packages without checking existing
  - Do not modify production Playwright config
  - Do not create tests that run against production

  **Recommended Agent Profile**:
  - Category: `quick` - Setup configuration files
  - Skills: [`playwright`] - Playwright automation needed
  - Omitted: [] - Playwright skill required

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [T4,T5,T6,T7,T8,T9] | Blocked By: []

  **References**:
  - Skill: `/playwright` - Playwright MCP server
  - Config: `next-frontend/playwright.config.ts` - Existing config

  **Acceptance Criteria**:
  - [x] `test-simulations/` directory created
  - [x] `test-simulations/config.ts` with demo base URL
  - [x] `test-simulations/utils.ts` with helper functions
  - [x] Screenshot directory configured

  **QA Scenarios**:
  ```
  Scenario: Verify test directory created
    Tool: Bash
    Steps: Test-Path test-simulations/
    Expected: Directory exists
    Evidence: .sisyphus/evidence/simulation-playwright-setup.txt

  Scenario: Verify config valid
    Tool: Bash
    Steps: node -e "require('./test-simulations/config.ts')"
    Expected: No syntax errors
    Evidence: .sisyphus/evidence/simulation-config-valid.txt
  ```

  **Commit**: NO

- [x] 3. Create API test utilities

  **What to do**:
  - Create `test-simulations/api-utils.ts` with fetch helpers
  - Add functions for common API calls (login, createOrder, getOrder, etc.)
  - Add response validation helpers
  - Add error handling utilities
  
  **Must NOT do**:
  - Do not use production API endpoints
  - Do not hardcode credentials
  - Do not skip error handling

  **Recommended Agent Profile**:
  - Category: `quick` - Simple utility functions
  - Skills: [] - No special skills needed
  - Omitted: All - Basic TypeScript only

  **Parallelization**: Can Parallel: YES | Wave 1 | Blocks: [T4,T5,T6,T7,T8,T9] | Blocked By: []

  **References**:
  - API: `backend/src/modules/*/*.router.ts` - API endpoints
  - Types: `backend/src/modules/*/*.types.ts` - Request/response types

  **Acceptance Criteria**:
  - [x] `test-simulations/api-utils.ts` created
  - [x] Functions for auth, orders, payments, products
  - [x] Response validation helpers included
  - [x] Error handling for all API calls

  **QA Scenarios**:
  ```
  Scenario: Verify API utils created
    Tool: Bash
    Steps: Test-Path test-simulations/api-utils.ts
    Expected: File exists
    Evidence: .sisyphus/evidence/simulation-api-utils.txt

  Scenario: Verify TypeScript compiles
    Tool: Bash
    Steps: npx tsc --noEmit test-simulations/api-utils.ts
    Expected: No compilation errors
    Evidence: .sisyphus/evidence/simulation-api-compile.txt
  ```

  **Commit**: NO

- [x] 4. Guest checkout simulation

  **What to do**:
  - Create `test-simulations/guest-checkout.spec.ts`
  - Simulate: Open demo → Select product (gopay10) → Fill customer ID → Fill email (optional) → Submit → Get invoice code
  - Verify: Order created in database, payment initialized, invoice code returned
  - Capture: Screenshots at each step, final invoice page
  
  **Must NOT do**:
  - Do not use real payment processing
  - Do not skip validation steps
  - Do not assume success without verification

  **Recommended Agent Profile**:
  - Category: `quick` - Single test scenario
  - Skills: [`playwright`] - Browser automation needed
  - Omitted: [] - Playwright required

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [T10] | Blocked By: [T1,T2,T3]

  **References**:
  - UI: `Frontend/src/components/GameTopUp.tsx` - Checkout form
  - API: `backend/src/modules/payment/payment.router.ts` - Payment initialization
  - Flow: `docs/payment-integrity/midtrans-response-flow.md` - Payment flow

  **Acceptance Criteria**:
  - [x] Test script created and runs successfully
  - [x] Order created in demo_orders table
  - [x] Payment initialized in demo_payments table
  - [x] Invoice code returned and valid
  - [x] Screenshots captured for each step

  **QA Scenarios**:
  ```
  Scenario: Guest checkout happy path
    Tool: Playwright
    Steps: 
      1. Navigate to https://adnanpay.com/demo/
      2. Click product "GoPay 10.000"
      3. Fill customer ID "081234567890"
      4. Fill email "guest@test.com"
      5. Click "Bayar Sekarang"
      6. Wait for invoice page
    Expected: Invoice code displayed, order in database
    Evidence: .sisyphus/evidence/simulation-guest-checkout-success.png

  Scenario: Guest checkout without email
    Tool: Playwright
    Steps: Same as above but skip email field
    Expected: Order still created (email optional)
    Evidence: .sisyphus/evidence/simulation-guest-checkout-no-email.png
  ```

  **Commit**: NO

- [x] 5. Guest order tracking simulation

  **What to do**:
  - Create `test-simulations/guest-tracking.spec.ts`
  - Simulate: Open /lacak → Enter invoice code → View order status
  - Verify: Order details displayed, status correct, payment info shown
  - Capture: Screenshots of tracking page
  
  **Must NOT do**:
  - Do not use invalid invoice codes
  - Do not skip error handling
  - Do not assume order exists

  **Recommended Agent Profile**:
  - Category: `quick` - Single test scenario
  - Skills: [`playwright`] - Browser automation needed
  - Omitted: [] - Playwright required

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [T10] | Blocked By: [T1,T2,T3]

  **References**:
  - UI: `Frontend/src/pages/Lacak.tsx` - Tracking page
  - API: `backend/src/modules/order/order.router.ts` - Order lookup

  **Acceptance Criteria**:
  - [x] Test script created and runs successfully
  - [x] Order details displayed correctly
  - [x] Status matches database
  - [x] Payment info shown
  - [x] Screenshots captured

  **QA Scenarios**:
  ```
  Scenario: Track existing order
    Tool: Playwright
    Steps:
      1. Navigate to https://adnanpay.com/demo/lacak
      2. Enter valid invoice code from T4
      3. Click "Lacak Pesanan"
    Expected: Order details displayed
    Evidence: .sisyphus/evidence/simulation-guest-tracking-success.png

  Scenario: Track invalid order
    Tool: Playwright
    Steps: Same but use invalid code "INVALID123"
    Expected: Error message "Order not found"
    Evidence: .sisyphus/evidence/simulation-guest-tracking-error.png
  ```

  **Commit**: NO

- [x] 6. Reseller registration simulation

  **What to do**:
  - Create `test-simulations/reseller-registration.spec.ts`
  - Simulate: Open /dashboard → Click Register → Fill form → Submit → Verify email (mock) → Login
  - Verify: User created in database, email verification pending, login successful
  - Capture: Screenshots of registration flow
  
  **Must NOT do**:
  - Do not send real emails
  - Do not use production user table
  - Do not skip email verification step

  **Recommended Agent Profile**:
  - Category: `quick` - Single test scenario
  - Skills: [`playwright`] - Browser automation needed
  - Omitted: [] - Playwright required

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [T10] | Blocked By: [T1,T2,T3]

  **References**:
  - UI: `Frontend/src/components/AuthDashboard.tsx` - Registration form
  - API: `backend/src/modules/auth/auth.router.ts` - Registration endpoint
  - Migration: `supabase/migrations/20260515110000_email_verification_fields.sql` - Email verification

  **Acceptance Criteria**:
  - [x] Test script created and runs successfully
  - [x] User created in demo users table
  - [x] Email verification token generated
  - [x] Login successful after verification
  - [x] Screenshots captured

  **QA Scenarios**:
  ```
  Scenario: Reseller registration happy path
    Tool: Playwright
    Steps:
      1. Navigate to https://adnanpay.com/demo/dashboard
      2. Click "Daftar"
      3. Fill email "reseller@test.com"
      4. Fill password "Test123!"
      5. Click "Daftar"
      6. Mock email verification
      7. Login with credentials
    Expected: User created, login successful
    Evidence: .sisyphus/evidence/simulation-reseller-registration-success.png

  Scenario: Registration with existing email
    Tool: Playwright
    Steps: Same but use existing email
    Expected: Error "Email already registered"
    Evidence: .sisyphus/evidence/simulation-reseller-registration-duplicate.png
  ```

  **Commit**: NO

- [ ] 7. Reseller transaction simulation

  **What to do**:
  - Create `test-simulations/reseller-transaction.spec.ts`
  - Simulate: Login as reseller → View catalog → Buy product → View transaction history
  - Verify: Order created, commission calculated, transaction visible in dashboard
  - Capture: Screenshots of transaction flow
  
  **Must NOT do**:
  - Do not use real payment
  - Do not skip commission calculation
  - Do not assume balance updates

  **Recommended Agent Profile**:
  - Category: `quick` - Single test scenario
  - Skills: [`playwright`] - Browser automation needed
  - Omitted: [] - Playwright required

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [T10] | Blocked By: [T1,T2,T3]

  **References**:
  - UI: `Frontend/src/components/AuthDashboard.tsx` - Dashboard
  - API: `backend/src/modules/commission/commission.service.ts` - Commission calculation
  - Migration: `supabase/migrations/20260516151500_referrals_discounts_commissions.sql` - Commission tables

  **Acceptance Criteria**:
  - [ ] Test script created and runs successfully
  - [ ] Order created with reseller user_id
  - [ ] Commission calculated and recorded
  - [ ] Transaction visible in dashboard
  - [ ] Screenshots captured

  **QA Scenarios**:
  ```
  Scenario: Reseller buy product
    Tool: Playwright
    Steps:
      1. Login as reseller from T6
      2. Navigate to catalog
      3. Select product "GoPay 10.000"
      4. Complete checkout
      5. View transaction history
    Expected: Order created, commission recorded
    Evidence: .sisyphus/evidence/simulation-reseller-transaction-success.png

  Scenario: View commission details
    Tool: Playwright
    Steps: Login → Dashboard → View commission breakdown
    Expected: Commission amount displayed
    Evidence: .sisyphus/evidence/simulation-reseller-commission.png
  ```

  **Commit**: NO

- [ ] 8. Reseller payout simulation

  **What to do**:
  - Create `test-simulations/reseller-payout.spec.ts`
  - Simulate: Login as reseller → Request payout → Fill bank details → Submit → View payout status
  - Verify: Payout request created, balance reserved, status pending
  - Capture: Screenshots of payout flow
  
  **Must NOT do**:
  - Do not process real payout
  - Do not skip encryption
  - Do not expose bank details in logs

  **Recommended Agent Profile**:
  - Category: `quick` - Single test scenario
  - Skills: [`playwright`] - Browser automation needed
  - Omitted: [] - Playwright required

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [T10] | Blocked By: [T1,T2,T3]

  **References**:
  - API: `backend/src/modules/payout/payout.service.ts` - Payout service
  - Migration: `supabase/migrations/20260516172400_payout_withdrawal_system.sql` - Payout tables
  - Docs: `docs/payment-integrity/manual-payout-withdrawal.md` - Payout flow

  **Acceptance Criteria**:
  - [ ] Test script created and runs successfully
  - [ ] Payout request created in database
  - [ ] Bank details encrypted
  - [ ] Balance reserved in ledger
  - [ ] Screenshots captured

  **QA Scenarios**:
  ```
  Scenario: Request payout
    Tool: Playwright
    Steps:
      1. Login as reseller with balance
      2. Navigate to payout page
      3. Fill bank details (name, account, bank)
      4. Enter amount
      5. Submit request
    Expected: Payout request created, status pending
    Evidence: .sisyphus/evidence/simulation-reseller-payout-request.png

  Scenario: Insufficient balance
    Tool: Playwright
    Steps: Same but request amount > balance
    Expected: Error "Insufficient balance"
    Evidence: .sisyphus/evidence/simulation-reseller-payout-insufficient.png
  ```

  **Commit**: NO

- [x] 9. Admin management simulation

  **What to do**:
  - Create `test-simulations/admin-management.spec.ts`
  - Simulate: Login as admin → Approve reseller → View all transactions → Approve payout → View reports
  - Verify: Reseller approved, payout processed, reports accurate
  - Capture: Screenshots of admin actions
  
  **Must NOT do**:
  - Do not modify production data
  - Do not skip approval workflows
  - Do not expose sensitive data

  **Recommended Agent Profile**:
  - Category: `quick` - Single test scenario
  - Skills: [`playwright`] - Browser automation needed
  - Omitted: [] - Playwright required

  **Parallelization**: Can Parallel: YES | Wave 2 | Blocks: [T10] | Blocked By: [T1,T2,T3]

  **References**:
  - UI: `Frontend/src/pages/Admin.tsx` - Admin panel
  - API: `backend/src/modules/admin/*.ts` - Admin operations
  - Migration: `supabase/migrations/20260514030000_accounts_catalog_pricing_order_snapshots.sql` - User roles

  **Acceptance Criteria**:
  - [x] Test script created and runs successfully
  - [x] Reseller approval workflow works
  - [x] Payout approval workflow works
  - [x] Reports display correctly
  - [x] Screenshots captured

  **QA Scenarios**:
  ```
  Scenario: Approve reseller
    Tool: Playwright
    Steps:
      1. Login as admin
      2. Navigate to reseller requests
      3. Click approve on pending reseller
      4. Verify status changed to approved
    Expected: Reseller status = approved
    Evidence: .sisyphus/evidence/simulation-admin-approve-reseller.png

  Scenario: Approve payout
    Tool: Playwright
    Steps:
      1. Login as admin
      2. Navigate to payout requests
      3. Click approve on pending payout
      4. Verify status changed to approved
    Expected: Payout status = approved
    Evidence: .sisyphus/evidence/simulation-admin-approve-payout.png
  ```

  **Commit**: NO

- [ ] 10. Verify all simulations passed

  **What to do**:
  - Run all test scripts from T4-T9
  - Collect results (pass/fail, screenshots, errors)
  - Verify database state matches expected
  - Check for any errors or warnings
  
  **Must NOT do**:
  - Do not skip failed tests
  - Do not ignore warnings
  - Do not proceed if critical tests fail

  **Recommended Agent Profile**:
  - Category: `quick` - Run existing tests
  - Skills: [`playwright`] - Test execution
  - Omitted: [] - Playwright required

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [T11] | Blocked By: [T4,T5,T6,T7,T8,T9]

  **References**:
  - Tests: `test-simulations/*.spec.ts` - All test scripts

  **Acceptance Criteria**:
  - [ ] All 6 test scripts executed
  - [ ] Pass/fail status collected
  - [ ] Screenshots saved to evidence folder
  - [ ] Database state verified
  - [ ] No critical errors

  **QA Scenarios**:
  ```
  Scenario: Run all tests
    Tool: Bash
    Steps: npx playwright test test-simulations/
    Expected: All tests pass
    Evidence: .sisyphus/evidence/simulation-all-tests-results.txt

  Scenario: Verify evidence files
    Tool: Bash
    Steps: (Get-ChildItem .sisyphus/evidence/simulation-*.png).Count
    Expected: 12+ screenshot files
    Evidence: .sisyphus/evidence/simulation-evidence-count.txt
  ```

  **Commit**: NO

- [ ] 11. Run TestSprite MCP final validation

  **What to do**:
  - Use TestSprite MCP to validate all user flows
  - Test Guest checkout, Reseller registration/transaction, Admin management
  - Collect TestSprite findings (bugs, UX issues, accessibility, performance)
  - Save TestSprite report to `.sisyphus/evidence/testsprite-validation-report.md`
  
  **Must NOT do**:
  - Do not skip TestSprite validation
  - Do not ignore TestSprite findings
  - Do not proceed without collecting all issues

  **Recommended Agent Profile**:
  - Category: `quick` - Run TestSprite validation
  - Skills: [] - TestSprite MCP handles testing
  - Omitted: All - MCP-based testing

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [T12] | Blocked By: [T10]

  **References**:
  - MCP: TestSprite MCP server
  - Demo: https://adnanpay.com/demo/
  - API: https://adnanpay.com/ppob-api/

  **Acceptance Criteria**:
  - [ ] TestSprite validation completed for all user flows
  - [ ] All findings collected and categorized
  - [ ] Report saved with severity levels
  - [ ] Screenshots/evidence from TestSprite included

  **QA Scenarios**:
  ```
  Scenario: Run TestSprite validation
    Tool: TestSprite MCP
    Steps: Validate all user flows (Guest, Reseller, Admin)
    Expected: Validation complete, findings collected
    Evidence: .sisyphus/evidence/testsprite-validation-report.md

  Scenario: Verify findings categorized
    Tool: Bash
    Steps: Get-Content .sisyphus/evidence/testsprite-validation-report.md | Select-String "Critical|High|Medium|Low"
    Expected: Findings categorized by severity
    Evidence: .sisyphus/evidence/testsprite-findings-categorized.txt
  ```

  **Commit**: NO

- [ ] 12. Apply fixes for TestSprite findings

  **What to do**:
  - Review TestSprite findings from T11
  - Prioritize: Critical → High → Medium → Low
  - Apply fixes to frontend/backend code
  - Document each fix with before/after comparison
  
  **Must NOT do**:
  - Do not skip critical/high severity issues
  - Do not introduce new bugs while fixing
  - Do not modify production code

  **Recommended Agent Profile**:
  - Category: `quick` - Apply targeted fixes
  - Skills: [] - No special skills needed
  - Omitted: All - Standard code fixes

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: [T13] | Blocked By: [T11]

  **References**:
  - Findings: `.sisyphus/evidence/testsprite-validation-report.md`
  - Frontend: `Frontend/src/`
  - Backend: `backend/src/`

  **Acceptance Criteria**:
  - [ ] All critical findings fixed
  - [ ] All high severity findings fixed
  - [ ] Medium/low findings fixed or documented as won't-fix
  - [ ] Each fix documented with rationale

  **QA Scenarios**:
  ```
  Scenario: Verify critical fixes applied
    Tool: Bash
    Steps: Check modified files match TestSprite findings
    Expected: All critical issues addressed
    Evidence: .sisyphus/evidence/testsprite-fixes-applied.txt

  Scenario: Verify no new errors introduced
    Tool: Bash
    Steps: npm run build (frontend and backend)
    Expected: Build succeeds, 0 errors
    Evidence: .sisyphus/evidence/testsprite-fixes-build-success.txt
  ```

  **Commit**: NO

- [ ] 13. Re-run TestSprite validation

  **What to do**:
  - Deploy fixes to demo environment
  - Re-run TestSprite MCP validation
  - Verify all fixed issues are resolved
  - Collect new TestSprite report
  
  **Must NOT do**:
  - Do not skip re-validation
  - Do not assume fixes worked without verification
  - Do not proceed if new issues found

  **Recommended Agent Profile**:
  - Category: `quick` - Re-run validation
  - Skills: [] - TestSprite MCP handles testing
  - Omitted: All - MCP-based testing

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: [T14] | Blocked By: [T12]

  **References**:
  - MCP: TestSprite MCP server
  - Demo: https://adnanpay.com/demo/
  - Previous: `.sisyphus/evidence/testsprite-validation-report.md`

  **Acceptance Criteria**:
  - [ ] TestSprite re-validation completed
  - [ ] All fixed issues verified as resolved
  - [ ] New report shows improvement
  - [ ] No new critical/high issues introduced

  **QA Scenarios**:
  ```
  Scenario: Re-run TestSprite
    Tool: TestSprite MCP
    Steps: Validate all user flows again
    Expected: Fixed issues resolved, no new critical issues
    Evidence: .sisyphus/evidence/testsprite-revalidation-report.md

  Scenario: Compare before/after
    Tool: Bash
    Steps: Compare issue counts between reports
    Expected: Issue count decreased
    Evidence: .sisyphus/evidence/testsprite-comparison.txt
  ```

  **Commit**: NO

- [ ] 14. Create fix report and summary

  **What to do**:
  - Create `.sisyphus/evidence/testsprite-fix-report.md`
  - Include: Before/after comparison, fixes applied, remaining issues, recommendations
  - Create `.sisyphus/evidence/user-simulation-summary.md` with complete results
  - Format: Markdown with tables, links to evidence files
  
  **Must NOT do**:
  - Do not hide unfixed issues
  - Do not make false claims about fixes
  - Do not skip documentation

  **Recommended Agent Profile**:
  - Category: `quick` - Create markdown reports
  - Skills: [] - No special skills needed
  - Omitted: All - Basic file operations

  **Parallelization**: Can Parallel: NO | Wave 4 | Blocks: [] | Blocked By: [T13]

  **References**:
  - Before: `.sisyphus/evidence/testsprite-validation-report.md`
  - After: `.sisyphus/evidence/testsprite-revalidation-report.md`
  - Fixes: Code changes from T12

  **Acceptance Criteria**:
  - [ ] Fix report created with before/after comparison
  - [ ] All fixes documented with rationale
  - [ ] Remaining issues listed with priority
  - [ ] Summary report includes all test results
  - [ ] Recommendations provided for future work

  **QA Scenarios**:
  ```
  Scenario: Verify fix report created
    Tool: Bash
    Steps: Test-Path .sisyphus/evidence/testsprite-fix-report.md
    Expected: File exists
    Evidence: .sisyphus/evidence/testsprite-fix-report-exists.txt

  Scenario: Verify summary completeness
    Tool: Bash
    Steps: Get-Content .sisyphus/evidence/user-simulation-summary.md | Select-String "Guest|Reseller|Admin|TestSprite"
    Expected: All sections present
    Evidence: .sisyphus/evidence/simulation-summary-complete.txt
  ```

  **Commit**: YES | Message: `test: add comprehensive user simulation with TestSprite validation and fixes` | Files: [test-simulations/*, test-fixtures/*, .sisyphus/evidence/*]

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.

- [ ] F1. Plan Compliance Audit — oracle
- [ ] F2. Code Quality Review — unspecified-high
- [ ] F3. Real Manual QA — unspecified-high (+ playwright if UI)
- [ ] F4. Scope Fidelity Check — deep

## Commit Strategy
- Commit after T14 with all test files, fixes, and evidence

## Success Criteria
- All 14 tasks completed
- All simulations passed
- TestSprite validation completed
- All critical/high findings fixed
- Evidence files created
- Fix report and summary complete
- User approval received
