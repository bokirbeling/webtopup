# Midtrans Response Flow — Payment Truth Source

## Rule

Payment truth in Adnanpay comes only from Midtrans server response:

- valid Midtrans webhook with verified `signature_key`, or
- future backend-only Midtrans status API/recheck using `MIDTRANS_SERVER_KEY`.

Frontend, admin forms, customer payloads, and local assumptions are not allowed to mark an order/payment as paid.

## Webhook fields used

The backend requires these Midtrans webhook fields before mutation:

- `order_id`: must match an existing Adnanpay order/payment provider reference.
- `status_code`: used in signature formula.
- `gross_amount`: must exactly match stored order/payment amount in minor units.
- `transaction_status`: mapped to internal payment/order status.
- `fraud_status`: used for `capture` handling.
- `transaction_id`: stored as provider payment id when present.
- `signature_key`: verified using Midtrans formula.

## Signature formula

The backend verifies:

```text
SHA512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)
```

`MIDTRANS_SERVER_KEY` is backend-only. It must never appear in frontend code, logs, evidence, or Markdown examples.

## Amount match rule

After signature verification and before payment mutation, backend compares:

```text
Midtrans gross_amount == stored order.amount_minor / payment.amount_minor
```

If amount differs, webhook is recorded as failed and no payment/order status changes.

## Status mapping

Accepted mapping:

| Midtrans `transaction_status` | `fraud_status` | Internal payment | Internal order |
|---|---|---|---|
| `settlement` | any | `paid` | `paid` |
| `capture` | not `challenge` | `paid` | `paid` |
| `capture` | `challenge` | `pending` | no order mutation |
| `expire` | any | `expired` | `expired` |
| `deny` / `cancel` / `failure` | any | `failed` | `failed` |
| unknown/pending states | any | `pending` | no order mutation |

## Conflict rules

- A paid payment cannot be downgraded by a later failed/expired webhook.
- A signed webhook for an expired/failed order cannot mark it paid.
- Duplicate webhook event keys are idempotently ignored.
- Invalid signatures are rejected before webhook event registration.
- Unknown orders are recorded as failed webhook events when signature is valid.

## Safe transition order

1. Parse required fields.
2. Verify signature.
3. Register deduplicated webhook event.
4. Load order and existing payment.
5. Verify gross amount matches stored amount.
6. Verify no conflicting paid/downstream state.
7. Create/update payment only after checks pass.
8. Transition order only through monotonic order transition service.
9. Mark webhook event processed/ignored/failed.

## Fraud rejection examples

- Fake webhook with invalid signature: `401 INVALID_SIGNATURE`; no DB mutation.
- Validly signed wrong amount: `400 WEBHOOK_VALIDATION_ERROR`; event failed; order remains pending.
- Paid payment followed by denied/cancelled webhook: `400 WEBHOOK_VALIDATION_ERROR`; payment remains paid.
- Duplicate settlement webhook: `200 DUPLICATE`; no duplicate transition.

## Fulfillment boundary

Digiflazz fulfillment must only be triggered after Midtrans truth source has marked payment/order as paid. Frontend success screens or query parameters are not proof of payment.
