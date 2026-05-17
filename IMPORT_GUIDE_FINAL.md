# Import Guide - Final Structured Data

## Status
- ✅ Database cleared (0 products)
- ✅ Data restructured (11,229 products)
- ✅ SQL batches generated (23 files)
- ⏳ Ready to import

## Data Structure

### Categories (11,229 products)
- **Pulsa**: 518 products (Telkomsel, XL, Indosat, Tri, Smartfren, Axis, By.U)
- **Paket Data**: 3,446 products (Telkomsel, Indosat, XL, Axis, Tri, Smartfren)
- **Games**: 3,893 products (Mobile Legends, Free Fire, PUBG, Genshin, etc)
- **Voucher**: 1,844 products (Google Play, Steam, iTunes, etc)
- **E-Money**: 1,517 products (GoPay, DANA, OVO, ShopeePay, LinkAja)
- **PLN**: 11 products (Token PLN)

### Database Schema
```sql
demo_products (
  id uuid PRIMARY KEY,
  sku_digiflazz text UNIQUE,
  name text,
  category text,              -- Original Digiflazz category
  provider text,              -- Brand
  base_price_minor bigint,    -- Price in minor units
  is_active boolean,
  metadata jsonb,             -- { type, description, image_url }
  main_category text,         -- Our category (Pulsa, Paket Data, etc)
  sub_category text,          -- Brand (TELKOMSEL, XL, etc)
  product_type text,          -- Type (Reguler, Flash, Mini, etc)
  created_at timestamptz,
  updated_at timestamptz
)
```

### Indexes
- `idx_products_main_category` on `main_category`
- `idx_products_sub_category` on `sub_category`
- `idx_products_product_type` on `product_type`

## Import Methods

### Method 1: Python Script (RECOMMENDED)
```bash
cd backend/src/scripts
python import_final_batches.py <supabase-url> <service-role-key>
```

**Example:**
```bash
python import_final_batches.py https://xxx.supabase.co eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Features:**
- Auto-execute all 23 batches
- Progress tracking every 5 batches
- Category breakdown at end
- Error handling with rollback
- Final verification

### Method 2: Manual via MCP
Execute each batch via `adnanpay-supabase_execute_sql`:

```powershell
# Read batch file
$sql = Get-Content "digiflazz-product-reference\sql-batches-final\batch-001.sql" -Raw

# Execute via MCP
adnanpay-supabase_execute_sql -query $sql

# Repeat for batch-002 to batch-023
```

## Files Generated

### Structured Data
- `digiflazz-product-reference/all-products-structured.json` (11,229 products)

### SQL Batches
```
digiflazz-product-reference/sql-batches-final/
├── batch-001.sql (500 products, 120 KB)
├── batch-002.sql (500 products, 152 KB)
├── ...
└── batch-023.sql (229 products, 68 KB)
```

### Scripts
```
backend/src/scripts/
├── restructure-existing-data.ts       # Re-structure JSON data
├── generate-sql-from-structured.ts    # Generate SQL batches
├── import_final_batches.py            # Python import script
└── scrape-automation-plan.ts          # Scraping plan (reference)
```

## Verification

### Check Total Count
```sql
SELECT COUNT(*) FROM demo_products;
-- Expected: 11,229
```

### Check by Main Category
```sql
SELECT main_category, COUNT(*) as count 
FROM demo_products 
GROUP BY main_category 
ORDER BY count DESC;
```

### Check by Sub Category (Top 10)
```sql
SELECT sub_category, COUNT(*) as count 
FROM demo_products 
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

## Expected Results

### Category Distribution
```
Paket Data: 3,446 products (30.7%)
Games: 3,893 products (34.7%)
Voucher: 1,844 products (16.4%)
E-Money: 1,517 products (13.5%)
Pulsa: 518 products (4.6%)
PLN: 11 products (0.1%)
```

### Top Sub-Categories
```
TELKOMSEL: ~1,368 products
MOBILE LEGENDS: 909 products
INDOSAT: 740 products
GoPay: 576 products
FREE FIRE: 388 products
```

## Troubleshooting

### Issue: Connection Failed
- Check Supabase URL format: `https://xxx.supabase.co`
- Verify service role key is correct
- Ensure network connectivity

### Issue: Import Fails Mid-Way
- Check which batch failed
- Verify SQL syntax in failed batch
- Re-run from failed batch number

### Issue: Duplicate SKUs
- Should not happen (ON CONFLICT clause handles this)
- If duplicates found, check SKU generation logic

## Next Steps After Import

1. ✅ Verify total count = 11,229
2. ✅ Check category distribution
3. ✅ Verify no duplicates
4. Update frontend to use new category structure
5. Test product listing by category
6. Test product search by sub_category
