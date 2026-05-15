# Digiflazz Buyer API Local Mirror

Source set: exact 14 URLs provided by the user
Fetched at: 2026-05-15T03:29:23.410Z
Mirror scope: Buyer documentation only, plus the Digiflazz root page for platform orientation and `alasan-gagal` for failure mapping.

This folder is the local source of truth for Adnanpay's Digiflazz Buyer integration work. Seller pages, API Management pages, and Seller-only implementation paths are intentionally excluded.

| Source URL | Local file | Fetch timestamp | Endpoint summary | Implementation relevance |
| --- | --- | --- | --- | --- |
| `https://developer.digiflazz.com/` | `root.md` | `2026-05-15T03:29:23.410Z` | Platform orientation, connection types, Buyer to Seller support matrix | Scope reference only. Adnanpay uses Buyer API paths only and ignores Seller or API Management implementation routes. |
| `https://developer.digiflazz.com/alasan-gagal/` | `alasan-gagal.md` | `2026-05-15T03:29:23.410Z` | Failure reason list with `Terbentuk Transaksi` flag | Needed to map Digiflazz failure messages to retry, refund, and status handling. |
| `https://developer.digiflazz.com/api/buyer/persiapan/` | `persiapan.md` | `2026-05-15T03:29:23.410Z` | Buyer API setup, credentials, whitelist, JSON POST rules | Baseline integration rules for auth, headers, and allowed source IPs. |
| `https://developer.digiflazz.com/api/buyer/cek-saldo/` | `cek-saldo.md` | `2026-05-15T03:29:23.410Z` | `POST https://api.digiflazz.com/v1/cek-saldo` | Defines deposit balance checks and MD5 `depo` signature formula. |
| `https://developer.digiflazz.com/api/buyer/daftar-harga/` | `daftar-harga.md` | `2026-05-15T03:29:23.410Z` | `POST https://api.digiflazz.com/v1/price-list` for prepaid and postpaid | Needed for product sync, catalog storage, caching cadence, and rate-limit awareness. |
| `https://developer.digiflazz.com/api/buyer/deposit/` | `deposit.md` | `2026-05-15T03:29:23.410Z` | `POST https://api.digiflazz.com/v1/deposit` | Deposit ticket withdrawal flow for operational tooling. |
| `https://developer.digiflazz.com/api/buyer/topup/` | `topup.md` | `2026-05-15T03:29:23.410Z` | `POST https://api.digiflazz.com/v1/transaction` for prepaid topup | Core prepaid fulfillment endpoint, pending semantics, callback usage, test flag behavior. |
| `https://developer.digiflazz.com/api/buyer/cek-tagihan/` | `cek-tagihan.md` | `2026-05-15T03:29:23.410Z` | `commands: inq-pasca` against `/v1/transaction` | Postpaid inquiry contract, product-specific payload shapes, and price breakdowns. |
| `https://developer.digiflazz.com/api/buyer/bayar-tagihan/` | `bayar-tagihan.md` | `2026-05-15T03:29:23.410Z` | `commands: pay-pasca` against `/v1/transaction` | Postpaid payment contract, same-day payment rule, pending handling, and `sn` fields. |
| `https://developer.digiflazz.com/api/buyer/cek-status/` | `cek-status.md` | `2026-05-15T03:29:23.410Z` | Prepaid re-check via same `ref_id`, postpaid `status-pasca` | Needed for retry-safe status checks and 90-day guardrails. |
| `https://developer.digiflazz.com/api/buyer/inquiry-pln/` | `inquiry-pln.md` | `2026-05-15T03:29:23.410Z` | `POST https://api.digiflazz.com/v1/inquiry-pln` | Separate PLN validation endpoint before prepaid PLN actions. |
| `https://developer.digiflazz.com/api/buyer/test-case/` | `test-case.md` | `2026-05-15T03:29:23.410Z` | Official testing values for prepaid and postpaid | Needed for safe sandbox-style validation without inventing cases. |
| `https://developer.digiflazz.com/api/buyer/response-code/` | `response-code.md` | `2026-05-15T03:29:23.410Z` | Response code matrix `00` through `99` | Central status mapping for order state transitions, retries, and support tooling. |
| `https://developer.digiflazz.com/api/buyer/webhook/` | `webhook.md` | `2026-05-15T03:29:23.410Z` | Webhook headers, signatures, payload examples, ping endpoint | Needed for callback verification, event routing, and HMAC SHA1 validation. |

## Local file checklist

- `root.md`
- `alasan-gagal.md`
- `persiapan.md`
- `cek-saldo.md`
- `daftar-harga.md`
- `deposit.md`
- `topup.md`
- `cek-tagihan.md`
- `bayar-tagihan.md`
- `cek-status.md`
- `inquiry-pln.md`
- `test-case.md`
- `response-code.md`
- `webhook.md`
