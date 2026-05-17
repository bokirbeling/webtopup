# Frontend Navigation and Checkout Fixes

## TL;DR
> **Summary**: Connect all sitemap pages, fix checkout form to match Digiflazz API requirements
> **Deliverables**: Complete navigation links, dynamic Customer ID labels, remove Zone ID, optional email
> **Effort**: Quick
> **Parallel**: NO
> **Critical Path**: Navigation → Checkout form → Build → Deploy

## Context
### Original Request
User requested:
1. "sitemap yng belum terhubung hubungkan" - Connect all unlinked sitemap pages
2. "perbaiki demo cekout Customer ID 12345678 Zone ID 1234 Email sesuaikan kebutuhan inputan api digiflaz pada setiap jenis produk, email/nomor hape opsional"

### Current State
- Frontend: Vite app at `/demo/` with Header, Footer, GameTopUp components
- Header: Has nav links but no Dashboard/Admin links
- Footer: Has static links, not connected to actual pages
- GameTopUp checkout form: Has Customer ID, Zone ID (unused), Email (required)
- Digiflazz API: Only needs `customer_ref` (varies by product type), email optional

### Digiflazz API Requirements (from docs)
**Prepaid Topup** (`/api/buyer/topup`):
- `customer_no`: Customer ID/phone/account number (required)
- No zone_id field
- No email field required

**Postpaid Check Bill** (`/api/buyer/cek-tagihan`):
- `customer_no`: Customer ID (required)
- No zone_id field

**Product-specific customer_no formats**:
- PLN/Listrik: Nomor Pelanggan PLN (11-12 digits)
- Pulsa/Paket Data: Nomor HP (10-13 digits)
- Game (Mobile Legends): User ID + Zone ID combined as "userid(zoneid)" - e.g. "12345678(1234)"
- Game (Free Fire): User ID only
- Voucher/Google Play: Email or User ID
- E-money/GoPay/OVO: Nomor HP

## Work Objectives
### Core Objective
Fix frontend navigation and checkout form to match production requirements and Digiflazz API specs.

### Deliverables
1. Header with Dashboard and Admin links
2. Footer with working page links
3. Dynamic Customer ID label based on product category
4. Zone ID field only for Mobile Legends (combined with User ID in backend)
5. Email field optional (not required)
6. HotDeals component fetching from API catalog

### Definition of Done
- [ ] Header shows Dashboard and Admin links
- [ ] Mobile menu includes Dashboard and Admin
- [ ] Footer links navigate to correct pages
- [ ] Customer ID label changes based on product category
- [ ] Zone ID only shown for Mobile Legends products
- [ ] Email field has no `required` attribute
- [ ] HotDeals fetches from `/api/catalog` endpoint
- [ ] Frontend builds with 0 errors
- [ ] Deployed to `/demo/` and verified

### Must Have
- Dynamic Customer ID labels per product type
- Zone ID conditional rendering (ML only)
- Optional email field
- Working navigation links

### Must NOT Have
- Hardcoded product data in HotDeals
- Required email field
- Zone ID for non-ML products
- Broken navigation links

## Verification Strategy
> ZERO HUMAN INTERVENTION - all verification is agent-executed.
- Test decision: Manual QA via Playwright
- QA policy: Every task has agent-executed scenarios
- Evidence: `.sisyphus/evidence/task-{N}-{slug}.{ext}`

## Execution Strategy
### Parallel Execution Waves
> Sequential execution - each task depends on previous

Wave 1: Navigation fixes
Wave 2: Checkout form fixes
Wave 3: Build and deploy

### Dependency Matrix
- T1 → T2 → T3 → T4 → T5 → T6

### Agent Dispatch Summary
- Wave 1: 2 tasks (quick category)
- Wave 2: 3 tasks (quick category)
- Wave 3: 1 task (quick category)

## TODOs

- [ ] 1. Add Dashboard and Admin links to Header

  **What to do**:
  - Edit `Frontend/src/components/Header.tsx`
  - Add Dashboard and Admin links in desktop nav (after notification/cart icons)
  - Add Dashboard and Admin links in mobile menu
  - Use `<a href="/dashboard">` and `<a href="/admin">` for navigation

  **Must NOT do**:
  - Do not use React Router (app uses custom routing)
  - Do not break existing nav structure

  **Recommended Agent Profile**:
  - Category: `quick` - Simple component edit
  - Skills: [] - No special skills needed
  - Omitted: All - straightforward edit

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [T2] | Blocked By: []

  **References**:
  - Pattern: `Frontend/src/components/Header.tsx:62-75` - Existing action buttons structure
  - Pattern: `Frontend/src/components/Header.tsx:80-95` - Mobile menu structure
  - Pattern: `Frontend/src/App.tsx:29-35` - Dashboard and admin routing

  **Acceptance Criteria**:
  - [ ] Desktop header shows "Dashboard" and "Admin" links
  - [ ] Mobile menu shows "Dashboard" and "Admin" links
  - [ ] Links use `<a href="">` not `<button>`
  - [ ] Styling matches existing nav items

  **QA Scenarios**:
  ```
  Scenario: Desktop navigation shows Dashboard and Admin
    Tool: Playwright
    Steps:
      1. Navigate to https://adnanpay.com/demo/
      2. Check header for "Dashboard" link
      3. Check header for "Admin" link
    Expected: Both links visible and clickable
    Evidence: .sisyphus/evidence/task-1-header-nav.png

  Scenario: Mobile menu shows Dashboard and Admin
    Tool: Playwright
    Steps:
      1. Navigate to https://adnanpay.com/demo/
      2. Resize viewport to 375x667 (mobile)
      3. Click hamburger menu
      4. Check for "Dashboard" and "Admin" in menu
    Expected: Both links visible in mobile menu
    Evidence: .sisyphus/evidence/task-1-mobile-nav.png
  ```

  **Commit**: YES | Message: `feat(header): add dashboard and admin nav links` | Files: [Frontend/src/components/Header.tsx]

- [ ] 2. Update Footer links to actual pages

  **What to do**:
  - Edit `Frontend/src/components/Footer.tsx`
  - Change "Tentang Kami", "Karir", "Blog" etc to actual page links or remove if not implemented
  - Add Dashboard and Admin to footer navigation
  - Keep social media links as `#` (not implemented yet)

  **Must NOT do**:
  - Do not create new pages (only link to existing)
  - Do not break footer layout

  **Recommended Agent Profile**:
  - Category: `quick` - Simple link updates
  - Skills: [] - No special skills needed
  - Omitted: All - straightforward edit

  **Parallelization**: Can Parallel: NO | Wave 1 | Blocks: [T3] | Blocked By: [T1]

  **References**:
  - Pattern: `Frontend/src/components/Footer.tsx:3-7` - Current footer links structure
  - Pattern: `Frontend/src/App.tsx:22-37` - Available routes

  **Acceptance Criteria**:
  - [ ] Footer links navigate to existing pages or removed
  - [ ] Dashboard and Admin links added to footer
  - [ ] No broken links (404 errors)

  **QA Scenarios**:
  ```
  Scenario: Footer links work correctly
    Tool: Playwright
    Steps:
      1. Navigate to https://adnanpay.com/demo/
      2. Scroll to footer
      3. Click each link in footer
      4. Verify no 404 errors
    Expected: All links navigate successfully or are disabled
    Evidence: .sisyphus/evidence/task-2-footer-links.txt
  ```

  **Commit**: YES | Message: `feat(footer): update links to actual pages` | Files: [Frontend/src/components/Footer.tsx]

- [ ] 3. Make Customer ID label dynamic based on product category

  **What to do**:
  - Edit `Frontend/src/components/GameTopUp.tsx`
  - Add function to determine Customer ID label based on product category/name
  - Update form label to use dynamic text
  - Logic:
    - PLN/Listrik → "Nomor Pelanggan PLN"
    - Pulsa/Paket Data → "Nomor HP"
    - Mobile Legends → "User ID"
    - Free Fire → "User ID"
    - Voucher/Google Play → "Email / User ID"
    - E-money/GoPay/OVO → "Nomor HP"
    - Default → "ID Pelanggan / Nomor Tujuan"

  **Must NOT do**:
  - Do not change API payload structure yet
  - Do not remove Zone ID field yet (next task)

  **Recommended Agent Profile**:
  - Category: `quick` - Simple conditional rendering
  - Skills: [] - No special skills needed
  - Omitted: All - straightforward logic

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [T4] | Blocked By: [T2]

  **References**:
  - Pattern: `Frontend/src/components/GameTopUp.tsx:82-91` - Category image detection logic
  - Pattern: `Frontend/src/components/GameTopUp.tsx:258-260` - Form state variables
  - API: `docs/digiflazz-buyer/topup.md` - Digiflazz customer_no requirements

  **Acceptance Criteria**:
  - [ ] Customer ID label changes based on selected product
  - [ ] PLN products show "Nomor Pelanggan PLN"
  - [ ] Pulsa products show "Nomor HP"
  - [ ] Game products show "User ID"
  - [ ] Voucher products show "Email / User ID"

  **QA Scenarios**:
  ```
  Scenario: Customer ID label changes for PLN product
    Tool: Playwright
    Steps:
      1. Navigate to https://adnanpay.com/demo/
      2. Scroll to product catalog
      3. Click PLN product
      4. Check Customer ID label text
    Expected: Label shows "Nomor Pelanggan PLN"
    Evidence: .sisyphus/evidence/task-3-pln-label.png

  Scenario: Customer ID label changes for Pulsa product
    Tool: Playwright
    Steps:
      1. Navigate to https://adnanpay.com/demo/
      2. Click Pulsa product
      3. Check Customer ID label text
    Expected: Label shows "Nomor HP"
    Evidence: .sisyphus/evidence/task-3-pulsa-label.png
  ```

  **Commit**: YES | Message: `feat(checkout): dynamic customer id label per product` | Files: [Frontend/src/components/GameTopUp.tsx]

- [ ] 4. Make Zone ID conditional (Mobile Legends only) and combine with User ID

  **What to do**:
  - Edit `Frontend/src/components/GameTopUp.tsx`
  - Show Zone ID field only when product name contains "Mobile Legends" or "MLBB"
  - When Zone ID present, combine with User ID as "userid(zoneid)" in `customer_ref` payload
  - When Zone ID not present, use User ID directly as `customer_ref`
  - Update form rendering to conditionally show Zone ID input

  **Must NOT do**:
  - Do not remove Zone ID state variable (still needed for ML)
  - Do not break existing checkout flow

  **Recommended Agent Profile**:
  - Category: `quick` - Conditional rendering + payload logic
  - Skills: [] - No special skills needed
  - Omitted: All - straightforward conditional

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [T5] | Blocked By: [T3]

  **References**:
  - Pattern: `Frontend/src/components/GameTopUp.tsx:82-91` - Category detection logic
  - Pattern: `Frontend/src/components/GameTopUp.tsx:400-450` - Form submission logic
  - API: `docs/digiflazz-buyer/topup.md` - Digiflazz customer_no format

  **Acceptance Criteria**:
  - [ ] Zone ID field only shown for Mobile Legends products
  - [ ] Zone ID hidden for other products
  - [ ] ML checkout combines User ID and Zone ID as "userid(zoneid)"
  - [ ] Non-ML checkout uses User ID directly

  **QA Scenarios**:
  ```
  Scenario: Zone ID shown for Mobile Legends
    Tool: Playwright
    Steps:
      1. Navigate to https://adnanpay.com/demo/
      2. Click Mobile Legends product
      3. Check for Zone ID input field
    Expected: Zone ID field visible
    Evidence: .sisyphus/evidence/task-4-ml-zoneid.png

  Scenario: Zone ID hidden for Free Fire
    Tool: Playwright
    Steps:
      1. Navigate to https://adnanpay.com/demo/
      2. Click Free Fire product
      3. Check for Zone ID input field
    Expected: Zone ID field not visible
    Evidence: .sisyphus/evidence/task-4-ff-no-zoneid.png
  ```

  **Commit**: YES | Message: `feat(checkout): conditional zone id for mobile legends` | Files: [Frontend/src/components/GameTopUp.tsx]

- [ ] 5. Make email field optional

  **What to do**:
  - Edit `Frontend/src/components/GameTopUp.tsx`
  - Remove `required` attribute from email input field
  - Update form validation to allow empty email
  - Update API payload to only include email if provided
  - Change label to "Email (opsional)" or "Email / Nomor HP (opsional)"

  **Must NOT do**:
  - Do not remove email field entirely
  - Do not break form submission when email empty

  **Recommended Agent Profile**:
  - Category: `quick` - Remove attribute + conditional payload
  - Skills: [] - No special skills needed
  - Omitted: All - straightforward change

  **Parallelization**: Can Parallel: NO | Wave 2 | Blocks: [T6] | Blocked By: [T4]

  **References**:
  - Pattern: `Frontend/src/components/GameTopUp.tsx:260` - Email state variable
  - Pattern: `Frontend/src/components/GameTopUp.tsx:400-450` - Form submission
  - API: `backend/src/modules/order/order.types.ts` - Order payload structure

  **Acceptance Criteria**:
  - [ ] Email input has no `required` attribute
  - [ ] Email label shows "(opsional)"
  - [ ] Form submits successfully with empty email
  - [ ] API payload excludes email field when empty

  **QA Scenarios**:
  ```
  Scenario: Checkout works without email
    Tool: Playwright
    Steps:
      1. Navigate to https://adnanpay.com/demo/
      2. Click any product
      3. Fill Customer ID only (leave email empty)
      4. Click checkout button
    Expected: Form submits successfully, no validation error
    Evidence: .sisyphus/evidence/task-5-optional-email.png
  ```

  **Commit**: YES | Message: `feat(checkout): make email field optional` | Files: [Frontend/src/components/GameTopUp.tsx]

- [ ] 6. Build, deploy, and verify

  **What to do**:
  - Run `npm run build` in `Frontend/` directory
  - Package build output as `frontend-fixes.tar.gz`
  - Upload to Natanetwork server via SCP
  - Extract to `/home/adnanpay/public_html/demo/`
  - Verify all changes via Playwright:
    - Navigation links work
    - Customer ID labels dynamic
    - Zone ID conditional
    - Email optional
    - Checkout flow works

  **Must NOT do**:
  - Do not deploy to production root (only /demo/)
  - Do not skip verification

  **Recommended Agent Profile**:
  - Category: `quick` - Build and deploy
  - Skills: [`adnanpay-natanetwork`, `playwright`] - Server access and testing
  - Omitted: [] - Need both skills

  **Parallelization**: Can Parallel: NO | Wave 3 | Blocks: [] | Blocked By: [T5]

  **References**:
  - Pattern: `Frontend/vite.config.ts` - Build config with base: '/demo/'
  - Pattern: `.sisyphus/evidence/demo-ui-replacement.md` - Previous deployment steps
  - Server: `103.164.173.46:31988` user `adnanpay`

  **Acceptance Criteria**:
  - [ ] Build completes with 0 errors
  - [ ] Files deployed to /demo/ directory
  - [ ] Navigation links verified working
  - [ ] Customer ID labels verified dynamic
  - [ ] Zone ID verified conditional
  - [ ] Email verified optional
  - [ ] Checkout flow verified end-to-end

  **QA Scenarios**:
  ```
  Scenario: Full checkout flow with all fixes
    Tool: Playwright
    Steps:
      1. Navigate to https://adnanpay.com/demo/
      2. Click Dashboard link (verify navigation)
      3. Go back to home
      4. Click PLN product
      5. Verify Customer ID label is "Nomor Pelanggan PLN"
      6. Verify Zone ID field not shown
      7. Fill Customer ID: "12345678901"
      8. Leave email empty
      9. Click checkout
      10. Verify order created successfully
    Expected: All steps pass, checkout completes
    Evidence: .sisyphus/evidence/task-6-full-flow.png

  Scenario: Mobile Legends with Zone ID
    Tool: Playwright
    Steps:
      1. Navigate to https://adnanpay.com/demo/
      2. Click Mobile Legends product
      3. Verify Customer ID label is "User ID"
      4. Verify Zone ID field shown
      5. Fill User ID: "12345678"
      6. Fill Zone ID: "1234"
      7. Leave email empty
      8. Click checkout
      9. Verify customer_ref sent as "12345678(1234)"
    Expected: Zone ID combined with User ID correctly
    Evidence: .sisyphus/evidence/task-6-ml-zoneid.png
  ```

  **Commit**: NO | Message: N/A | Files: []

## Final Verification Wave (MANDATORY — after ALL implementation tasks)
> 4 review agents run in PARALLEL. ALL must APPROVE. Present consolidated results to user and get explicit "okay" before completing.
> **Do NOT auto-proceed after verification. Wait for user's explicit approval before marking work complete.**
> **Never mark F1-F4 as checked before getting user's okay.** Rejection or user feedback -> fix -> re-run -> present again -> wait for okay.

- [ ] F1. Plan Compliance Audit — oracle
  - Verify all 6 tasks completed
  - Check navigation links working
  - Check Customer ID labels dynamic
  - Check Zone ID conditional
  - Check email optional
  - Evidence: `.sisyphus/evidence/final-f1-compliance.md`

- [ ] F2. Code Quality Review — unspecified-high
  - Check TypeScript compilation
  - Check no console errors
  - Check form validation logic
  - Check API payload structure
  - Evidence: `.sisyphus/evidence/final-f2-quality.md`

- [ ] F3. Real Manual QA — unspecified-high + playwright
  - Test all navigation links
  - Test all product categories
  - Test Mobile Legends with Zone ID
  - Test other products without Zone ID
  - Test checkout with and without email
  - Evidence: `.sisyphus/evidence/final-f3-qa.md`

- [ ] F4. Scope Fidelity Check — deep
  - Verify all user requirements met
  - Check no scope creep
  - Check Digiflazz API compliance
  - Evidence: `.sisyphus/evidence/final-f4-fidelity.md`

## Commit Strategy
- Commit after each task (T1-T5)
- No commit for T6 (deployment only)
- Use conventional commit format: `feat(scope): description`

## Success Criteria
- All navigation links work
- Customer ID labels change per product type
- Zone ID only shown for Mobile Legends
- Email field optional
- Checkout flow works end-to-end
- Deployed to /demo/ and verified
- User approves final verification

---

**Plan Created**: 2026-05-16T23:05:30.768Z
**Created By**: Prometheus
**Status**: READY FOR EXECUTION
