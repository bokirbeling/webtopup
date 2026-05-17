# Internal PPh Final 0.5% Tax Allocation and Reporting

## Overview

Internal tax allocation system for PPh Final 0.5% on gross commission. This is **internal reporting only** and must never affect customer-facing amounts, Midtrans payments, Digiflazz fulfillment, or invoice totals.

## Core Principle: Transaction Purity

**CRITICAL**: Tax calculation is purely internal and must not affect:
- Checkout amount shown to customer
- Midtrans payment amount
- Digiflazz fulfillment amount
- Invoice total
- Customer/reseller amount charged
- Provider status or response

Tax allocation happens **after** both payment and fulfillment are verified successful.

## Architecture

### Database Tables

1. **tax_allocations**: Individual tax calculations per order
2. **tax_reports**: Monthly aggregated reports

### Allocation Trigger

Tax is allocated **only when both conditions are met**:
1. Midtrans payment verified successful
2. Digiflazz fulfillment verified successful (where delivery required)

### Formula

```typescript
grossCommissionMinor = max(sellingPriceMinor - modalPriceMinor, 0)
taxAllocationMinor = round(grossCommissionMinor * 0.005) // 0.5%
```

All values in minor units (integer cents/smallest currency unit).

## Workflow

### 1. Create Tax Allocation (Order Creation)

When order is created, tax allocation record is created in `pending` status:

```typescript
{
  orderId: "uuid",
  userId: "uuid",
  modalPriceMinor: 95000,      // Admin-set base cost
  sellingPriceMinor: 100000,   // Customer-facing price
  grossCommissionMinor: 5000,  // Calculated: 100000 - 95000
  taxRate: 0.0050,             // 0.5%
  taxAllocationMinor: 25,      // Calculated: round(5000 * 0.005)
  status: "pending",
  paymentVerifiedAt: null,
  fulfillmentVerifiedAt: null,
  allocatedAt: null
}
```

### 2. Mark Payment Verified

After Midtrans webhook confirms payment success:

```typescript
await taxService.markPaymentVerified(orderId);
```

Updates `paymentVerifiedAt` timestamp. If fulfillment already verified, triggers allocation.

### 3. Mark Fulfillment Verified

After Digiflazz confirms fulfillment success:

```typescript
await taxService.markFulfillmentVerified(orderId);
```

Updates `fulfillmentVerifiedAt` timestamp. If payment already verified, triggers allocation.

### 4. Allocate Tax

When both payment and fulfillment verified, status changes to `allocated`:

```typescript
{
  status: "allocated",
  allocatedAt: "2026-05-16T17:00:00Z",
  reportingPeriod: "2026-05" // YYYY-MM format
}
```

### 5. Cancel Allocation

If payment fails or fulfillment fails, cancel allocation:

```typescript
await taxService.cancelTaxAllocation(orderId);
```

Status changes to `cancelled`. No tax allocated for failed transactions.

## Monthly Reporting

### Generate Report

**Endpoint**: `POST /api/admin/tax/generate-report`

**Request**:
```json
{
  "period": "2026-05"
}
```

**Response**:
```json
{
  "reportingPeriod": "2026-05",
  "totalTransactions": 1250,
  "totalGrossCommissionMinor": 125000000,
  "totalTaxAllocationMinor": 625000,
  "generatedBy": "admin-uuid",
  "generatedAt": "2026-06-01T00:00:00Z"
}
```

### View Report

**Endpoint**: `GET /api/admin/tax/report/:period`

**Response**:
```json
{
  "reportingPeriod": "2026-05",
  "totalTransactions": 1250,
  "totalGrossCommissionMinor": 125000000,
  "totalTaxAllocationMinor": 625000,
  "generatedAt": "2026-06-01T00:00:00Z",
  "exportedAt": null
}
```

### Export Report

**Endpoint**: `POST /api/admin/tax/export-report`

**Request**:
```json
{
  "period": "2026-05",
  "format": "csv",
  "reference": "TAX-REPORT-2026-05"
}
```

**Response**:
```json
{
  "reportingPeriod": "2026-05",
  "exportedAt": "2026-06-01T10:00:00Z",
  "exportFormat": "csv",
  "exportReference": "TAX-REPORT-2026-05"
}
```

## Database Functions

### Calculate Tax Allocation

```sql
SELECT calculate_tax_allocation(
  'order-uuid',
  95000,  -- modal_price_minor
  100000  -- selling_price_minor
);
-- Returns: 25 (tax allocation in minor units)
```

### Aggregate Tax Report

```sql
SELECT * FROM aggregate_tax_report('2026-05');
-- Returns: (total_transactions, total_gross_commission_minor, total_tax_allocation_minor)
```

## Integration Points

### Order Service

After order creation:
```typescript
await taxService.createTaxAllocation({
  orderId: order.id,
  userId: order.userId,
  modalPriceMinor: product.basePriceMinor,
  sellingPriceMinor: order.totalMinor
});
```

### Payment Service

After Midtrans success webhook:
```typescript
await taxService.markPaymentVerified(orderId);
```

### Fulfillment Service

After Digiflazz success callback:
```typescript
await taxService.markFulfillmentVerified(orderId);
```

### Cancellation Flow

If payment or fulfillment fails:
```typescript
await taxService.cancelTaxAllocation(orderId);
```

## Security Considerations

### Access Control

- Tax allocations: Admin read-only (RLS policy)
- Tax reports: Admin read-only (RLS policy)
- Generate/export: Admin-only endpoints with role verification

### Data Integrity

- All calculations in integer minor units (no floating point)
- Immutable after allocation (status cannot revert from `allocated`)
- Audit trail via `created_at`, `updated_at`, `allocated_at`

### Reporting Period

- Format: `YYYY-MM` (e.g., "2026-05")
- Validation: Must match regex `^\d{4}-\d{2}$`
- Aggregation: Only `allocated` status included in reports

## Testing Checklist

- [ ] Tax allocation created on order creation
- [ ] Payment verification updates timestamp
- [ ] Fulfillment verification updates timestamp
- [ ] Allocation triggers only after both verifications
- [ ] Cancellation prevents allocation
- [ ] Gross commission calculation correct
- [ ] Tax rate 0.5% applied correctly
- [ ] Rounding to integer minor units
- [ ] Monthly report aggregation accurate
- [ ] Export tracking recorded
- [ ] Admin-only access enforced
- [ ] Transaction purity maintained (no customer-facing impact)

## Example Scenarios

### Scenario 1: Successful Transaction

1. Order created: modal 95000, selling 100000
2. Tax allocation created: pending, gross 5000, tax 25
3. Midtrans confirms payment: `paymentVerifiedAt` set
4. Digiflazz confirms fulfillment: `fulfillmentVerifiedAt` set
5. Tax allocated: status `allocated`, `allocatedAt` set, period `2026-05`

### Scenario 2: Failed Payment

1. Order created: modal 95000, selling 100000
2. Tax allocation created: pending, gross 5000, tax 25
3. Midtrans payment fails: tax allocation cancelled
4. Status: `cancelled`, no tax allocated

### Scenario 3: Failed Fulfillment

1. Order created: modal 95000, selling 100000
2. Tax allocation created: pending, gross 5000, tax 25
3. Midtrans confirms payment: `paymentVerifiedAt` set
4. Digiflazz fulfillment fails: tax allocation cancelled
5. Status: `cancelled`, no tax allocated

## Compliance Notes

- PPh Final 0.5% rate per Indonesian tax regulation
- Internal allocation only, not customer-facing
- Monthly reporting for accounting/tax filing
- Export format customizable (CSV, Excel, PDF)
- Audit trail for all allocations and reports
