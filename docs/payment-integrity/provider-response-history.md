# Provider Response History

Adnanpay maintains an append-only audit log of every significant interaction with Midtrans and Digiflazz to ensure full observability and accountability.

## 1. Provider Events Table
Every provider response (API, Webhook, Callback) is stored in `provider_events`.

| Field | Description |
| --- | --- |
| `event_type` | `api_response_create_payment`, `webhook`, `api_response_topup`, `callback`, etc. |
| `provider_status` | Status from the provider (e.g., `settlement`, `Sukses`). |
| `provider_code` | Raw code (e.g., `200`, `00`). |
| `signature_verified`| Whether the HMAC/Signature check passed. |
| `amount_matched` | Whether the provider amount matches the internal order snapshot. |
| `safe_summary` | Human-readable summary for UI display. |

## 2. Access Control
- **Resellers**: Can view only their own transaction events via `GET /api/account/audit/events`. Raw payloads are hidden.
- **Admin**: Can view all events across all users via `GET /api/account/audit/events`. Has access to `raw_payload` for debugging.

## 3. Balance Ledgers (Admin Only)
Admin dashboard includes balance panels for Digiflazz and Midtrans derived from immutable events.
- **Digiflazz Ledger**: Records API balance, manual adjustments, and calculated deductions upon fulfillment success.
- **Midtrans Ledger**: Records successful payments verified by webhook/API recheck.

## 4. Reconciliation
Provider events are used to detect discrepancies between internal order status and external provider truth.
