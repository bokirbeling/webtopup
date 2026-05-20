# Security Hardening Report — PPOB Payment Backend

## Executive Summary
- Date: May 20, 2026
- Scope: SQL injection prevention, input validation, E2E payment verification
- Status: COMPLETE

## Findings & Fixes

### 1. SQL Injection Prevention
- MySQL repository `MySqlCatalogRepository` fully parameterizes all product catalog queries.
- Supabase database tables bound in repositories use parameterized rest requests.
- Zero raw SQL string concatenation found across backend repositories.

### 2. Zod Input Validation
- Migrated manual validation functions in catalog, auth, order, payment, and dashboard routers to robust Zod schemas inside `backend/src/shared/validation.ts`.
- Added new strict Zod schemas for:
  - `createPricingRuleSchema` (validated scope constraints for global, category, product rule types)
  - `updatePricingRuleSchema`
  - `trustedPriceBodySchema` (rejects server-controlled final_price, price, base_price, admin_fee, commission, commission_rate, markup, markup_fixed, markup_percentage fields)
  - `deleteProductParamsSchema` (ensures parameters are valid UUIDs)
- Registered schemas on Express router endpoints using the `zodValidate()` middleware, ensuring comprehensive request body, params, and query validation.

### 3. E2E Payment Verification
- Verified full payment lifecycle end-to-end on the running demo server at `https://demo.hanzserver.online/api`:
  - User registration/login successfully returns valid JWT token.
  - Order creation with lowercase provider `"digiflazz"` correctly records order in Supabase with `pending_payment` status.
  - Midtrans Snap initialization successfully returns a sandbox token and redirection URL.
  - Webhook settlement notification (signed using SHA512) is processed correctly, transitions the order to `paid` status, and triggers automatic background Digiflazz topup.
  - Digiflazz topup automatically falls back to `"mock"` mode when development keys are used, creates the fulfillment record, and transitions the order status to terminal `success` status in the background.

## Security Posture Summary
| Area | Status | Notes |
|------|--------|-------|
| SQL Injection | MITIGATED | Strictly parameterized catalog and Supabase queries |
| Input Validation | COMPLETE | Comprehensive Zod schemas on all endpoint inputs |
| Webhook Auth | VERIFIED | Valid signature validation via SHA512 checks |
| Rate Limiting | ACTIVE | 30 req/min global, 120 catalog with trust proxy |

## Remaining Recommendations
- Keep using HTTPS/SSL for all production API routes and webhooks.
- Regularly rotation of the Midtrans server key and Digiflazz API key in production environment.
- Monitor the ledger and audit logs for anomalous transactions or rate limit breaches.
