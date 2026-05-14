
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
