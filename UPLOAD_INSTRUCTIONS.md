# ✅ Import Ready - CSV Upload Method

## File Generated

**Location**: `digiflazz-product-reference/all-products.csv`
**Size**: 3.10 MB
**Products**: 11,229 rows
**Format**: CSV with headers

## Upload Instructions

### Via Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Click "Table Editor" in left sidebar

2. **Select demo_products Table**
   - Find and click `demo_products` table

3. **Click "Insert" → "Import data from CSV"**
   - Or click upload icon in table toolbar

4. **Upload CSV File**
   - Click "Upload CSV" button
   - Select file: `D:\coding\1.PPOB PAYMENT\digiflazz-product-reference\all-products.csv`
   - Or drag & drop the file

5. **Configure Import**
   - ✅ First row is headers: **YES**
   - ✅ Delimiter: **Comma (,)**
   - ✅ Encoding: **UTF-8**
   - ✅ On duplicate: **Update existing row** (or Skip)

6. **Click "Import"**
   - Wait ~30-60 seconds for upload
   - Check for any errors

## CSV Structure

```csv
sku_digiflazz,name,category,provider,base_price_minor,is_active,metadata,main_category,sub_category,product_type
pulsa-telkomsel-b5323f2e,Cek Hutang Pulsa Telkomsel,Pulsa,TELKOMSEL,600,true,"{""type"":""Cek Hutang"",...}",Pulsa,TELKOMSEL,Cek Hutang
...
```

## Verification After Upload

### Check Total Count
```sql
SELECT COUNT(*) FROM demo_products;
-- Expected: 11229
```

### Category Breakdown
```sql
SELECT 
  main_category, 
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / 11229, 1) as percentage
FROM demo_products 
GROUP BY main_category 
ORDER BY count DESC;
```

**Expected**:
```
Games      : 3,893 (34.7%)
Paket Data : 3,446 (30.7%)
Voucher    : 1,844 (16.4%)
E-Money    : 1,517 (13.5%)
Pulsa      :   518 (4.6%)
PLN        :    11 (0.1%)
```

### Top Brands
```sql
SELECT 
  sub_category, 
  COUNT(*) as count 
FROM demo_products 
GROUP BY sub_category 
ORDER BY count DESC 
LIMIT 10;
```

### Sample Products
```sql
SELECT 
  sku_digiflazz,
  name,
  main_category,
  sub_category,
  base_price_minor / 100.0 as price_idr
FROM demo_products 
LIMIT 10;
```

## Important Notes

1. **No Duplicates**: CSV contains 11,229 unique SKUs
2. **Price Format**: Values in minor units (cents) - divide by 100 for IDR
3. **Metadata**: JSON string format, properly escaped
4. **Boolean**: `true` (lowercase string) - Supabase converts to boolean
5. **Encoding**: UTF-8 for Indonesian characters

## Alternative: SQL Batches

If CSV upload fails, use SQL batches:
- **Location**: `digiflazz-product-reference/sql-batches-final/`
- **Files**: 23 batches (batch-001.sql to batch-023.sql)
- **Method**: Execute via Supabase SQL Editor or Python script

---

**Status**: ✅ CSV ready for upload
**Action**: Upload via Supabase Dashboard
**File**: `digiflazz-product-reference/all-products.csv`
