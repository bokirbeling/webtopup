# ✅ CSV READY FOR UPLOAD

## File Information

**File**: `digiflazz-product-reference/all-products.csv`
**Size**: 3.1 MB
**Products**: 11,229 rows (+ 1 header row = 11,230 total lines)
**Format**: UTF-8 CSV with comma delimiter

## CSV Structure ✅ VERIFIED

### CSV Headers (10 columns):
```
sku_digiflazz,name,category,provider,base_price_minor,is_active,metadata,main_category,sub_category,product_type
```

### Database Columns (13 columns):
```
id                  - uuid (auto-generated) ✅
sku_digiflazz       - text (from CSV) ✅
name                - text (from CSV) ✅
category            - text (from CSV) ✅
provider            - text (from CSV) ✅
base_price_minor    - bigint (from CSV) ✅
is_active           - boolean (from CSV) ✅
metadata            - jsonb (from CSV) ✅
created_at          - timestamptz (auto-generated) ✅
updated_at          - timestamptz (auto-generated) ✅
main_category       - text (from CSV) ✅
sub_category        - text (from CSV) ✅
product_type        - text (from CSV) ✅
```

**Status**: ✅ All CSV columns match database columns
**Auto-generated**: `id`, `created_at`, `updated_at` will be created automatically

## Sample Data

**First product**:
```csv
pulsa-telkomsel-b5323f2e,Cek Hutang Pulsa Telkomsel,Pulsa,TELKOMSEL,600,true,"{""type"":""Cek Hutang"",""description"":""-"",""image_url"":""https://cdn.mobilepulsa.net/img/logo/pulsa/small/telkomsel.png""}",Pulsa,TELKOMSEL,Cek Hutang
```

**Last product**:
```csv
pln-pln-983db7a0,PLN 1.000.000,PLN,PLN,99972500,true,"{""type"":""Umum"",""description"":""masukkan nomor meter/id pelanggan"",""image_url"":""https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-eef4a9697efeb2e67c6a96199aa8ed6f.jpg""}",PLN,PLN,Umum
```

## Upload Instructions

### Method 1: Supabase Dashboard (RECOMMENDED)

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard/project/[your-project-id]

2. **Navigate to Table Editor**
   - Click "Table Editor" in left sidebar
   - Select `demo_products` table

3. **Import CSV**
   - Click "Insert" button → "Import data from CSV"
   - Or click upload icon in toolbar

4. **Upload File**
   - Select file: `D:\coding\1.PPOB PAYMENT\digiflazz-product-reference\all-products.csv`
   - Or drag & drop

5. **Configure Import Settings**
   ```
   ✅ First row is header: YES
   ✅ Delimiter: Comma (,)
   ✅ Encoding: UTF-8
   ✅ On duplicate: Update (or Skip)
   ```

6. **Click "Import"**
   - Wait ~30-60 seconds
   - Check for errors

### Method 2: SQL Batches (Alternative)

If CSV upload fails, use SQL batches:
```bash
cd backend/src/scripts
python import_final.py <supabase-url> <service-role-key>
```

**SQL Batches Location**: `digiflazz-product-reference/sql-batches-final/`
**Files**: 23 batches (batch-001.sql to batch-023.sql)

## Verification After Upload

### 1. Check Total Count
```sql
SELECT COUNT(*) FROM demo_products;
```
**Expected**: 11,229

### 2. Category Distribution
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

### 3. Check Duplicates
```sql
SELECT sku_digiflazz, COUNT(*) 
FROM demo_products 
GROUP BY sku_digiflazz 
HAVING COUNT(*) > 1;
```
**Expected**: 0 rows (no duplicates)

### 4. Sample Products
```sql
SELECT 
  sku_digiflazz,
  name,
  main_category,
  sub_category,
  base_price_minor / 100.0 as price_idr,
  is_active
FROM demo_products 
LIMIT 10;
```

### 5. Check Metadata Format
```sql
SELECT 
  sku_digiflazz,
  name,
  metadata->>'type' as product_type,
  metadata->>'description' as description,
  metadata->>'image_url' as image_url
FROM demo_products 
LIMIT 5;
```

## Important Notes

1. **Price Format**: Values in minor units (cents)
   - Example: 600 = Rp 6.00, 210500 = Rp 2,105.00
   - Divide by 100 to get IDR amount

2. **Metadata Format**: JSON string with escaped quotes
   - Example: `"{""type"":""Umum"",""description"":""Reguler""}"`
   - Supabase will parse as JSONB automatically

3. **Boolean Format**: Lowercase string `true` or `false`
   - Supabase converts to boolean type

4. **No Duplicates**: All 11,229 SKUs are unique

5. **Auto-generated Fields**: 
   - `id`: UUID v4
   - `created_at`: Current timestamp
   - `updated_at`: Current timestamp

## Troubleshooting

### Issue: "Invalid CSV format"
- Check file encoding is UTF-8
- Verify delimiter is comma (,)
- Ensure first row is header

### Issue: "Column mismatch"
- CSV has 10 columns (excluding auto-generated)
- Database expects: sku_digiflazz, name, category, provider, base_price_minor, is_active, metadata, main_category, sub_category, product_type

### Issue: "Duplicate key error"
- Database has UNIQUE constraint on `sku_digiflazz`
- Set "On duplicate" to "Update" or "Skip"

### Issue: "Upload timeout"
- File is 3.1 MB, may take 30-60 seconds
- Try SQL batches method instead

---

**Status**: ✅ CSV READY
**Action**: Upload via Supabase Dashboard
**File**: `digiflazz-product-reference/all-products.csv`
**Products**: 11,229
**Size**: 3.1 MB
