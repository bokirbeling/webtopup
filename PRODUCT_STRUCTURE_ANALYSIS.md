# Struktur Data Produk - Analisis dan Rekomendasi

## Struktur Database Saat Ini

```sql
demo_products (
  id uuid PRIMARY KEY,
  sku_digiflazz text NOT NULL UNIQUE,
  name text NOT NULL,
  category text NOT NULL,           -- "Data", "Games", "Pulsa", etc
  provider text NOT NULL,            -- "TELKOMSEL", "XL", "FREE FIRE", etc
  base_price_minor bigint NOT NULL,
  is_active boolean DEFAULT true,
  metadata jsonb DEFAULT '{}',       -- { type, desc, image_url }
  created_at timestamptz,
  updated_at timestamptz
)
```

## Struktur Data Digiflazz (JSON)

```json
{
  "name": "Telkomsel Data Flash 10 MB 1 Hari",
  "price": 500,
  "category": "Data",
  "brand": "TELKOMSEL",
  "type": "Flash",
  "desc": "24 jam nasional.",
  "image_url": "https://cdn.mobilepulsa.net/img/logo/pulsa/small/telkomsel.png"
}
```

## Analisis Kategori dari JSON Files

### Total Products: 11,247
- **data.json**: 3,446 products (Paket Data)
- **games.json**: 3,893 products (Voucher Game)
- **voucher.json**: 1,844 products (Voucher Digital)
- **emoney.json**: 1,517 products (E-Money/E-Wallet)
- **pulsa-telkomsel.json**: 273 products
- **pulsa-byu.json**: 102 products
- **pulsa-smartfren.json**: 42 products
- **pulsa-indosat.json**: 38 products
- **pulsa-tri.json**: 28 products
- **pulsa-axis.json**: 18 products
- **pulsa-xl.json**: 17 products
- **pascabayar.json**: 18 products
- **pln.json**: 11 products

## Masalah Struktur Saat Ini

### 1. Kategori Tidak Konsisten
- File terpisah untuk pulsa per operator (pulsa-telkomsel, pulsa-xl, dll)
- Seharusnya semua pulsa dalam satu kategori "Pulsa" dengan sub-kategori operator

### 2. Sub-Kategori Tersembunyi di Metadata
- `type` (Flash, Mini, Cek Paket, dll) tersimpan di metadata JSONB
- Sulit untuk filter/query berdasarkan sub-kategori
- Tidak ada index untuk sub-kategori

### 3. Hierarki Kategori Tidak Jelas
```
Saat ini:
- category: "Data"
- provider: "TELKOMSEL"
- metadata.type: "Flash"

Seharusnya:
- main_category: "Paket Data"
- sub_category: "Telkomsel"
- product_type: "Flash"
```

## Rekomendasi Struktur Baru

### Option 1: Tambah Kolom Sub-Kategori (RECOMMENDED)

```sql
ALTER TABLE demo_products
ADD COLUMN main_category text,
ADD COLUMN sub_category text,
ADD COLUMN product_type text;

-- Migrate existing data
UPDATE demo_products SET
  main_category = category,
  sub_category = provider,
  product_type = metadata->>'type';

-- Create indexes
CREATE INDEX idx_products_main_category ON demo_products(main_category);
CREATE INDEX idx_products_sub_category ON demo_products(sub_category);
CREATE INDEX idx_products_product_type ON demo_products(product_type);
```

**Hierarki:**
```
Pulsa
├── Telkomsel (273 products)
│   ├── Reguler
│   ├── Cek Hutang
│   └── Transfer
├── XL (17 products)
├── Indosat (38 products)
├── Tri (28 products)
├── Axis (18 products)
├── Smartfren (42 products)
└── By.U (102 products)

Paket Data
├── Telkomsel (3,446 products)
│   ├── Flash
│   ├── Mini
│   ├── Maxstream
│   ├── Ketengan
│   └── Serba Lima Ribu
├── XL
├── Indosat
└── ...

Games
├── Free Fire (893 products)
├── Mobile Legends (1,200 products)
├── PUBG Mobile
├── Genshin Impact
└── ...

E-Money
├── GoPay (200 products)
├── OVO (180 products)
├── DANA (150 products)
├── ShopeePay (120 products)
└── ...

Voucher
├── Google Play (300 products)
├── Steam (150 products)
├── Netflix (50 products)
└── ...

PLN
├── Token Listrik (11 products)

Pascabayar
├── Telkom (18 products)
```

### Option 2: Gunakan Metadata dengan Index (Alternatif)

```sql
-- Create GIN index for metadata JSONB
CREATE INDEX idx_products_metadata_type ON demo_products 
USING GIN ((metadata->'type'));

-- Query example
SELECT * FROM demo_products 
WHERE category = 'Data' 
  AND provider = 'TELKOMSEL'
  AND metadata->>'type' = 'Flash';
```

## Mapping Kategori yang Benar

### Kategori Utama (main_category)
1. **Pulsa** - Isi ulang pulsa reguler
2. **Paket Data** - Paket internet
3. **Games** - Voucher game
4. **E-Money** - Top-up e-wallet
5. **Voucher** - Voucher digital (Google Play, Steam, dll)
6. **PLN** - Token listrik
7. **Pascabayar** - Tagihan pascabayar

### Sub-Kategori (sub_category) = Provider/Brand
- Telkomsel, XL, Indosat, Tri, Axis, Smartfren, By.U
- Free Fire, Mobile Legends, PUBG, Genshin Impact
- GoPay, OVO, DANA, ShopeePay, LinkAja
- Google Play, Steam, Netflix, Spotify

### Tipe Produk (product_type) = Type dari Digiflazz
- Flash, Mini, Maxstream, Ketengan, Reguler
- Diamond, Voucher, Membership
- Top-up, Transfer

## Action Plan

1. **Backup existing data** (jika ada)
2. **Alter table** - tambah kolom baru
3. **Re-generate SQL** dengan struktur baru
4. **Import ulang** dengan mapping yang benar
5. **Verify** kategori dan sub-kategori
6. **Update frontend** untuk support hierarki baru

## SQL untuk Implementasi

```sql
-- Step 1: Add new columns
ALTER TABLE demo_products
ADD COLUMN IF NOT EXISTS main_category text,
ADD COLUMN IF NOT EXISTS sub_category text,
ADD COLUMN IF NOT EXISTS product_type text;

-- Step 2: Migrate existing data (if any)
UPDATE demo_products SET
  main_category = CASE
    WHEN category = 'Data' THEN 'Paket Data'
    WHEN category = 'Pulsa' THEN 'Pulsa'
    WHEN category = 'Games' THEN 'Games'
    WHEN category = 'E-Money' THEN 'E-Money'
    WHEN category = 'Voucher' THEN 'Voucher'
    WHEN category = 'Listrik PLN' THEN 'PLN'
    ELSE category
  END,
  sub_category = provider,
  product_type = metadata->>'type';

-- Step 3: Create indexes
CREATE INDEX IF NOT EXISTS idx_products_main_category 
  ON demo_products(main_category);
CREATE INDEX IF NOT EXISTS idx_products_sub_category 
  ON demo_products(sub_category);
CREATE INDEX IF NOT EXISTS idx_products_product_type 
  ON demo_products(product_type);

-- Step 4: Add constraints (optional)
ALTER TABLE demo_products
ADD CONSTRAINT chk_main_category CHECK (
  main_category IN ('Pulsa', 'Paket Data', 'Games', 'E-Money', 'Voucher', 'PLN', 'Pascabayar')
);
```
