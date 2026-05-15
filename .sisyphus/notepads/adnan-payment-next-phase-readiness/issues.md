
## 2026-05-14 - Task 1 local SQL validation limitation
- Supabase CLI is installed (2.90.0), but local DB lint could not connect to 127.0.0.1:54322 and psql is not installed, so live migration application/error-path insert checks were not executable in this environment.

## 2026-05-14 - Task 8 production readiness blockers
- Adnanpay Natanetwork MCP user-level inspection is blocked by an encrypted OpenSSH private key that requires a passphrase, so final server/public-domain smoke could not be executed in this task.
- Adnanpay Supabase remote state currently exposes only migrations `20260514015123 transactional_schema_rls_idempotency_task4_v2` and `20260514022714 demo_tables_for_development_mode`; later local migrations still need remote application/verification before production smoke.

## 2026-05-14 - Secret rotation required after note exposure
- Backend secrets were historically exposed in `info development .md`; rotate the affected Supabase, Digiflazz, and Midtrans credentials in their provider dashboards and replace downstream stored copies.
## 2026-05-14 Task: final-wave-f3
Final live public-domain smoke remains externally blocked by Adnanpay Natanetwork MCP SSH key passphrase: `Cannot parse privateKey: Encrypted private OpenSSH key detected, but no passphrase given`. Local backend/frontend verification is green, Supabase remote migration gap was remediated via MCP, and live `adnanpay.com` smoke must be rerun once SSH passphrase/key access is fixed.
