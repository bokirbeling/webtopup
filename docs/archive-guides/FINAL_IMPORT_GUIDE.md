# Final Import Guide

## Status
- **SQL Batches**: 23 files generated ✅
- **Total Products**: 11,229 products
- **Unique SKUs**: 11,229 (0 duplicates)
- **Location**: `digiflazz-product-reference/sql-batches-final/`

## Import Method

### Option 1: Python Script (RECOMMENDED)

```bash
cd backend/src/scripts
python import_final.py <supabase-url> <service-role-key>
```

**Example**:
```bash
python import_final.py https://xxx.supabase.co eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Requirements**:
- Python 3.7+
- psycopg2-binary: `pip install psycopg2-binary`

**Features**:
- Auto-execute all 23 batches sequentially
- Progress tracking every 5 batches
- Error handling and rollback
- Final category breakdown
- Total time: ~2-3 minutes

### Option 2: Manual via MCP

Execute each batch via `adnanpay-supabase_execute_sql`:

```bash
# Read batch file
Get-Content "digiflazz-product-reference\sql-batches-final\batch-001.sql" -Raw

# Execute via MCP tool: adnanpay-supabase_execute_sql
# Repeat for batches 002-023
```

## Expected Results

### Product Count
- **Total**: 11,229 products
- **Batches**: 23 (500 products each, last batch 229)

### Category Distribution
- Games: 3,893 (34.7%)
- Paket Data: 3,446 (30.7%)
- Voucher: 1,844 (16.4%)
- E-Money: 1,517 (13.5%)
- Pulsa: 518 (4.6%)
- PLN: 11 (0.1%)

### Database Structure
```sql
demo_products (
  id uuid PRIMARY KEY,
  sku_digiflazz text UNIQUE,
  name text,
  category text,
  provider text,
  base_price_minor bigint,
  is_active boolean,
  metadata jsonb,
  main_category text,
  sub_category text,
  product_type text,
  created_at timestamptz,
  updated_at timestamptz
)
```

## Verification Commands

### Check Total Count
```sql
SELECT COUNT(*) FROM demo_products;
-- Expected: 11229
```

### Check Category Breakdown
```sql
SELECT main_category, COUNT(*) as count 
FROM demo_products 
GROUP BY main_category 
ORDER BY count DESC;
```

### Check Sub-Categories (Brands)
```sql
SELECT sub_category, COUNT(*) as count 
FROM demo_products 
WHERE main_category = 'Games'
GROUP BY sub_category 
ORDER BY count DESC 
LIMIT 10;
```

### Check for Duplicates
```sql
SELECT sku_digiflazz, COUNT(*) as count 
FROM demo_products 
GROUP BY sku_digiflazz 
HAVING COUNT(*) > 1;
-- Expected: 0 rows
```

## Troubleshooting

### Issue: "psycopg2 not installed"
```bash
pip install psycopg2-binary
```

### Issue: "Connection failed"
- Check Supabase URL format: `https://xxx.supabase.co`
- Check service role key is correct
- Check network connectivity

### Issue: "Directory not found"
- Ensure you're in `backend/src/scripts/` directory
- Check `digiflazz-product-reference/sql-batches-final/` exists

### Issue: Import fails mid-way
- Check which batch failed
- Re-run script (ON CONFLICT will handle duplicates)
- Or manually execute remaining batches

## Files Reference

### SQL Batches
```
digiflazz-product-reference/sql-batches-final/
├── batch-001.sql (500 products, 117 KB)
├── batch-002.sql (500 products, 149 KB)
├── ...
└── batch-023.sql (229 products, 66 KB)
```

### Import Scripts
```
backend/src/scripts/
├── import_final.py           # Python import script
├── generate-final-sql.ts     # SQL generator
└── analyze-products.ts       # Product analyzer
```

## Next Steps After Import

1. Verify count: `SELECT COUNT(*) FROM demo_products;`
2. Check categories: `SELECT main_category, COUNT(*) FROM demo_products GROUP BY main_category;`
3. Test product queries in your application
4. Set up product search/filtering
5. Configure RLS policies if needed
