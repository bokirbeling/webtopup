# Import Produk Digiflazz ke Database

Script untuk mengimport produk hasil scraping dari https://id.digiflazz.com/daftar-harga ke database Supabase.

## Data Source

Data produk berasal dari scraping website Digiflazz yang tersimpan di folder `digiflazz-product-reference/`:
- **Total produk**: 3,335,105 produk
- **Kategori**: Pulsa, Data, Games, Voucher, E-Money, PLN
- **Format**: JSON array dengan struktur lengkap (nama, harga, brand, kategori, gambar)

## Prerequisites

1. Supabase project sudah running
2. Migration `20260517120000_admin_bulk_upsert_products_rpc.sql` sudah dijalankan
3. Environment variables sudah diset:
   ```bash
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```

## Usage

### 1. Import Produk ke Database

#### Dry Run (Test tanpa insert)
```bash
cd backend
npm run import-products -- --dry-run
```

#### Import Semua Kategori
```bash
npm run import-products
```

#### Import Kategori Tertentu
```bash
# Hanya pulsa
npm run import-products -- --categories=pulsa

# Pulsa dan games
npm run import-products -- --categories=pulsa,games

# Semua kecuali games (manual)
npm run import-products -- --categories=pulsa,data,voucher,emoney,pln
```

#### Import dengan Limit (Testing)
```bash
# Import maksimal 1000 produk per file
npm run import-products -- --limit=1000

# Dry run dengan limit
npm run import-products -- --dry-run --limit=100
```

### 2. Download Gambar Produk

#### Dry Run
```bash
npm run download-images -- --dry-run
```

#### Download Semua Gambar
```bash
npm run download-images
```

#### Download Brand Tertentu
```bash
# Hanya Telkomsel dan GoPay
npm run download-images -- --brands=TELKOMSEL,GOPAY

# Mobile Legends, Free Fire, PUBG
npm run download-images -- --brands="MOBILE LEGENDS,FREE FIRE,PUBG MOBILE"
```

#### Custom Output Directory
```bash
npm run download-images -- --output=../Frontend/public/product-images
```

## Data Structure

### Input (Scraped JSON)
```json
{
  "name": "Telkomsel 5.000",
  "price": 5190,
  "category": "Pulsa",
  "brand": "TELKOMSEL",
  "type": "Umum",
  "desc": "Reguler",
  "image_url": "https://cdn.mobilepulsa.net/img/logo/pulsa/small/telkomsel.png"
}
```

### Output (Database)
```sql
-- products table
{
  id: uuid,
  sku_digiflazz: 'pulsa-telkomsel-abc123',  -- Generated SKU
  name: 'Telkomsel 5.000',
  category: 'Pulsa',
  provider: 'TELKOMSEL',
  base_price_minor: 519000,  -- Price in cents (5190 * 100)
  is_active: true,
  metadata: {
    type: 'Umum',
    description: 'Reguler',
    image_url: 'https://cdn.mobilepulsa.net/...',
    original_price: 5190,
    imported_at: '2026-05-17T08:18:55.100Z'
  }
}
```

## Performance

- **Batch size**: 500 produk per RPC call
- **Estimated time**: 
  - 1,000 produk: ~30 detik
  - 10,000 produk: ~5 menit
  - 100,000 produk: ~50 menit
  - 3,335,105 produk: ~28 jam (full import)

## Recommendations

### Development/Testing
```bash
# Import sample dari setiap kategori (1000 produk per file)
npm run import-products -- --limit=1000

# Download gambar untuk brand populer
npm run download-images -- --brands=TELKOMSEL,GOPAY,DANA,OVO,"MOBILE LEGENDS"
```

### Production
```bash
# Import semua produk (jalankan saat off-peak hours)
npm run import-products

# Download semua gambar (parallel dengan import)
npm run download-images
```

### Incremental Import
```bash
# Import per kategori untuk monitoring
npm run import-products -- --categories=pulsa
npm run import-products -- --categories=emoney
npm run import-products -- --categories=games
# ... dst
```

## Troubleshooting

### Error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY"
```bash
# Check .env file
cat .env | grep SUPABASE

# Atau set manual
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_SERVICE_ROLE_KEY=your-key
```

### Error: "admin_bulk_upsert_products does not exist"
```bash
# Run migration
cd ../supabase
supabase db push
```

### Import Terlalu Lambat
```bash
# Gunakan limit untuk testing dulu
npm run import-products -- --limit=100 --dry-run

# Atau import per kategori
npm run import-products -- --categories=pulsa
```

### Gambar Gagal Download
```bash
# Check network/firewall
curl -I https://cdn.mobilepulsa.net/img/logo/pulsa/small/telkomsel.png

# Retry dengan brand tertentu
npm run download-images -- --brands=TELKOMSEL
```

## File Structure

```
backend/
├── src/
│   └── scripts/
│       ├── import-digiflazz-products.ts  # Import produk ke DB
│       └── download-product-images.ts     # Download gambar
├── package.json                           # npm scripts
└── IMPORT_GUIDE.md                        # This file

digiflazz-product-reference/
├── pulsa-telkomsel.json    # 65,040 produk
├── pulsa-xl.json           # 3,684 produk
├── pulsa-indosat.json      # 9,362 produk
├── pulsa-tri.json          # 6,262 produk
├── pulsa-smartfren.json    # 9,798 produk
├── pulsa-axis.json         # 4,008 produk
├── pulsa-byu.json          # 26,814 produk
├── data.json               # 981,870 produk
├── games.json              # 1,234,915 produk
├── voucher.json            # 551,254 produk
├── emoney.json             # 438,965 produk
├── pln.json                # 3,133 produk
└── README.md

next-frontend/public/
└── product-images/         # Downloaded images
    ├── pulsa-telkomsel-telkomsel.png
    ├── games-mobile-legends-a269a45b.jpg
    └── ...
```

## Notes

1. **SKU Generation**: SKU otomatis di-generate dari `category-brand-hash` untuk memastikan uniqueness
2. **Price Conversion**: Harga dikonversi ke minor units (cents) untuk presisi: `5190 IDR → 519000 cents`
3. **Upsert Logic**: Script menggunakan `ON CONFLICT (sku_digiflazz) DO UPDATE` untuk handle duplicate
4. **Image Deduplication**: Download script hanya download unique image URLs
5. **Metadata Preservation**: Semua field tambahan (type, desc, original_price) disimpan di `metadata` JSONB

## Next Steps

Setelah import selesai:

1. **Verify data**:
   ```sql
   SELECT category, COUNT(*) as total 
   FROM products 
   GROUP BY category 
   ORDER BY total DESC;
   ```

2. **Setup pricing rules** (opsional):
   ```sql
   INSERT INTO pricing_rules (scope_type, category, role_type, markup_percentage)
   VALUES ('category', 'Pulsa', 'pengguna', 5.0);
   ```

3. **Test frontend catalog**:
   - Browse ke `/products`
   - Filter by category
   - Check image loading

4. **Monitor performance**:
   - Check query performance dengan `EXPLAIN ANALYZE`
   - Add indexes jika diperlukan
   - Consider materialized views untuk aggregations
