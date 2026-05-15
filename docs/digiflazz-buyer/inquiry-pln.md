# Inquiry PLN

Source URL: `https://developer.digiflazz.com/api/buyer/inquiry-pln/`
Fetched at: `2026-05-15T03:29:23.410Z`

Cek validasi nomor ID PLN yang Anda miliki.

## Endpoint

```text
https://api.digiflazz.com/v1/inquiry-pln
```

## Request

### Contoh

```json
{
  "username": "username",
  "customer_no": "1234554321",
  "sign": "740b00a1b8784e028cc8078edf66d12b"
}
```

### Deskripsi

| Parameter | Deskripsi | Tipe Data | Wajib |
| --- | --- | --- | --- |
| `username` | Username yang telah diatur di pengaturan koneksi API | `String` | Ya |
| `customer_no` | ID PLN customer | `String` | Ya |
| `sign` | Signature dengan formula `md5(username + apiKey + customer_no)` | `String` | Ya |

## Response

### Contoh

```json
{
  "data": {
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "rc": "00",
    "customer_no": "1234554321",
    "meter_no": "1234554321",
    "subscriber_id": "523300817840",
    "name": "DAVID",
    "segment_power": "R1 /000001300"
  }
}
```

### Deskripsi

| Parameter | Deskripsi | Tipe Data | Wajib |
| --- | --- | --- | --- |
| `message` | Deskripsi status transaksi | `String` | Ya |
| `status` | Status transaksi `Sukses`, `Gagal` | `String` | Ya |
| `rc` | Response code | `String` | Ya |
| `customer_no` | ID PLN customer | `String` | Ya |
| `meter_no` | Nomor meteran | `String` | Tidak |
| `subscriber_id` | Informasi ID customer | `String` | Tidak |
| `name` | Nama customer | `String` | Tidak |
| `segment_power` | Daya | `String` | Tidak |

## Catatan Penting

Response JSON dibungkus oleh variabel `data`, jadi parsing harus membaca nilai di dalam `data`.
