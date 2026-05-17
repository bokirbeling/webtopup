# Excel Template Structure

Source file: `D:\coding\1.PPOB PAYMENT\contoh templatedaftar-produk-buyer.xlsx`

## Sheet

- `Worksheet`

## Headers

1. `No`
2. `Kode Produk`
3. `Produk`
4. `Seller`
5. `Harga`
6. `Harga Max`
7. `Stok`
8. `Status`
9. `Perubahan Terakhir`
10. `Deskripsi`

## Required Fields

- `Kode Produk` -> `products.sku_digiflazz`
- `Produk` -> `products.name`
- `Seller` -> `products.provider`
- `Harga` -> `products.base_price_minor`
- `Status` -> `products.is_active`

## Derived Fields

- `category` from first token of `Produk`
- `metadata.digiflazz_buyer_template.max_price_minor` from `Harga Max`
- `metadata.digiflazz_buyer_template.stock` from `Stok`
- `metadata.digiflazz_buyer_template.changed_at` from `Perubahan Terakhir`
- `metadata.digiflazz_buyer_template.description` from `Deskripsi`

## Sample Rows

1. `4Iae76` | `Go Pay 30.000` | `GO RELOAD ID` | `30350` | `Aktif`
2. `4NwI38` | `Go Pay 50.000` | `Digital Komunika` | `51125` | `Aktif`
3. `4NwM42` | `Go Pay 90.000` | `Digital Komunika` | `91125` | `Aktif`
4. `4NwT49` | `Go Pay 100.000` | `PT WIJAYA KOMUNIKA PAYMENT` | `100875` | `Aktif`
5. `pre31522986` | `Telkomsel 2.000` | `Mekarsari Online` | `2915` | `Tidak Aktif`
