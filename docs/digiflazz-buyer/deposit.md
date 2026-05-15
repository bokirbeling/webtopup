# Deposit

Source URL: `https://developer.digiflazz.com/api/buyer/deposit/`
Fetched at: `2026-05-15T03:29:23.410Z`

Deposit adalah fitur yang membuat Anda dapat melakukan penarikan tiket deposit.

## Endpoint

```text
https://api.digiflazz.com/v1/deposit
```

## Request

### Contoh

```json
{
  "username": "your-username",
  "amount": 10000000,
  "Bank": "BCA",
  "owner_name": "John Doe",
  "sign": "740b00a1b8784e028cc8078edf66d12b"
}
```

### Deskripsi

| Parameter | Deskripsi | Tipe Data | Wajib |
| --- | --- | --- | --- |
| `username` | Username yang telah diatur di pengaturan koneksi API | `String` | Ya |
| `amount` | Jumlah deposit yang Anda inginkan | `Int` | Ya |
| `bank` | Nama bank tujuan transfer. Pilihan perorangan: `Flip` / `ShopeePay`. Pilihan perusahaan: `BCA` / `MANDIRI` / `BRI` / `BNI` | `String` | Ya |
| `owner_name` | Nama pemilik rekening yang melakukan transfer deposit ke Digiflazz | `String` | Ya |
| `sign` | Signature dengan formula `md5(username + apiKey + "deposit")` | `String` | Ya |

## Response

### Contoh

```json
{
  "data": {
    "rc": "00",
    "bank": "BCA",
    "payment_method": "Bank Transfer",
    "account_no": "0123 4567 89",
    "notes": "A6R5UPV",
    "amount": 10000001
  }
}
```

### Deskripsi

| Parameter | Deskripsi | Tipe Data | Wajib |
| --- | --- | --- | --- |
| `rc` | Response code | `String` | Ya |
| `bank` | Bank tujuan | `String` | Ya |
| `payment_method` | Metode pembayaran ke bank tujuan. Terdapat `Bank Transfer` atau `Virtual Account` | `String` | Ya |
| `account_no` | Nomor rekening bank tujuan | `String` | Ya |
| `amount` | Jumlah akhir deposit yang harus ditransfer | `Int` | Ya |
| `notes` | Berita yang harus dimasukkan saat transfer deposit | `String` | Ya |

## Catatan Penting

Response JSON dibungkus oleh variabel `data`, jadi parsing harus membaca nilai di dalam `data`.
