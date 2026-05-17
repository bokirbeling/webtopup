# CRITICAL: MCP Supabase Contamination Issue

## Problem

MCP `supabase` (default) dengan project_ref `cxlraxlfebxtptiswook` adalah proyek **aplikasi absensi pegawai BWS KV**, BUKAN proyek Adnanpay PPOB.

Selama session ini, saya menggunakan MCP `supabase` default untuk operasi database, yang seharusnya menggunakan `adnanpay-supabase` (project_ref `wprbrqmimwwukrhuawms`).

## Impact

Kemungkinan terjadi:
1. ❌ Table `demo_users` dibuat di database absensi (SALAH!)
2. ❌ Migrations Adnanpay diapply ke database absensi (SALAH!)
3. ❌ Data demo accounts masuk ke database absensi (SALAH!)

## Immediate Actions Required

### 1. Verify Damage to Absensi Project
```bash
# Check if demo_users table exists in absensi database
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'demo_%';

# Check for Adnanpay-related tables
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('orders', 'payments', 'fulfillments', 'products');
```

### 2. Rollback Contamination
If contamination found:
```sql
-- Drop demo tables from absensi database
DROP TABLE IF EXISTS demo_users CASCADE;
DROP TABLE IF EXISTS demo_orders CASCADE;
DROP TABLE IF EXISTS demo_payments CASCADE;
-- ... etc for all demo_ tables
```

### 3. Apply Correct Operations to Adnanpay Database
Re-run all operations using `adnanpay-supabase` MCP:
- Create `demo_users` table
- Insert 3 demo accounts
- Verify migrations

## Root Cause

**Prometheus mode restriction**: Saya tidak bisa edit `opencode.json` untuk disable MCP `supabase` default.

**Solution**: User harus manual edit `C:\Users\Administrator\.config\opencode\opencode.json`:

```json
{
  "mcp": {
    "supabase": {
      "type": "remote",
      "url": "https://mcp.supabase.com/mcp?project_ref=cxlraxlfebxtptiswook",
      "enabled": false  // ← DISABLE ini untuk mencegah kontaminasi
    },
    "adnanpay-supabase": {
      "type": "remote",
      "url": "https://mcp.supabase.com/mcp?project_ref=wprbrqmimwwukrhuawms",
      "enabled": true
    }
  }
}
```

## Prevention for Future

1. **ALWAYS** specify MCP explicitly: `adnanpay-supabase_execute_sql` instead of `supabase_execute_sql`
2. **DISABLE** default `supabase` MCP when working on Adnanpay
3. **VERIFY** project_ref before every database operation
4. **CREATE** separate OpenCode workspace for each project

## Verification Checklist

- [ ] Check absensi database for contamination
- [ ] Rollback any Adnanpay tables/data from absensi
- [ ] Verify `demo_users` exists in adnanpay-supabase (wprbrqmimwwukrhuawms)
- [ ] Verify 3 demo accounts in correct database
- [ ] Test all 3 logins still working
- [ ] Disable default `supabase` MCP
- [ ] Document this incident

## Status

**URGENT**: Requires immediate user action to:
1. Check damage to absensi project
2. Edit opencode.json to disable default supabase MCP
3. Verify Adnanpay data is in correct database

---

**Created**: 2026-05-17 07:54 WIB  
**Priority**: CRITICAL  
**Action Required**: USER MANUAL INTERVENTION
