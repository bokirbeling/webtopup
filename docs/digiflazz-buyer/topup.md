# Topup

Source URL: `https://developer.digiflazz.com/api/buyer/topup/`
Fetched at: `2026-05-15T03:29:23.410Z`

Seluruh transaksi API diproses secara sinkron, jadi setiap request langsung mendapatkan respon status sukses, gagal, atau pending.

## Cek Status Pending

Respon `Pending` dapat dicek kembali dengan melakukan topup ulang dengan `ref_id` yang sama pada transaksi sebelumnya.

## Endpoint

```text
https://api.digiflazz.com/v1/transaction
```

## Request

### Deskripsi

| Parameter | Deskripsi | Tipe Data | Wajib |
| --- | --- | --- | --- |
| `username` | Username yang telah diatur di pengaturan koneksi API | `String` | Ya |
| `buyer_sku_code` | Kode produk Anda | `String` | Ya |
| `customer_no` | Nomor pelanggan | `String` | Ya |
| `ref_id` | Ref ID unik Anda | `String` | Ya |
| `sign` | Signature dengan formula `md5(username + apiKey + ref_id)` | `String` | Ya |
| `testing` | Isi `true` apabila ingin melakukan development | `Boolean` | Tidak |
| `max_price` | Limit harga max | `Int` | Tidak |
| `cb_url` | Callback URL | `String` | Tidak |
| `allow_dot` | Isi `true` apabila `customer_no` berisi titik, optimal untuk seller selain Jabber | `Boolean` | Tidak |

### Webhook Static

Apabila Anda memiliki webhook static, atur pada menu atur koneksi API, tab Webhook. `cb_url` digunakan apabila Anda memiliki lebih dari 1 webhook.

### Contoh Request

```json
{
  "username": "username",
  "buyer_sku_code": "xld25",
  "customer_no": "087800001233",
  "ref_id": "some1d",
  "sign": "740b00a1b8784e028cc8078edf66d12b"
}
```

## Response

### Deskripsi

| Parameter | Deskripsi | Tipe Data | Wajib |
| --- | --- | --- | --- |
| `ref_id` | Ref ID unik Anda | `String` | Ya |
| `customer_no` | Nomor pelanggan | `String` | Ya |
| `buyer_sku_code` | Kode produk Anda | `String` | Ya |
| `message` | Deskripsi status transaksi | `String` | Ya |
| `status` | Status transaksi `Sukses`, `Pending`, `Gagal` | `String` | Ya |
| `rc` | Response code | `String` | Ya |
| `sn` | Serial number | `String` | Tidak |
| `buyer_last_saldo` | Saldo terakhir Anda setelah transaksi terjadi | `Float` | Tidak |
| `price` | Harga produk | `Integer` | Ya |
| `tele` | Telegram seller | `String` | Tidak |
| `wa` | WhatsApp seller | `String` | Tidak |

### Contoh Response

```json
{
  "data": {
    "ref_id": "some1d",
    "customer_no": "087800001233",
    "buyer_sku_code": "xld25",
    "message": "Transaksi Pending",
    "status": "Pending",
    "rc": "03",
    "sn": "",
    "buyer_last_saldo": 100000,
    "price": 25000,
    "tele": "@telegram",
    "wa": "081234512345"
  }
}
```

## Catatan Penting

- Response JSON dibungkus oleh variabel `data`.
- Untuk melakukan test, gunakan variabel test yang disediakan di halaman `test-case.md`.
