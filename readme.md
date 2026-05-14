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

Known non-blocking warning: backend Jest may print `ts-jest` TS151002 for NodeNext hybrid module mode. Current tests pass with this warning.

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
