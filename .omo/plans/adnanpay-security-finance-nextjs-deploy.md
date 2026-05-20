# Adnanpay Security, Finance, Affiliate, Tax, and Next.js Deploy

## TL;DR

Implement the unfinished follow-up work from `digiflazz-buyer-api-alignment.md` as a fresh executable Sisyphus plan because the original plan is already marked complete by the hook. Scope: harden Midtrans/Digiflazz truth sources, persist provider histories, add reseller/affiliate commission + performance curves, add encrypted manual payout workflow, add internal-only PPh Final 0.5% tax reporting, then deploy the completed static Next.js frontend as the main `adnanpay.com` frontend while keeping Express backend under `/ppob-api`.

## Non-Negotiable Decisions

- Payment truth comes only from Midtrans API/webhook; never frontend/admin/client status.
- Purchase/fulfillment truth comes only from Digiflazz API/callback/recheck; never frontend/admin/client status.
- Tax does not touch transaction purity. Tax is internal reporting only after Midtrans paid + Digiflazz success + order final success.
- Affiliate is not reseller/seller. Affiliate cannot sell products, edit prices, manage products, or access reseller tools.
- Reseller sees only own sales/performance. Affiliate sees only transactions attributed to own promo/referral code. Admin sees all.
- Payout identity/bank data must be encrypted at rest. Admin decrypt/view must be audited.
- N8 deployment waits until S1-S7 are implemented and verified. Deployment mode: static/artifact Next.js deploy. `/ppob-api` backend remains unchanged.

## TODOs

- [x] S1. Harden payment truth source: Midtrans API/webhook only
  - What to do:
    - Audit `backend/src/modules/payment/*`, order lifecycle, invoice status, and admin/payment mutation surfaces.
    - Ensure payment status transitions only from valid Midtrans webhook signature or backend Midtrans status API/recheck.
    - Verify `signature_key`, `order_id`/provider reference, exact `gross_amount`, allowed `transaction_status`, acceptable `fraud_status` before marking paid.
    - Reject/safely log invalid signature, amount mismatch, unknown reference, paid callback for expired/cancelled order, conflicting repeated webhook.
    - Add immutable audit/event records for webhook received, verification result, accepted/rejected status transition, mismatch, and recheck.
    - Add docs `docs/payment-integrity/midtrans-response-flow.md`.
  - Must not:
    - Do not let frontend/admin/client set payment status, order status, or `paid_at`.
    - Do not fulfill Digiflazz product because frontend says payment succeeded.
    - Do not expose Midtrans server key.
  - Acceptance Criteria:
    - Fake webhook rejected.
    - Wrong amount rejected.
    - Valid settlement/capture with verified signature marks paid once.
    - Duplicate webhook idempotent.
    - Frontend/admin override attempts fail.
  - Evidence:
    - `.sisyphus/evidence/security-task-s1-midtrans-truth-source.txt`
    - `.sisyphus/evidence/security-task-s1-fake-payment-rejected.txt`
    - `.sisyphus/evidence/security-task-s1-midtrans-docs.txt`

- [x] S2. Harden purchase truth source: Digiflazz API/callback only
  - What to do:
    - Audit `backend/src/modules/fulfillment/*`, Digiflazz Buyer client, postpaid flows, and admin/manual mutation surfaces.
    - Ensure fulfillment status comes only from Digiflazz API response, valid callback, or backend recheck tied to stored `ref_id`.
    - Require paid order verified by S1 before fulfillment trigger.
    - Verify `ref_id`, HMAC signature when configured, status/rc/message, idempotency key/event key.
    - Add reconciliation for paid-no-fulfillment, Digiflazz success but payment unverified, pending recheck, failed retry/manual review.
    - Add docs `docs/payment-integrity/digiflazz-response-flow.md`.
  - Must not:
    - Do not let frontend trigger unpaid fulfillment.
    - Do not let admin mark fulfillment success without Digiflazz proof.
    - Do not trust customer-provided SN/rc/status.
    - Do not duplicate topup for same successful fulfillment.
  - Acceptance Criteria:
    - Unpaid order blocked.
    - Fake paid order blocked.
    - Valid paid order triggers one Digiflazz request with stable ref_id.
    - Success callback marks once and duplicate callback does not duplicate fulfillment.
  - Evidence:
    - `.sisyphus/evidence/security-task-s2-digiflazz-truth-source.txt`
    - `.sisyphus/evidence/security-task-s2-duplicate-fulfillment-blocked.txt`
    - `.sisyphus/evidence/security-task-s2-digiflazz-docs.txt`

- [x] S3. Add anti-fraud state machine and reconciliation test matrix
  - What to do:
    - Define allowed transitions for order, payment, fulfillment, webhook/provider event, invoice.
    - Add fraud test matrix: client price tampering, fake Midtrans webhook, amount mismatch, duplicate webhook, expired/cancelled order paid callback, fulfillment before payment, duplicate Digiflazz callback, Digiflazz success but payment unverified, admin attempts mark payment/fulfillment without proof, frontend fake provider fields, role escalation.
    - Add admin reconciliation summary and docs `docs/payment-integrity/state-machine-and-reconciliation.md`.
  - Acceptance Criteria:
    - Docs cross-link Midtrans/Digiflazz truth flows.
    - Fraud suite passes and rejected paths are safe.
    - Frontend display vs backend trust boundary explained.
  - Evidence:
    - `.sisyphus/evidence/security-task-s3-fraud-matrix.txt`
    - `.sisyphus/evidence/security-task-s3-reconciliation.txt`
    - `.sisyphus/evidence/security-task-s3-integrity-docs.txt`

- [x] S4. Persist complete provider response history and expose transaction tables
  - What to do:
    - Create append-only provider response/event history for Midtrans and Digiflazz.
    - Store every important response: Midtrans payment creation/webhook/status recheck; Digiflazz topup request/response/callback/recheck/postpaid inquiry/pay/status.
    - Required fields include order/payment/fulfillment IDs, provider, event type, provider reference, provider status/code/message, amount, SKU, masked customer number, serial number, signature verified, amount matched, idempotency/event key, raw payload, safe summary, created_at.
    - Add read APIs: reseller/member own transactions only; affiliate own promo/referral transactions only; admin full process all users/resellers/affiliates.
    - Add admin filters: date, provider, status/code, product/category, invoice/ref_id, reseller/user email, role, reseller status.
    - Add admin balance panels: Digiflazz saldo API/manual/calculated ledger, Midtrans manual/calculated ledger.
    - Add docs `docs/payment-integrity/provider-response-history.md`.
  - Must not:
    - Do not expose secrets/signatures/API keys/sensitive customer data.
    - Do not let reseller/affiliate see other users' transactions.
    - Do not overwrite old event rows.
    - Do not let balance manual input mark payment/fulfillment success.
  - Acceptance Criteria:
    - Every provider response appends structured DB event.
    - Admin history table shows all process with reseller/user identity columns.
    - Reseller isolation and affiliate isolation tested.
    - Admin Digiflazz/Midtrans balance ledgers are immutable append-only.
  - Evidence:
    - `.sisyphus/evidence/security-task-s4-provider-history-schema.txt`
    - `.sisyphus/evidence/security-task-s4-reseller-history-table.txt`
    - `.sisyphus/evidence/security-task-s4-admin-history-table.txt`
    - `.sisyphus/evidence/security-task-s4-provider-history-docs.txt`
    - `.sisyphus/evidence/security-task-s4-admin-balance-ledgers.txt`

- [ ] S5. Add affiliate/reseller performance, referral/discount code, commission ledger, and curves
  - What to do:
    - Define affiliate-only user as marketing/referral account, not seller/reseller.
    - Affiliate-only dashboard: own referral/promo code, own attributed transactions, total commission, pending/payable balance, payout request/history, performance curve.
    - Affiliate must not have selling/product/pricing/markup controls.
    - Reseller dashboard: own sales, own commission/margin, own monthly sales curve, payout status.
    - Admin dashboard: all reseller sales curve, all affiliate referral curve, top reseller, top affiliate, commission balances, payout totals.
    - Add unique referral/affiliate codes and discount codes with backend-only discount/commission calculation.
    - Commission ledger becomes payable only after Midtrans verified paid + Digiflazz verified success.
    - Series rows include `period`, `transaction_count`, `success_count`, `failed_count`, `gross_sales_minor`, `commission_minor`, `payable_minor`, `payout_requested_minor`, `payout_paid_minor`.
    - Add docs `docs/payment-integrity/referral-discount-commission.md`.
  - Must not:
    - Do not let frontend choose commission/discount values.
    - Do not let affiliate edit prices, products, margins, discounts, or commission percent.
    - Do not show affiliate all sales; only own code attribution.
    - Do not build curves from client-side cached/editable data.
  - Acceptance Criteria:
    - Affiliate-only account sees only own referral transactions, commission totals, withdrawable balance, payout history.
    - Reseller sees only own sales curve.
    - Admin sees all curves/top lists.
    - Cross-user curve access blocked.
    - Tests cover valid/invalid/duplicate/expired/tampered codes, commission after success, no commission after failed payment/fulfillment.
  - Evidence:
    - `.sisyphus/evidence/security-task-s5-referral-discount-schema.txt`
    - `.sisyphus/evidence/security-task-s5-commission-calculation.txt`
    - `.sisyphus/evidence/security-task-s5-reseller-performance-ui.txt`
    - `.sisyphus/evidence/security-task-s5-performance-curves.txt`
    - `.sisyphus/evidence/security-task-s5-referral-discount-docs.txt`

- [ ] S6. Add manual payout withdrawal workflow with encrypted identity data
  - What to do:
    - User/reseller/affiliate can request withdrawal from payable balance only.
    - Add dashboard payout menu: payable balance, pending requests, paid/rejected history, create request.
    - Add admin payout menu: list all requests, filters, approve/reject/process/mark paid, bank fee/deduction, proof/reference note.
    - Required identity/bank data: legal name, NIK, address, bank, account number, account holder, phone/email if available.
    - Encrypt sensitive identity/bank fields at rest with backend-only key; store fingerprint/hash where useful.
    - Admin decrypt/view endpoint protected and audited with admin id, timestamp, reason.
    - Reserve balance on request to prevent double withdrawal; release on rejected/cancelled; mark ledger paid on paid.
    - Add docs `docs/payment-integrity/manual-payout-withdrawal.md`.
  - Must not:
    - Do not use Midtrans as automatic payout/disbursement.
    - Do not store plaintext NIK/address/account.
    - Do not expose decrypted data to public/reseller UI except masked summary.
    - Do not allow over-withdrawal.
  - Acceptance Criteria:
    - Encrypted storage verified by DB query.
    - Admin decrypt audit logged.
    - Bank fee and net amount stored/displayed.
    - Reseller/affiliate sees own payout only; admin sees all.
    - Tests cover insufficient balance, encryption, fee, transitions, isolation, paid ledger update.
  - Evidence:
    - `.sisyphus/evidence/security-task-s6-payout-schema.txt`
    - `.sisyphus/evidence/security-task-s6-encrypted-identity.txt`
    - `.sisyphus/evidence/security-task-s6-admin-payout-dashboard.txt`
    - `.sisyphus/evidence/security-task-s6-reseller-payout-dashboard.txt`
    - `.sisyphus/evidence/security-task-s6-payout-docs.txt`

- [ ] S7. Add internal PPh Final 0.5% tax allocation and reporting after success only
  - What to do:
    - Preserve transaction purity: tax calculation is internal reporting only and must never affect checkout, Midtrans payment amount, Digiflazz amount, fulfillment, invoice, customer/reseller amount charged, or provider status.
    - Run tax allocation only after Midtrans payment verified successful and Digiflazz fulfillment successful where delivery is required.
    - Use existing `orders/payments/fulfillments/users`, not standalone conflicting `transactions` table.
    - Use integer minor units: modal/base cost snapshot, selling price snapshot, gross commission, PPh Final tax allocation.
    - Formula: `gross_commission_minor = max(selling_price_minor - modal_price_minor, 0)`; `tax_allocation_minor = round(gross_commission_minor * 0.005)`.
    - Add `tax_rate_basis_points = 50` default for 0.5% auditability.
    - Add admin tax report `GET /api/admin/reports/tax?month=MM&year=YYYY`.
    - Add UI checkbox: `Tampilkan profit setelah pajak`; unchecked shows gross profit, checked shows net profit after tax; display only, no mutation.
    - Add docs `docs/payment-integrity/tax-pph-final-reporting.md`.
  - Must not:
    - Do not put tax in critical path before transaction success.
    - Do not let tax failure fail a paid order or stop fulfillment.
    - Do not alter selling price, amount_minor, Midtrans gross_amount, Digiflazz payload, reseller/customer invoice amount.
    - Do not count pending/failed/expired/cancelled/refunded/unverified transactions as taxable.
  - Acceptance Criteria:
    - Checkout/payment/fulfillment tests pass unchanged with tax enabled.
    - Tax error logs for accounting review without mutating transaction state.
    - Admin report returns month/year totals: successful count, modal total, selling total, gross commission, tax payable.
    - Fraud/tamper/exclusion cases do not increase tax payable.
    - Tests cover rounding, zero/negative commission, month boundary/timezone, auth, reseller isolation if exposed.
  - Evidence:
    - `.sisyphus/evidence/security-task-s7-tax-schema.txt`
    - `.sisyphus/evidence/security-task-s7-tax-report-api.txt`
    - `.sisyphus/evidence/security-task-s7-tax-fraud-exclusions.txt`
    - `.sisyphus/evidence/security-task-s7-tax-docs.txt`

- [ ] N8. Deploy static Next.js frontend after S1-S7
  - What to do:
    - Execute only after S1-S7 are complete and verified.
    - Use static/artifact deploy. Next.js becomes the main `https://adnanpay.com` frontend.
    - Preserve Express backend under `/ppob-api` unchanged.
    - Backup `/home/adnanpay/public_html` before replace.
    - Prefer GitHub push for source, then local build artifact upload if server build lacks dev dependencies.
    - Smoke live `/`, `/dashboard`, `/admin`, `/invoice/:code`, catalog images, auth, admin, `/ppob-api/health`.
  - Acceptance Criteria:
    - `adnanpay.com` serves Next.js frontend.
    - `/ppob-api/health` remains OK.
    - Rollback documented and tested enough to execute safely.
  - Evidence:
    - `.sisyphus/evidence/nextjs-task-8-deploy-smoke.txt`
    - `.sisyphus/evidence/nextjs-task-8-rollback.txt`

## Final Verification Wave

- [ ] F1. Plan compliance audit
- [ ] F2. Code quality and security review
- [ ] F3. Manual QA / live smoke review
- [ ] F4. Scope fidelity review
ke