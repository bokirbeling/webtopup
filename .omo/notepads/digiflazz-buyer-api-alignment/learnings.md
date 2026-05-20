
- 2026-05-15: Official Buyer docs confirm all API calls are JSON POST and rely on MD5 signatures tied to `username`, `apiKey`, and either a fixed suffix, `ref_id`, or `customer_no` depending on the endpoint.
- 2026-05-15: Price list docs explicitly tell integrators to cache catalog data in their own database and refresh it periodically instead of reading Digiflazz price list on every user request.
- 2026-05-15: Prepaid pending status is rechecked by repeating topup with the same `ref_id`, while postpaid status uses `commands: status-pasca` with the same `ref_id`.
- 2026-05-15: Webhook verification uses `X-Hub-Signature` with HMAC SHA1 over the raw request body when a webhook secret is configured, and `User-Agent` separates prepaid from postpaid callbacks.

- 2026-05-15: Central Buyer client contracts now live in `backend/src/modules/digiflazz/buyer-client.ts`; fulfillment prepaid calls use the shared topup builder while mock fallback behavior remains outside production.
- 2026-05-15: Credential validation should use field-name-only errors (`DIGIFLAZZ_USERNAME`, `DIGIFLAZZ_API_KEY`) and fail before fetch so partial test/mock configs cannot accidentally call Digiflazz.
- 2026-05-15: Digiflazz prepaid price-list sync is implemented as an admin-only backend catalog action; public catalog remains DB-only and filters through existing product `isActive` semantics.
- 2026-05-15: Price-list products can be safely synchronized without schema changes by using existing `products.metadata` for Digiflazz status/cutoff/stock fields and existing `sku_digiflazz` as the upsert match key.
- 2026-05-15: Task 3 verification used mocked Buyer `/v1/price-list` responses only; active products require both `buyer_product_status` and `seller_product_status` to be true.

- 2026-05-16: Next.js migration N1 scaffold created in `next-frontend/` beside existing Vite `Frontend/`; Express backend remains source of truth and frontend env is limited to `NEXT_PUBLIC_API_BASE_URL`.

- 2026-05-15: Fulfillment prepaid pending recheck now uses a dedicated backend route that repeats Buyer topup with the existing provider reference/ref_id and updates the existing local fulfillment instead of creating a duplicate.
- 2026-05-15: Digiflazz webhook HMAC validation requires preserving Express raw JSON bytes via the global parser verify hook; when `DIGIFLAZZ_WEBHOOK_SECRET` is absent, unsigned callback acceptance remains the backward-compatible mode.
- 2026-05-15: Ping and postpaid Digiflazz webhook deliveries should be acknowledged before fulfillment event registration so prepaid transaction event idempotency remains scoped to create/update prepaid callbacks.

- 2026-05-15: Postpaid support persists server-owned inquiry snapshots before payment; pay-pasca and status-pasca reuse the stored ef_id, uyer_sku_code, and customer_no, while returned payable amount stays anchored to the inquiry selling_price.
- 2026-05-15: PLN validation uses the Buyer /v1/inquiry-pln signature seed (customer_no) and stores only safe customer/meter/subscriber/segment fields for authenticated users.
## 2026-05-15 Task: task-6-admin-ops
Admin Digiflazz Buyer operations now use an admin-only backend route at `/api/admin/digiflazz/operations` for saldo/catalog/webhook summary and the existing admin catalog sync route for price-list refresh. Frontend `/admin` renders `digiflazz-ops-panel` only after backend verifies role `admin`; non-admin/anonymous states hide all Digiflazz controls.

- 2026-05-15: Task 7 email verification keeps custom JWT auth as source of truth; backend stores only SHA-256 verification token hashes with expiry, sent timestamp, and resend count, while the raw token is handed only to the email sender boundary.
- 2026-05-15: Visible BayarKu source branding was renamed to Adnanpay while retaining internal `bayarku.auth.session` and `bayarku:navigate` names to avoid session/navigation breakage.
- 2026-05-15: Task 7 SMTP delivery uses one configured cPanel sender mailbox through a native implicit-TLS SMTP sender; missing/partial SMTP_* config fails startup only when partially configured.
## 2026-05-15 Task 7 verification fix
Visible footer contact branding corrected from legacy BayarKu email to `support@adnanpay.com`; internal `bayarku.*` storage/event keys remain intentionally unchanged for session compatibility.
## 2026-05-15 Task 8 runbook/smoke
Task 8 runbook now documents Buyer-only Digiflazz operations, cPanel SMTP sender-only verification email, GitHub push then Natanetwork pull deployment, and Passenger restart; direct SSH confirms cPanel paths and Node runtime, while public frontend is stale until current branch is committed/pushed/pulled.
