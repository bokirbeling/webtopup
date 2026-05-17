# Digiflazz Response Flow and Integrity

Source of truth for fulfillment success is strictly the Digiflazz Buyer API. Adnanpay follows these rules to ensure purchase integrity and prevent fake fulfillment fraud.

## 1. Fulfillment Truth Source
Fulfillment status and serial number (SN) are valid **only** if they originate from:
- A synchronous **Digiflazz Topup API response**.
- A valid **Digiflazz Callback (Webhook)** with matching `ref_id`.
- A backend **Digiflazz Recheck** triggered by an admin or scheduled process.

## 2. Trigger Pre-conditions (S2 Guard)
Fulfillment can only be triggered if:
1. The `order.status` is strictly `paid`.
2. The payment has been verified by the Midtrans truth source (S1).
3. No prior successful fulfillment exists for the same `order_id`.

## 3. Webhook Security
- **HMAC Verification**: If `DIGIFLAZZ_WEBHOOK_SECRET` is configured, Adnanpay requires a valid `X-Hub-Signature: sha1=<hmac>` header.
- **User Agent**: Adnanpay distinguishes between prepaid (`Digiflazz-Hookshot`) and postpaid (`Digiflazz-Pasca-Hookshot`).
- **Idempotency**: Every callback is recorded as an immutable `webhook_event`. Duplicate `event_key` (ref_id + rc + sn) requests are ignored.

## 4. Reconciliation Matrix

| Scenario | System Action |
| --- | --- |
| **Paid order, no fulfillment** | System or Admin triggers `triggerPaidOrderFulfillment`. |
| **Fulfillment Processing** | Backend recheck repeats topup with same `ref_id` or waits for callback. |
| **Digiflazz Success, Order Unpaid** | Monotonic transition guard rejects `success`. Order stays `pending_payment` or `failed` until payment truth (S1) confirms paid. |
| **Fake Digiflazz Status** | Admin/Frontend status overrides are ignored. Only provider response updates status. |

## 5. Implementation Notes
- **Monotonic Guards**: `OrderTransitionService` prevents reverting terminal states.
- **Harden Provider Reference**: `provider_reference` is always the internal `order_id`, ensuring a 1:1 mapping with the immutable order.
