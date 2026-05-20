# Final Verification Wave - Manual QA / Live Smoke Review

**Date**: 2026-05-16T17:31:30.924Z
**Plan**: adnanpay-security-finance-nextjs-deploy.md
**Reviewer**: Sisyphus

## F3. Manual QA / Live Smoke Review

### Pre-Deployment Checklist

#### Environment Verification
- [ ] Backend running on `localhost:3001`
- [ ] Supabase connection active
- [ ] Environment variables loaded
- [ ] Migrations applied successfully
- [ ] Next.js build succeeds

#### Database State
- [ ] All 9 migrations applied
- [ ] RLS policies active
- [ ] Indexes created
- [ ] Functions deployed

---

### Backend API Smoke Tests

#### Health & Status Endpoints

**Test 1: Backend Health Check**
```bash
curl http://localhost:3001/health
```
**Expected**: `200 OK` with health status

**Test 2: API Version**
```bash
curl http://localhost:3001/version
```
**Expected**: Version information

---

#### Authentication Flow

**Test 3: User Registration**
```bash
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!",
    "name": "Test User"
  }'
```
**Expected**: User created, verification email sent

**Test 4: Email Verification**
```bash
curl -X POST http://localhost:3001/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<verification_token>"
  }'
```
**Expected**: Email verified, user active

**Test 5: User Login**
```bash
curl -X POST http://localhost:3001/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```
**Expected**: JWT token returned

---

#### Catalog & Products

**Test 6: Get Product Catalog**
```bash
curl http://localhost:3001/catalog
```
**Expected**: List of products with pricing

**Test 7: Get Product by SKU**
```bash
curl http://localhost:3001/catalog/pulsa-10k
```
**Expected**: Product details

---

#### Order Flow (Guest Checkout)

**Test 8: Create Order**
```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "pulsa-10k",
    "customerPhone": "081234567890",
    "customerEmail": "customer@example.com"
  }'
```
**Expected**: Order created, payment URL returned

**Test 9: Get Order Status**
```bash
curl http://localhost:3001/orders/<order_id>
```
**Expected**: Order details with status

**Test 10: Invoice Lookup**
```bash
curl http://localhost:3001/invoice/<invoice_code>
```
**Expected**: Invoice details

---

#### Commission System (S5)

**Test 11: Create Referral Code**
```bash
curl -X POST http://localhost:3001/commission/referral-codes \
  -H "Authorization: Bearer <reseller_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "RESELLER2026"
  }'
```
**Expected**: Referral code created

**Test 12: Apply Referral Code**
```bash
curl -X POST http://localhost:3001/orders \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "pulsa-10k",
    "customerPhone": "081234567890",
    "referralCode": "RESELLER2026"
  }'
```
**Expected**: Order with referral attribution

**Test 13: Get Commission Balance**
```bash
curl http://localhost:3001/commission/balance \
  -H "Authorization: Bearer <reseller_token>"
```
**Expected**: Payable balance amount

---

#### Payout System (S6)

**Test 14: Request Payout**
```bash
curl -X POST http://localhost:3001/payout/request \
  -H "Authorization: Bearer <reseller_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amountMinor": 1000000,
    "identityData": {
      "legalName": "John Doe",
      "nik": "1234567890123456",
      "address": "Jl. Example No. 123",
      "bankName": "BCA",
      "accountNumber": "1234567890",
      "accountHolder": "John Doe",
      "phone": "081234567890",
      "email": "john@example.com"
    }
  }'
```
**Expected**: Payout request created, balance reserved

**Test 15: Get User Payout Requests**
```bash
curl http://localhost:3001/payout/my-requests \
  -H "Authorization: Bearer <reseller_token>"
```
**Expected**: List of user's payout requests (masked data)

**Test 16: Admin List All Payouts**
```bash
curl http://localhost:3001/admin/payout/requests?status=pending \
  -H "Authorization: Bearer <admin_token>"
```
**Expected**: All pending payout requests

**Test 17: Admin Decrypt Identity**
```bash
curl -X POST http://localhost:3001/admin/payout/decrypt/<payout_id> \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Processing payout for verification"
  }'
```
**Expected**: Decrypted identity data, audit log created

**Test 18: Admin Approve Payout**
```bash
curl -X POST http://localhost:3001/admin/payout/approve/<payout_id> \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "bankFeeMinor": 5000
  }'
```
**Expected**: Payout approved

**Test 19: Admin Mark Payout Paid**
```bash
curl -X POST http://localhost:3001/admin/payout/mark-paid/<payout_id> \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "proofReference": "TRX-2026051617-001"
  }'
```
**Expected**: Payout marked paid, ledger updated

---

#### Tax System (S7)

**Test 20: Admin Get Tax Allocations**
```bash
curl http://localhost:3001/admin/tax/allocations?period=2026-05 \
  -H "Authorization: Bearer <admin_token>"
```
**Expected**: Tax allocations for period

**Test 21: Admin Generate Tax Report**
```bash
curl -X POST http://localhost:3001/admin/tax/generate-report \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "period": "2026-05"
  }'
```
**Expected**: Aggregated tax report

**Test 22: Admin Export Tax Report**
```bash
curl -X POST http://localhost:3001/admin/tax/export-report \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "period": "2026-05",
    "format": "csv",
    "reference": "TAX-REPORT-2026-05"
  }'
```
**Expected**: Report exported, metadata updated

---

### Frontend Smoke Tests (Next.js)

#### Public Pages

**Test 23: Homepage**
- URL: `http://localhost:3000/`
- Expected: Homepage loads, no console errors
- Check: Hero section, product categories, CTA buttons

**Test 24: Product Catalog**
- URL: `http://localhost:3000/catalog`
- Expected: Product list with images and prices
- Check: Filtering, sorting, search

**Test 25: Invoice Lookup**
- URL: `http://localhost:3000/invoice/<code>`
- Expected: Invoice details, payment status
- Check: Order details, payment method, status badge

---

#### Authenticated Pages

**Test 26: User Dashboard**
- URL: `http://localhost:3000/dashboard`
- Expected: User dashboard with order history
- Check: Recent orders, balance, profile

**Test 27: Reseller Dashboard**
- URL: `http://localhost:3000/dashboard/reseller`
- Expected: Reseller metrics and commission
- Check: Sales curve, commission balance, referral code

**Test 28: Payout Request Page**
- URL: `http://localhost:3000/dashboard/payout`
- Expected: Payout request form and history
- Check: Balance display, form validation, request list

---

#### Admin Pages

**Test 29: Admin Dashboard**
- URL: `http://localhost:3000/admin`
- Expected: Admin overview with metrics
- Check: Total sales, pending orders, commission totals

**Test 30: Admin Payout Management**
- URL: `http://localhost:3000/admin/payouts`
- Expected: Payout request list with actions
- Check: Filter by status, decrypt button, approve/reject

**Test 31: Admin Tax Reports**
- URL: `http://localhost:3000/admin/tax`
- Expected: Tax report interface
- Check: Period selector, generate report, export

---

### Integration Tests

#### End-to-End Order Flow

**Test 32: Complete Order with Commission**
1. Create order with referral code
2. Simulate Midtrans payment success webhook
3. Simulate Digiflazz fulfillment success callback
4. Verify commission created and payable
5. Verify tax allocated
6. Check order status updated

**Expected**: Order completed, commission payable, tax allocated

---

#### End-to-End Payout Flow

**Test 33: Complete Payout Workflow**
1. Reseller requests payout
2. Verify balance reserved
3. Admin decrypts identity
4. Verify audit log created
5. Admin approves payout
6. Admin marks paid
7. Verify ledger updated

**Expected**: Payout completed, balance deducted, audit trail complete

---

### Security Tests

#### Authentication & Authorization

**Test 34: Unauthorized Access**
```bash
curl http://localhost:3001/admin/payouts
```
**Expected**: `401 Unauthorized`

**Test 35: Insufficient Permissions**
```bash
curl http://localhost:3001/admin/payouts \
  -H "Authorization: Bearer <user_token>"
```
**Expected**: `403 Forbidden`

**Test 36: Cross-User Access**
```bash
curl http://localhost:3001/payout/my-requests \
  -H "Authorization: Bearer <user_a_token>"
```
**Expected**: Only user A's requests (RLS enforced)

---

#### Data Validation

**Test 37: Invalid Payout Amount**
```bash
curl -X POST http://localhost:3001/payout/request \
  -H "Authorization: Bearer <reseller_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amountMinor": -1000
  }'
```
**Expected**: `400 Bad Request` - Invalid amount

**Test 38: Insufficient Balance**
```bash
curl -X POST http://localhost:3001/payout/request \
  -H "Authorization: Bearer <reseller_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "amountMinor": 999999999999
  }'
```
**Expected**: `400 Bad Request` - Insufficient balance

**Test 39: Invalid Tax Period**
```bash
curl -X POST http://localhost:3001/admin/tax/generate-report \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "period": "invalid"
  }'
```
**Expected**: `400 Bad Request` - Invalid period format

---

### Performance Tests

**Test 40: Concurrent Requests**
```bash
# Run 10 concurrent catalog requests
for i in {1..10}; do
  curl http://localhost:3001/catalog &
done
wait
```
**Expected**: All requests succeed, response time < 500ms

**Test 41: Large Dataset Query**
```bash
curl http://localhost:3001/admin/tax/allocations?period=2026-05 \
  -H "Authorization: Bearer <admin_token>"
```
**Expected**: Response time < 2s for 1000+ records

---

### Database Verification

**Test 42: RLS Policy Enforcement**
```sql
-- As user A, try to access user B's payout requests
SELECT * FROM payout_requests WHERE user_id = '<user_b_id>';
```
**Expected**: Empty result (RLS blocks cross-user access)

**Test 43: Encryption Verification**
```sql
-- Check encrypted fields are not plaintext
SELECT encrypted_nik FROM payout_requests LIMIT 1;
```
**Expected**: Hex-encoded ciphertext (not plaintext NIK)

**Test 44: Audit Log Immutability**
```sql
-- Try to delete audit log entry
DELETE FROM payout_decrypt_audit_log WHERE id = '<log_id>';
```
**Expected**: Permission denied (RLS blocks delete)

---

## Test Results Summary

### Backend API Tests: 0/22 Executed
- Health & Status: 0/2
- Authentication: 0/3
- Catalog: 0/2
- Orders: 0/3
- Commission: 0/3
- Payout: 0/6
- Tax: 0/3

### Frontend Tests: 0/9 Executed
- Public Pages: 0/3
- Authenticated Pages: 0/3
- Admin Pages: 0/3

### Integration Tests: 0/2 Executed
- Order Flow: 0/1
- Payout Flow: 0/1

### Security Tests: 0/6 Executed
- Authentication: 0/3
- Data Validation: 0/3

### Performance Tests: 0/2 Executed

### Database Tests: 0/3 Executed

---

## Manual QA Execution Instructions

### Step 1: Start Backend
```bash
cd backend
npm run dev
```

### Step 2: Start Frontend
```bash
cd next-frontend
npm run dev
```

### Step 3: Execute Tests
Run each test in sequence, document results in evidence file.

### Step 4: Document Findings
- Screenshot any errors
- Log response times
- Note any unexpected behavior
- Record all test results

---

## Evidence Files to Create

1. `.sisyphus/evidence/f3-backend-api-tests.txt`
2. `.sisyphus/evidence/f3-frontend-smoke-tests.txt`
3. `.sisyphus/evidence/f3-integration-tests.txt`
4. `.sisyphus/evidence/f3-security-tests.txt`
5. `.sisyphus/evidence/f3-performance-tests.txt`
6. `.sisyphus/evidence/f3-database-tests.txt`

---

## Next Steps

After manual QA execution:
- Document all test results
- Create evidence files
- Proceed to F4: Scope fidelity review

---

**QA Status**: READY FOR EXECUTION
**Tests Defined**: 44
**Estimated Time**: 2-3 hours
**Prerequisites**: Backend + Frontend running locally
