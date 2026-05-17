# State Machine and Reconciliation

Adnanpay enforces a strict state machine for order, payment, and fulfillment lifecycles to prevent fraud and ensure financial consistency.

## 1. Allowed Status Transitions

### Order Status
| From | To | Trigger |
| --- | --- | --- |
| `created` | `pending_payment` | Payment creation (Snap/Core) |
| `pending_payment` | `paid` | Midtrans Settlement/Capture |
| `pending_payment` | `failed` | Midtrans Deny/Cancel/Failure |
| `pending_payment` | `expired` | Midtrans Expire |
| `paid` | `fulfillment_pending` | Digiflazz trigger |
| `fulfillment_pending` | `success` | Digiflazz Success response/callback |
| `fulfillment_pending` | `failed` | Digiflazz Failed response/callback |
| `fulfillment_pending` | `expired` | Digiflazz Expired/Timeout (manual/recheck) |

### Monotonic Rule
Once an order reaches a terminal state (`success`, `failed`, `expired`), it **cannot** be changed. A `paid` order cannot revert to `pending_payment` or `failed`.

## 2. Fraud Matrix Rejections

| Scenario | Rejection Point | Outcome |
| --- | --- | --- |
| **Tampered Total Price** | `order.service` | Server ignores client amount, uses catalog snapshot. |
| **Fake Midtrans Webhook** | `payment.service` | Invalid signature rejected (401). |
| **Amount Mismatch Webhook** | `payment.service` | Signature valid but amount differs from order; rejected (400). |
| **Duplicate Webhook** | `fulfillment.repository` | Unique event_key check; ignored (DUPLICATE). |
| **Fulfillment Before Payment** | `fulfillment.service` | Trigger guard checks `status === 'paid'`; rejected (400). |
| **Success on Unpaid Order** | `order.transition.service` | Monotonic guard rejects success if not paid; ignored (IGNORED). |
| **Admin Force Success** | `admin.service` | Missing provider proof (Midtrans/Digiflazz); action blocked. |

## 3. Reconciliation Process

Admin monitoring dashboard provides a reconciliation summary:
- **Discrepancy: Paid but No Fulfillment**: Triggers manual re-run or Digiflazz recheck.
- **Discrepancy: Fulfillment Success but Unpaid**: High alert. Investigates fake status update in DB or gateway bypass.
- **Pending Fulfillments**: Scheduled recheck calls Digiflazz for processing transactions > 90 days.

## 4. Trust Boundary
- **Frontend**: Informational only. Shows status from API.
- **Admin UI**: Operational only. Mutates state only with backend validation.
- **Backend**: The only Truth Authority. Validates every transition against external provider proof.
