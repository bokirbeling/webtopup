# 📤 CSV Upload Instructions for Supabase

## ✅ File Ready

**File**: `digiflazz-product-reference/all-products.csv`
**Size**: 3.10 MB
**Products**: 11,229 rows
**Format**: CSV with headers

## 📋 CSV Structure

```csv
sku_digiflazz,name,category,provider,base_price_minor,is_active,metadata,main_category,sub_category,product_type
pulsa-telkomsel-b5323f2e,Cek Hutang Pulsa Telkomsel,Pulsa,TELKOMSEL,600,true,"{""type"":""Cek Hutang"",...}",Pulsa,TELKOMSEL,Cek Hutang
...
```

## 🚀 Upload Steps

### Via Supabase Dashboard

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to Table Editor**
   - Click "Table Editor" in left sidebar
   - Find `demo_products` table

3. **Click "Insert" → "Import data from CSV"**
   - Or click the upload icon in table toolbar

4. **Upload CSV File**
   - Click "Upload CSV" or "Paste text"
   - Select file: `digiflazz-product-reference/all-products.csv`
   - Or drag & drop the file

5. **Configure Import**
   - ✅ First row is headers: **YES**
   - ✅ Delimiter: **Comma (,)**
   - ✅ Encoding: **UTF-8**

6. **Map Columns** (should auto-map)
   ```
   CSV Column          → Table Column
   sku_digiflazz       → sku_digiflazz
   name                → name
   category            → category
   provider            → provider
   base_price_minor    → base_price_minor
   is_active           → is_active
   metadata            → metadata
   main_category       → main_category
   sub_category        → sub_category
   product_type        → product_type
   ```

7. **Handle Conflicts**
   - On duplicate `sku_digiflazz`: **Update existing row**
   - Or: **Skip duplicate rows**

8. **Click "Import"**
   - Wait for upload to complete (~30-60 seconds)
   - Check for any errors

9. **Verify Import**
   ```sql
   SELECT COUNT(*) FROM demo_products;
   -- Expected: 11229
   ```

## 🔍 Verification Queries

### Total Count
```sql
SELECT COUNT(*) as total FROM demo_products;
```

### Category Breakdown
```sql
SELECT 
  main_category, 
  COUNT(*) as count,
  ROUND(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM demo_products), 1) as percentage
FROM demo_products 
GROUP BY main_category 
ORDER BY count DESC;
```

**Expected**:
```
Games      : 3893 (34.7%)
Paket Data : 3446 (30.7%)
Voucher    : 1844 (16.4%)
E-Money    : 1517 (13.5%)
Pulsa      :  518 (4.6%)
PLN        :   11 (0.1%)
```

### Top Brands/Operators
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
  product_type,
  base_price_minor / 100.0 as price_idr
FROM demo_products 
LIMIT 10;
```

### Check for Duplicates (Should be 0)
```sql
SELECT 
  sku_digiflazz, 
  COUNT(*) as count 
FROM demo_products 
GROUP BY sku_digiflazz 
HAVING COUNT(*) > 1;
```

## ⚠️ Important Notes

1. **File Location**: `D:\coding\1.PPOB PAYMENT\digiflazz-product-reference\all-products.csv`

2. **Price Format**: Values are in minor units (cents)
   - Example: `210500` = Rp 2,105.00
   - Divide by 100 to get IDR amount

3. **Metadata Column**: JSON string format
   - Contains: type, description, image_url
   - Already properly escaped for CSV

4. **Boolean Values**: `true` (lowercase string)
   - Supabase will convert to boolean type

5. **Character Encoding**: UTF-8
   - Handles Indonesian characters correctly

6. **Duplicate Handling**: 
   - CSV includes all 11,229 unique products
   - No duplicates in source data
   - Safe to use "Update" or "Skip" on conflict

## 🆘 Troubleshooting

### "File too large"
- CSV is 3.10 MB - should be fine for Supabase
- If fails, use SQL batches method instead

### "Invalid CSV format"
- Ensure file is UTF-8 encoded
- Check no extra commas in data
- Verify headers match table columns

### "Column mismatch"
- Ensure table has all columns: sku_digiflazz, name, category, provider, base_price_minor, is_active, metadata, main_category, sub_category, product_type
- Check column types match (text, bigint, boolean, jsonb)

### "Import incomplete"
- Check error messages in Supabase dashboard
- Verify row count after import
- Re-run import with "Update on conflict"

## 📊 Expected Result

After successful import:
```
✅ 11,229 rows imported
✅ 0 duplicates
✅ 6 categories
✅ All SKUs unique
✅ All prices in minor units
✅ All metadata valid JSON
```

---

**Status**: ✅ CSV ready for upload
**File**: `digiflazz-product-reference/all-products.csv`
**Action**: Upload via Supabase Dashboard → Table Editor → demo_products → Import CSV
