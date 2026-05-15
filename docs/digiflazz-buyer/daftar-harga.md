# Daftar Harga

Source URL: `https://developer.digiflazz.com/api/buyer/daftar-harga/`
Fetched at: `2026-05-15T03:29:23.410Z`

Daftar harga memberikan info mengenai daftar harga yang telah Anda setting.

## Endpoint

```text
https://api.digiflazz.com/v1/price-list
```

## Request Price List Prepaid

### Contoh

```json
{
  "cmd": "prepaid",
  "username": "username",
  "sign": "740b00a1b8784e028cc8078edf66d12b"
}
```

### Catatan Penting

Terdapat limitasi pengecekan daftar harga. Simpan daftar harga pada database milik Anda dan update harga secara berkala. Tampilkan harga ke user berdasarkan data yang sudah Anda simpan.

Pengecekan daftar harga dengan parameter `category`, `brand`, atau `type` tidak real time. Perbedaan data dapat berkisar 10 sampai 15 menit.

### Deskripsi

| Parameter | Deskripsi | Tipe Data | Wajib |
| --- | --- | --- | --- |
| `cmd` | Command: `prepaid` atau `pasca` | `String` | Ya |
| `username` | Username yang telah diatur di pengaturan koneksi API | `String` | Ya |
| `code` | Kode produk Anda sebagai Buyer | `String` | Tidak |
| `category` | Kategori produk pada Digiflazz | `String` | Tidak |
| `brand` | Merek produk pada Digiflazz | `String` | Tidak |
| `type` | Tipe produk pada Digiflazz | `String` | Tidak |
| `sign` | Signature dengan formula `md5(username + apiKey + "pricelist")` | `String` | Ya |

## Response Price List Prepaid

### Contoh

```json
{
  "data": [
    {
      "product_name": "Xl 100.000",
      "category": "Pulsa",
      "brand": "XL",
      "type": "Umum",
      "seller_name": "PT. ABC",
      "price": 98000,
      "buyer_sku_code": "X100",
      "buyer_product_status": true,
      "seller_product_status": true,
      "unlimited_stock": true,
      "stock": 0,
      "multi": true,
      "start_cut_off": "23:45",
      "end_cut_off": "00:15",
      "desc": "Pulsa Xl Rp 100.000"
    },
    {
      "product_name": "Telkomsel Pulsa 5.000",
      "category": "Pulsa",
      "brand": "TELKOMSEL",
      "type": "Umum",
      "seller_name": "PT. BCA",
      "price": 5100,
      "buyer_sku_code": "S5",
      "buyer_product_status": true,
      "seller_product_status": false,
      "unlimited_stock": false,
      "stock": 1200,
      "multi": false,
      "start_cut_off": "00:00",
      "end_cut_off": "00:00",
      "desc": "Pulsa Telkomsel Rp 5.000"
    }
  ]
}
```

### Deskripsi

| Parameter | Deskripsi | Tipe Data | Wajib |
| --- | --- | --- | --- |
| `product_name` | Nama produk | `String` | Ya |
| `category` | Nama kategori | `String` | Ya |
| `brand` | Nama brand | `String` | Ya |
| `type` | Nama tipe | `String` | Ya |
| `seller_name` | Nama seller | `String` | Ya |
| `price` | Harga produk yang ditentukan oleh seller | `String` | Ya |
| `buyer_sku_code` | Kode produk yang disetting oleh Anda sebagai Buyer | `String` | Ya |
| `buyer_product_status` | Status produk Anda sebagai buyer | `Boolean` | Ya |
| `seller_product_status` | Status produk Seller | `Boolean` | Ya |
| `unlimited_stock` | Penentu apakah stok terbatas atau tidak | `Boolean` | Ya |
| `stock` | Sisa stock seller, dapat diabaikan jika `unlimited_stock` bernilai `true` | `String` | Ya |
| `multi` | Transaksi dapat dilakukan lebih dari satu kali ke denom dan nomor tujuan yang sama dalam sehari | `Bool` | Ya |
| `start_cut_off` | Jam mulai cut off, format `hh:mm` | `String` | Ya |
| `end_cut_off` | Jam selesai cut off, format `hh:mm` | `String` | Ya |
| `desc` | Deskripsi produk | `String` | Ya |

## Request Price List Pascabayar

### Contoh

```json
{
  "cmd": "pasca",
  "username": "username",
  "sign": "740b00a1b8784e028cc8078edf66d12b"
}
```

### Deskripsi

| Parameter | Deskripsi | Tipe Data | Wajib |
| --- | --- | --- | --- |
| `cmd` | Command: `prepaid` atau `pasca` | `String` | Ya |
| `username` | Username yang telah diatur di pengaturan koneksi API | `String` | Ya |
| `code` | Kode produk Anda sebagai Buyer | `String` | Tidak |
| `brand` | Merek produk pada Digiflazz | `String` | Tidak |
| `sign` | Signature dengan formula `md5(username + apiKey + "pricelist")` | `String` | Ya |

## Response Price List Pascabayar

### Contoh

```json
{
  "data": [
    {
      "product_name": "Pln Postpaid",
      "category": "Pascabayar",
      "brand": "PLN",
      "seller_name": "PT. ABC",
      "admin": 2750,
      "commission": 1800,
      "buyer_sku_code": "pln",
      "buyer_product_status": true,
      "seller_product_status": true,
      "desc": "-"
    },
    {
      "product_name": "aetra",
      "category": "Pascabayar",
      "brand": "PDAM",
      "seller_name": "Mr Ed",
      "admin": 2000,
      "commission": 550,
      "buyer_sku_code": "aetra",
      "buyer_product_status": true,
      "seller_product_status": true,
      "desc": "Provinsi Jakarta"
    }
  ]
}
```

### Deskripsi

| Parameter | Deskripsi | Tipe Data | Wajib |
| --- | --- | --- | --- |
| `product_name` | Nama produk | `String` | Ya |
| `category` | Nama kategori | `String` | Ya |
| `brand` | Nama brand | `String` | Ya |
| `seller_name` | Nama seller | `String` | Ya |
| `admin` | Biaya admin | `Int` | Ya |
| `commission` | Biaya komisi yang akan didapatkan Buyer | `Int` | Ya |
| `buyer_sku_code` | Kode produk yang disetting oleh Anda sebagai Buyer | `String` | Ya |
| `buyer_product_status` | Status produk Anda sebagai buyer | `Boolean` | Ya |
| `seller_product_status` | Status produk Seller | `Boolean` | Ya |
| `desc` | Deskripsi produk | `String` | Ya |

## Catatan Penting

Response JSON dibungkus oleh variabel `data`, jadi parsing harus membaca hasil dari `data[]`.
