# PPOB Fullstack MVP Runbook

Localhost-first PPOB MVP using a Vite React frontend, Node/Express TypeScript backend, Supabase persistence, Midtrans payment webhooks, and Digiflazz fulfillment callbacks. The MVP supports guest checkout, payment initialization, signed webhook handling, fulfillment callback handling, invoice status lookup, audit/rate-limit safety, reconciliation tests, and deterministic regression coverage.

## Requirements

- Node.js 20+ recommended.
- npm for both `backend/` and `Frontend/` workspaces.
- Supabase project credentials for persistent runtime mode.
- No live Midtrans or Digiflazz network is required for the automated test suites; tests use in-memory repositories and mocked provider responses.

## Environment

Copy the example file and fill placeholders with project-local values. Do not paste legacy secrets into documentation or commits.

```bash
cp .env.example .env
```

The README environment order intentionally matches `.env.example`:

### App runtime

- `NODE_ENV`: `development`, `test`, or `production`.
- `PORT`: backend HTTP port. The default local examples use `3001`.

### Supabase

- `SUPABASE_URL`: Supabase project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: server-only service role key. Never expose this key to the frontend.

### Midtrans

- `MIDTRANS_SERVER_KEY`: server-side key used to initialize payments and verify webhook signatures.
- `MIDTRANS_API_BASE_URL`: optional; defaults to `https://app.sandbox.midtrans.com` when omitted.

### Digiflazz

- `DIGIFLAZZ_USERNAME`: optional outside production; required with `DIGIFLAZZ_API_KEY` for live provider mode.
- `DIGIFLAZZ_API_KEY`: optional outside production; required in production to prevent mock fallback.
- `DIGIFLAZZ_API_BASE_URL`: optional; defaults to `https://api.digiflazz.com` when omitted.
- `DIGIFLAZZ_WEBHOOK_SECRET`: optional Buyer webhook HMAC secret. When set, callbacks must include valid `X-Hub-Signature`.
- `DIGIFLAZZ_TOPUP_TESTING`, `DIGIFLAZZ_TOPUP_MAX_PRICE`, `DIGIFLAZZ_TOPUP_CALLBACK_URL`, `DIGIFLAZZ_TOPUP_ALLOW_DOT`: server-only Buyer topup controls.

Buyer API docs are mirrored locally in `docs/digiflazz-buyer/`. Only Buyer docs are authoritative for this integration; do not implement API Management/Seller endpoints unless a future plan explicitly says so.

### Email verification sender

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_FROM_EMAIL`, `SMTP_FROM_NAME`: optional as a full set. Configure one cPanel sender mailbox such as `no-reply@adnanpay.com`. Adnanpay users/resellers stay in the application database; do not create cPanel mailboxes per user.

### Frontend

- `VITE_API_BASE_URL`: browser API base URL. Use `http://localhost:3001` for local backend on port 3001.

## Install

```bash
npm --prefix backend install
npm --prefix Frontend install
```

## Local development

Start the backend after `.env` is populated:

```bash
npm --prefix backend run dev
```

Start the frontend in a second terminal:

```bash
npm --prefix Frontend run dev
```

Open the Vite URL printed by the frontend, usually `http://localhost:5173`. Guest checkout calls:

- `POST /api/orders`
- `POST /api/payments/midtrans/initialize`
- `GET /api/invoices/:invoiceCode/status`

## Verification commands

Run these before deployment or push:

```bash
npm --prefix backend run lint
npm --prefix backend run typecheck
npm --prefix backend test
npm --prefix backend run build

npm --prefix Frontend run lint
npm --prefix Frontend run typecheck
npm --prefix Frontend test
npm --prefix Frontend run build
```

## Production deployment summary

Production deploy flow is GitHub based: commit/push local code, SSH to the Adnanpay cPanel account, pull the latest commit into `/home/adnanpay/ppob-backend` or a staging clone, preserve `.env.production`, install/build with the cPanel Node runtime, copy frontend build to `/home/adnanpay/public_html`, then restart Passenger with `touch /home/adnanpay/ppob-backend/tmp/restart.txt`.

Smoke after deployment:

- `https://adnanpay.com/ppob-api/health` returns OK.
- unauthenticated `/ppob-api/api/auth/me` returns `401`.
- register/login/me works with a test user.
- `/ppob-api/api/catalog/products` responds.
- admin-only Digiflazz operations and price sync require admin bearer token.

Never commit `.env.production`, service-role keys, Digiflazz API keys, SMTP passwords, SSH keys/passphrases, or MCP env files.

Known non-blocking warning: backend Jest may print `ts-jest` TS151002 for NodeNext hybrid module mode. Current tests pass with this warning.

## cPanel production readiness runbook

### Production target

- Primary public domain: `https://adnanpay.com`.
- Hosting account: Adnanpay Natanetwork cPanel user `adnanpay` on `103.164.173.46:31988`.
- Account home: `/home/adnanpay`.
- Frontend web root: `/home/adnanpay/public_html`.
- Backend runtime: cPanel Node.js App / Passenger only. Do not assume `sudo`, root, PM2, or systemd.

### Environment split for production

Backend-secret keys. Store only in backend runtime env or cPanel Node.js App environment variables. Never place these in frontend code, `public_html`, screenshots, or docs with live values.

- `SUPABASE_SERVICE_ROLE_KEY`
- `MIDTRANS_SERVER_KEY`
- `DIGIFLAZZ_API_KEY`
- `JWT_SECRET`
- `ADMIN_BOOTSTRAP_TOKEN`

Backend runtime keys. These still belong in the backend env, but they are operational config rather than browser-safe secrets.

- `NODE_ENV=production`
- `PORT` set by cPanel/Passenger or the Node.js App configuration in use
- `SUPABASE_URL`
- `SUPABASE_TABLE_PREFIX=` blank in production
- `MIDTRANS_API_BASE_URL`
- `DIGIFLAZZ_USERNAME`
- `DIGIFLAZZ_API_BASE_URL`
- `JWT_EXPIRES_IN`
- `PASSWORD_HASH_COST`
- `CORS_ALLOWED_ORIGINS=https://adnanpay.com`

Frontend-safe keys. These may be baked into the Vite build because the browser can read them.

- `VITE_API_BASE_URL=https://adnanpay.com` for the primary root-mounted API
- `VITE_API_BASE_URL=https://adnanpay.com/ppob-api` only when cPanel routing intentionally exposes the compatibility mount instead of the root mount

### Build, upload, and backend startup

1. Run the local verification commands in this README before generating production artifacts.
2. Build the backend locally with `npm --prefix backend run build`.
3. Build the frontend locally with `npm --prefix Frontend run build`.
4. Upload `Frontend/dist/*` into `/home/adnanpay/public_html` so `index.html` and asset files become the primary public site at `adnanpay.com`.
5. Configure the cPanel Node.js App to boot the compiled backend entry. If the application root is the repository root, the startup target is `backend/dist/index.js`. If the application root is the `backend/` directory itself, the startup file is `dist/index.js`.
6. Use cPanel Node.js App environment variables for backend config, then restart the app from the cPanel UI only.

### Routing, Passenger, and compatibility paths

The backend mounts the same routes twice: once at the root and once under `/ppob-api` for compatibility.

- Primary API base: `https://adnanpay.com/api/*`
- Compatibility API base: `https://adnanpay.com/ppob-api/api/*`
- Primary health check: `https://adnanpay.com/health`
- Compatibility health check: `https://adnanpay.com/ppob-api/health`

Use the root mount as the default public configuration. Keep `/ppob-api` available only when existing cPanel rewrites or legacy proxy wiring still depend on it.

### Public webhook callback URLs

Prefer the root-mounted production URLs below so third-party callbacks stay reachable without login-protected routes:

- Midtrans webhook: `https://adnanpay.com/api/payments/midtrans/webhook`
- Digiflazz callback: `https://adnanpay.com/api/fulfillments/digiflazz/callback`

If the cPanel proxy is intentionally pinned to the compatibility mount, the equivalent public URLs are:

- `https://adnanpay.com/ppob-api/api/payments/midtrans/webhook`
- `https://adnanpay.com/ppob-api/api/fulfillments/digiflazz/callback`

### SPA fallback and HTTPS checks

- `public_html` must serve the built frontend as a static SPA.
- Apache or cPanel rewrite rules must fall back to `index.html` for browser routes such as `/invoice/:code`, `/dashboard`, and `/admin`.
- Do not rewrite `/api`, `/ppob-api`, `/health`, asset files, or provider callback routes to `index.html`.
- Confirm HTTPS is active for `https://adnanpay.com`, and that SSL covers both frontend pages and webhook endpoints.

Suggested checks after upload:

```bash
curl -I https://adnanpay.com
curl -I https://adnanpay.com/health
curl -I https://adnanpay.com/ppob-api/health
curl -I https://adnanpay.com/invoice/TEST-INVOICE
```

### Admin bootstrap procedure

There is no public production bootstrap endpoint yet. `ADMIN_BOOTSTRAP_TOKEN` is validated by backend config but currently reserved for future server-side bootstrap flows only.

Current safe bootstrap flow:

1. Register the initial operator account through `POST /api/auth/register`.
2. Promote that user to `role=admin` using a trusted backend-side process only, such as a controlled SQL update or one-off internal script against the application-owned users table.
3. Verify admin access with `GET /api/auth/me`, `GET /api/account/status`, and `GET /api/admin/users` using the promoted account.

Do not expose bootstrap tokens in the frontend or create a public browser-only promotion flow.

### Rollback steps

1. Keep a timestamped backup of the last known-good frontend build before replacing files in `/home/adnanpay/public_html`.
2. Keep the previous compiled backend artifact so the cPanel Node.js App can be pointed back to the prior `dist/index.js` target or prior uploaded backend directory.
3. If production smoke fails, restore the previous frontend files through File Manager or FTP, restore the previous backend artifact, and restart the Node.js App from cPanel.
4. Re-run the health checks and the smoke checklist before reopening traffic or updating provider callback URLs.

### Production blockers and verification strategy

- Adnanpay Natanetwork MCP inspection is currently blocked. User-level SSH access attempt failed with `Cannot parse privateKey: Encrypted private OpenSSH key detected, but no passphrase given`, so final server smoke is still pending.
- Adnanpay Supabase MCP currently reports only remote migrations `20260514015123 transactional_schema_rls_idempotency_task4_v2` and `20260514022714 demo_tables_for_development_mode`.
- Adnanpay Supabase security advisors returned no lints.
- Later local migrations for Tasks 1+ must still be applied and verified remotely before production smoke.
- Local Supabase CLI validation against `127.0.0.1:54322` is still an environment limitation, so local failure there should be documented rather than misreported as a deployment failure.

Strategy for this phase:

1. Finish implementation and local verification first.
2. If local environment-only checks fail because secrets, cPanel access, or local Supabase services are unavailable, record that limitation and continue with non-destructive documentation/build verification.
3. Use the Adnanpay Natanetwork MCP and Adnanpay Supabase MCP for final public-domain smoke only after the SSH passphrase blocker is cleared and the missing remote migrations are applied.

### Production smoke checklist

- Homepage renders from `https://adnanpay.com`.
- `/invoice/:code` loads with SPA fallback and calls the invoice status API successfully.
- Auth flow covers `POST /api/auth/register`, `POST /api/auth/login`, and `GET /api/auth/me` or `GET /api/account/status` as the effective signed-in status check.
- Dashboard and admin routes enforce protected-state behavior correctly for signed-out, pengguna, seller, and admin sessions.
- Catalog pricing reflects backend-authoritative role-aware pricing.
- Order creation, Midtrans initialization, webhook receipt, Digiflazz trigger, and Digiflazz callback all work without breaking public webhook reachability.

## Webhook simulation

Midtrans signature formula is `SHA512(order_id + status_code + gross_amount + MIDTRANS_SERVER_KEY)`. The automated regression fixture uses `ORD-TEST-001`, `TX-TEST-001`, status code `200`, and gross amount `20000.00`.

Example local Midtrans callback shape:

```json
{
  "order_id": "ORD-TEST-001",
  "status_code": "200",
  "gross_amount": "20000.00",
  "transaction_status": "settlement",
  "transaction_id": "TX-TEST-001",
  "signature_key": "<computed_sha512>"
}
```

Digiflazz success callback fixture:

```json
{
  "data": {
    "ref_id": "ORD-TEST-001",
    "trx_id": "DGF-TEST-001",
    "status": "Sukses",
    "rc": "00",
    "sn": "SN-TASK-14-001"
  }
}
```

## Troubleshooting

### Missing required environment variables

If a required key is missing, backend startup fails fast with:

```text
[config] Missing required environment variables: KEY_NAME
```

Fix by adding the missing key to `.env`, following the `.env.example` group order. Required backend keys are `NODE_ENV`, `PORT`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `MIDTRANS_SERVER_KEY`.

### Invalid URLs or port

- `SUPABASE_URL`, `MIDTRANS_API_BASE_URL`, and `DIGIFLAZZ_API_BASE_URL` must be valid `http` or `https` URLs.
- `PORT` must be an integer between `1` and `65535`.

### Production Digiflazz guard

When `NODE_ENV=production`, Digiflazz credentials are required. Missing `DIGIFLAZZ_USERNAME` or `DIGIFLAZZ_API_KEY` prevents mock fallback and returns the documented validation error.

### Supabase local CLI blockers

If Supabase CLI commands fail while parsing root `.env`, ensure `.env` contains dotenv-safe `KEY=value` lines only. Do not store multiline notes or non-env content in `.env`.

## Regression evidence

Current Sisyphus evidence files live under `.sisyphus/evidence/`, including:

- `task-14-e2e-happy.png`
- `task-14-idempotency-error.txt`
- `task-15-runbook-happy.txt`
- `task-15-runbook-error.txt`
- `task-15-env-readme-alignment.txt`

## Deployment note

Deployment to Adnanpay/Natanetwork is intentionally deferred until all implementation tasks and final verification gates pass. Do not place secrets in frontend code or public docs.
