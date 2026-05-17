# Commission Flow

## Overview

Commission system untuk reseller dan affiliate di Adnanpay PPOB platform.

## Commission Types

### 1. Reseller Commission
- Reseller menjual produk sendiri → dapat komisi dari penjualan
- Komisi dihitung: `(sale_price - base_price) * commission_rate`
- Commission rate ditentukan oleh tier reseller

### 2. Affiliate Commission
- Affiliate tidak bisa jual produk, hanya promosi via referral code
- Order yang menggunakan referral code affiliate → komisi ke affiliate
- Komisi dihitung sama seperti reseller commission

## Commission Calculation Flow

```
Order Created
  ↓
Payment Settled (Midtrans paid)
  ↓
Fulfillment Success (Digiflazz success)
  ↓
Order Status = completed
  ↓
Calculate Commission:
  - gross_sale_minor = order amount
  - discount_amount_minor = discount applied
  - net_sale_minor = gross - discount
  - commission_percentage = user's current tier rate
  - commission_amount_minor = net_sale * commission_percentage
  ↓
Create Commission Record (status = pending)
  ↓
Admin Review
  ↓
Admin Approve → status = approved → payable
  ↓
Manual Payout (S6) → status = paid
```

## Commission Status

- `pending`: Commission created, waiting admin review
- `approved`: Admin approved, ready for payout
- `payable`: Same as approved, ready for payout queue
- `paid`: Payout completed
- `cancelled`: Admin rejected or order cancelled
- `reversed`: Payout reversed (refund/chargeback)

## Attribution Rules

### Reseller Attribution
- Order created by reseller → commission to reseller
- No referral code needed

### Affiliate Attribution
- Order uses affiliate referral code → commission to affiliate
- Referral code must be active
- Order must be completed (paid + fulfilled)

### Priority
1. If order has referral_code → commission to affiliate (referral code owner)
2. If order created by reseller (no referral) → commission to reseller
3. If order by customer (no referral, not reseller) → no commission

## Performance Curves

Performance curves track reseller/affiliate performance over time:
- Daily/monthly aggregation
- Metrics: order count, gross sales, total commission
- Used for tier upgrade decisions

## Admin Operations

Admin can:
- View all commissions
- Approve/reject pending commissions
- Adjust commission amount (with audit log)
- View performance curves for all users
- Export commission reports

## Reseller/Affiliate Operations

Reseller/Affiliate can:
- View own commissions only
- View own performance stats
- View tier progress
- Request payout (S6)

## Security

- RLS policies: reseller sees only own commissions
- Admin sees all commissions
- Commission calculation immutable after creation
- Status transitions audited
