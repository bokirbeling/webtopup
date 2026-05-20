# Full Digiflazz Scraping Guide

## Overview
Script untuk scraping SEMUA kategori Prabayar dan Pascabayar dari Digiflazz.

## Categories to Scrape

### Prabayar (22 categories)
1. Pulsa
2. Data
3. Games
4. Voucher
5. E-Money
6. PLN
7. China TOPUP
8. Malaysia TOPUP
9. Philippines TOPUP
10. Singapore TOPUP
11. Thailand TOPUP
12. Paket SMS & Telpon
13. Vietnam Topup
14. Streaming
15. TV
16. Aktivasi Voucher
17. Masa Aktif
18. Bundling
19. Aktivasi Perdana
20. Gas
21. eSIM
22. Media Sosial

### Pascabayar (18 categories)
1. PLN PASCABAYAR
2. PDAM
3. HP PASCABAYAR
4. INTERNET PASCABAYAR
5. BPJS KESEHATAN
6. MULTIFINANCE
7. PBB
8. GAS NEGARA
9. TV PASCABAYAR
10. SAMSAT
11. BPJS KETENAGAKERJAAN
12. PLN NONTAGLIS
13. E-MONEY
14. Telkomsel Omni
15. Indosat Only4u
16. Tri CuanMax
17. XL Axis Cuanku
18. by.U

## Installation

```bash
pip install playwright
playwright install chromium
```

## Usage

```bash
cd backend/src/scripts
python full_scrape_digiflazz.py
```

## Output

**File**: `digiflazz-full-products.csv`

**Format**:
```csv
sku_digiflazz,name,category,provider,base_price_minor,is_active,metadata,main_category,sub_category,product_type
pulsa-telkomsel-abc123,Telkomsel 10.000,Pulsa,TELKOMSEL,1000000,True,"{""type"":""Umum"",...}",Pulsa,TELKOMSEL,Umum
```

## CSV Columns

1. `sku_digiflazz` - Unique SKU (category-hash)
2. `name` - Product name
3. `category` - Category name
4. `provider` - Brand/operator
5. `base_price_minor` - Price in cents
6. `is_active` - Boolean (always True)
7. `metadata` - JSON string (type, description, image_url)
8. `main_category` - Main category
9. `sub_category` - Brand/operator
10. `product_type` - Product type (default: Umum)

## Import to Supabase

### Option 1: Dashboard Upload
1. Open Supabase Dashboard
2. Go to Table Editor → demo_products
3. Click "Import data from CSV"
4. Select `digiflazz-full-products.csv`
5. Map columns (auto-detected)
6. Click "Import"

### Option 2: SQL Import
```sql
-- Truncate existing data
TRUNCATE demo_products;

-- Import via COPY command (requires superuser)
-- Or use Dashboard CSV upload
```

## Expected Results

- **Total products**: ~15,000-20,000 (estimate)
- **Prabayar**: ~12,000 products
- **Pascabayar**: ~3,000-8,000 products

## Features

- ✅ Auto-generate unique SKU
- ✅ Extract brand from product name
- ✅ Convert price to minor units (cents)
- ✅ Handle missing images
- ✅ Category breakdown report
- ✅ Progress tracking
- ✅ Error handling per category

## Notes

- Script runs in non-headless mode (visible browser)
- Each category takes ~2-3 seconds
- Total time: ~2-3 minutes for 40 categories
- CSV ready for direct Supabase import
