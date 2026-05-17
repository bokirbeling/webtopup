# Manual Payout Withdrawal System

## Overview

The manual payout withdrawal system allows users (resellers/affiliates) to request withdrawal from their payable commission balance. Admin manually processes these requests with encrypted identity data storage for security and compliance.

## Architecture

### Database Tables

1. **payout_requests**: Stores withdrawal requests with encrypted identity/bank data
2. **payout_balance_ledgers**: Tracks balance changes (commission earned, reserved, released, paid)
3. **payout_decrypt_audit_log**: Logs every admin access to decrypted identity data

### Encryption

- **Algorithm**: AES-256-GCM (authenticated encryption)
- **Key Storage**: Backend environment variable only (never in database or frontend)
- **Encrypted Fields**: Legal name, NIK, address, bank name, account number, account holder, phone, email
- **Fingerprint**: SHA-256 hash for verification without decryption

### Status Flow

```
pending → approved → processing → paid
         ↓
      rejected
         ↓
     cancelled
```

## User Workflow

### 1. Request Withdrawal

**Endpoint**: `POST /api/payout/request`

**Request**:
```json
{
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
}
```

**Response**:
```json
{
  "id": "uuid",
  "userId": "uuid",
  "amountMinor": 1000000,
  "bankFeeMinor": 0,
  "netAmountMinor": 1000000,
  "status": "pending",
  "createdAt": "2026-05-16T17:00:00Z"
}
```

**Business Rules**:
- User must have sufficient payable balance
- Balance is immediately reserved (cannot be withdrawn again)
- Identity data is encrypted before storage
- Fingerprint is generated for verification

### 2. View Own Requests

**Endpoint**: `GET /api/payout/my-requests`

**Response**:
```json
{
  "requests": [
    {
      "id": "uuid",
      "amountMinor": 1000000,
      "netAmountMinor": 1000000,
      "status": "pending",
      "maskedAccountNumber": "****7890",
      "maskedBankName": "BCA",
      "createdAt": "2026-05-16T17:00:00Z"
    }
  ],
  "payableBalance": 5000000
}
```

**Security**:
- Users see only their own requests
- Sensitive data is masked (last 4 digits only)
- No decrypted data exposed to user

### 3. View Balance History

**Endpoint**: `GET /api/payout/balance-history`

**Response**:
```json
{
  "ledgers": [
    {
      "type": "commission_earned",
      "amountMinor": 100000,
      "balanceAfterMinor": 5000000,
      "description": "Commission from order #123",
      "createdAt": "2026-05-16T16:00:00Z"
    },
    {
      "type": "payout_reserved",
      "amountMinor": -1000000,
      "balanceAfterMinor": 4000000,
      "description": "Payout request reserved",
      "createdAt": "2026-05-16T17:00:00Z"
    }
  ]
}
```

## Admin Workflow

### 1. List All Requests

**Endpoint**: `GET /api/admin/payout/requests?status=pending`

**Response**:
```json
{
  "requests": [
    {
      "id": "uuid",
      "userId": "uuid",
      "userName": "John Doe",
      "amountMinor": 1000000,
      "netAmountMinor": 1000000,
      "status": "pending",
      "maskedAccountNumber": "****7890",
      "maskedBankName": "BCA",
      "createdAt": "2026-05-16T17:00:00Z"
    }
  ]
}
```

### 2. Decrypt Identity Data

**Endpoint**: `POST /api/admin/payout/decrypt/:id`

**Request**:
```json
{
  "reason": "Processing payout request for verification"
}
```

**Response**:
```json
{
  "legalName": "John Doe",
  "nik": "1234567890123456",
  "address": "Jl. Example No. 123",
  "bankName": "BCA",
  "accountNumber": "1234567890",
  "accountHolder": "John Doe",
  "phone": "081234567890",
  "email": "john@example.com"
}
```

**Security**:
- Every decrypt is logged with admin ID, timestamp, reason, IP, user agent
- Audit log is immutable and admin-only readable
- Requires admin role verification

### 3. Approve Request

**Endpoint**: `POST /api/admin/payout/approve/:id`

**Request**:
```json
{
  "bankFeeMinor": 5000
}
```

**Response**:
```json
{
  "id": "uuid",
  "status": "approved",
  "bankFeeMinor": 5000,
  "netAmountMinor": 995000
}
```

### 4. Reject Request

**Endpoint**: `POST /api/admin/payout/reject/:id`

**Request**:
```json
{
  "reason": "Invalid bank account information"
}
```

**Response**:
```json
{
  "id": "uuid",
  "status": "rejected",
  "adminNote": "Invalid bank account information"
}
```

**Business Rules**:
- Reserved balance is released back to user
- User can create new request after rejection

### 5. Mark as Paid

**Endpoint**: `POST /api/admin/payout/mark-paid/:id`

**Request**:
```json
{
  "proofReference": "TRX-2026051617-001"
}
```

**Response**:
```json
{
  "id": "uuid",
  "status": "paid",
  "proofReference": "TRX-2026051617-001",
  "processedAt": "2026-05-16T17:30:00Z"
}
```

**Business Rules**:
- Ledger entry created with type `payout_paid`
- Balance already reserved, no further deduction
- Cannot be reversed after marked paid

## Security Considerations

### Encryption at Rest

- All sensitive identity/bank data encrypted with AES-256-GCM
- Encryption key stored in backend environment only
- Key rotation supported (re-encrypt all records with new key)

### Access Control

- Users: View own requests only (RLS policy enforced)
- Admin: View all requests, decrypt with audit logging
- Decrypt audit log: Admin read-only, system insert-only

### Audit Trail

Every decrypt operation logs:
- Payout request ID
- Admin ID
- Reason for access
- Decrypted fields list
- IP address
- User agent
- Timestamp

### Balance Integrity

- Balance reserved on request creation (prevents double withdrawal)
- Balance released on rejection/cancellation
- Balance marked paid on completion (no actual deduction, already reserved)
- All balance changes logged in ledger with running balance

## Testing Checklist

- [ ] Insufficient balance rejection
- [ ] Encryption/decryption round-trip
- [ ] Decrypt audit logging
- [ ] Balance reservation on request
- [ ] Balance release on rejection
- [ ] Balance paid marking on completion
- [ ] User isolation (cannot see other users' requests)
- [ ] Admin access to all requests
- [ ] Status transition validation
- [ ] Bank fee calculation
- [ ] Masked data in user responses

## Environment Variables

```env
# Payout encryption key (256-bit base64 encoded)
PAYOUT_ENCRYPTION_KEY=<base64-encoded-32-bytes>
```

Generate new key:
```typescript
import { generateEncryptionKey } from "./security/encryption.service";
console.log(generateEncryptionKey());
```
