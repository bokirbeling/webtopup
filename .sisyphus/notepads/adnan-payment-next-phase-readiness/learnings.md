
## 2026-05-14 - Task 1 schema migration
- Existing transactional schema keeps explicit order inserts/selects limited to legacy columns, so adding nullable order snapshot columns does not require backend TypeScript changes.
- Demo isolation requires extending demo_orders and adding demo_users/demo_products/demo_pricing_rules because future repositories can use SUPABASE_TABLE_PREFIX=demo_ for prefixed REST table paths.
- Supabase changelog now notes new public tables may not be exposed automatically; this task intentionally keeps app-owned auth/catalog/pricing tables service-role-only with anon/authenticated revoked and RLS forced.

## 2026-05-14 - Task 2 backend auth
- Auth now follows existing backend module conventions: createApp chooses in-memory auth without Supabase config and service-role Supabase REST with SUPABASE_TABLE_PREFIX when configured.
- Registration rejects server-controlled fields including role/password_hash, always persists new users as pengguna, and API serializers never include password hashes.
- JWT config is backend-only: tests get a safe local default, while non-test runtime requires a 32+ character JWT_SECRET and production rejects placeholder/test secrets.


## 2026-05-14 - Task 3 backend RBAC
- RBAC now reuses AuthService.getCurrentUser(token) in auth middleware, so JWT validation and user lookup remain centralized while protected account/admin routes distinguish 401 authentication failure from 403 authorization failure.
- Account/admin user management shares the Task 2 auth repository abstraction; in-memory mode supports tests, and Supabase REST mode keeps service-role table access server-side while preserving SUPABASE_TABLE_PREFIX via the auth repository tableName helper.
- Public MVP routes remain mounted outside RBAC middleware: orders, payments, fulfillments, invoices, and health are still registered independently after protected /api/account and /api/admin routes.

## 2026-05-14 - Task 4 product catalog and pricing
- Catalog/pricing follows the existing module seam: `createApp` injects in-memory repositories without Supabase config and Supabase REST repositories with `SUPABASE_TABLE_PREFIX` when configured.
- Runtime Supabase catalog access stays service-role-only through backend repositories; public catalog routes compute role-aware prices server-side and reject client-submitted trusted price fields (`final_price`, `price`, snapshot/amount fields) before quote generation.
- Pricing precedence is enforced in service code as product-specific role rule, then category role rule, then global role rule, then default zero markup; fixed markup applies before percentage and rounds to nearest Rp1.

## 2026-05-14 - Task 5 order auth and pricing integration
- Order creation stayed backward compatible by keeping the legacy direct-amount payload valid while adding an explicit optional `product_id` path that re-quotes through `CatalogService` at order time.
- Optional bearer auth belongs at the orders router boundary: no `Authorization` header keeps guest role `pengguna`, but any malformed or invalid bearer token now returns 401 for order creation instead of silently downgrading to guest.
- Product-priced orders now override client `product_code`, `provider`, and trusted price inputs with catalog-derived values, while persisting nullable `user_id`, `base_price_snapshot`, `markup_snapshot`, `role_price_snapshot`, and `pricing_rule_id_snapshot` for downstream payment and audit consistency.

## 2026-05-14 - Task 6 frontend auth dashboard
- Frontend dashboard auth stays API-only: `/dashboard` stores only `bayarku.auth.session` with backend token/user data, fetches `/api/auth/me` and `/api/account/status` with Bearer auth, and never exposes service-role or JWT secret material.
- Role-aware catalog display uses backend `/api/catalog/products` response values directly, including `final_price_minor`; React only formats the returned number for display and does not compute trusted pricing or margins.
- Dashboard route protection is render-level for the MVP: anonymous `/dashboard` shows the auth panel and intentionally performs zero private fetches until login/session is present.

## 2026-05-14 - Task 8 deployment runbook
- Production runbook must reflect the real backend mount shape: the Express app serves identical routes at root and `/ppob-api`, so `adnanpay.com/api/*` is the preferred public target while `/ppob-api/api/*` remains compatibility-only.
- `ADMIN_BOOTSTRAP_TOKEN` is validated in backend env config but does not power a public bootstrap endpoint yet, so first-admin setup must stay backend-side and out of the browser.

## 2026-05-14 - Final wave evidence補
- Task 7 dedicated admin evidence was added as deterministic text evidence from `Frontend/src/test/app.smoke.test.tsx` because previous evidence-writer subagents aborted and screenshots were unavailable locally.
- Admin forbidden evidence covers anonymous and non-admin `/admin` states with no management controls visible.
- Admin pricing evidence covers product creation, pricing rule update, and reseller approval through mocked backend admin APIs with bearer authorization.

## 2026-05-14 - Final F4 dashboard history fix
- Dashboard history now uses protected backend endpoints instead of frontend placeholders: /api/account/transactions filters orders by auth user, while /api/admin/monitoring stays behind the existing admin role guard and returns read-only transaction/webhook data.
- Existing order/payment/fulfillment repositories are the right seam for dashboard monitoring; adding list methods kept Supabase service-role access server-side and let in-memory tests cover member/admin behavior without public route regressions.
- Frontend dashboard tests should mock the extra /api/account/transactions and /api/admin/monitoring calls immediately after catalog/users loads because dashboards now fail closed on history/monitoring API errors.
## 2026-05-14 Task: manual-ssh-guide
Created `manual_ssh.md` with Windows PowerShell/OpenSSH and PuTTY/Plink commands for user-side recovery of Adnanpay Natanetwork SSH access. Guide avoids exposing the passphrase and asks user to return only `pwd`, `whoami`, and `/home/adnanpay/public_html` listing after successful login.
## 2026-05-14 Task: panduan-adnanpay
Created `panduan_adnanpay.md` as the complete Indonesian live operations guide, including login/register, admin dashboard, API auth, member/reseller flow, SSH/cPanel paths, smoke tests, rollback, troubleshooting, and security notes. No real secrets or passphrases were included.
