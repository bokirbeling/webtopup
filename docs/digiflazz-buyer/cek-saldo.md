# Cek Saldo

Source URL: `https://developer.digiflazz.com/api/buyer/cek-saldo/`
Fetched at: `2026-05-15T03:29:23.410Z`

Dokumen resmi menamai halaman ini `Cek Deposit`. Endpoint ini memberikan info mengenai sisa deposit yang Anda miliki.

## Endpoint

```text
https://api.digiflazz.com/v1/cek-saldo
```

## Request

### Contoh

```json
{
  "cmd": "deposit",
  "username": "username",
  "sign": "740b00a1b8784e028cc8078edf66d12b"
}
```

### Deskripsi

| Parameter | Deskripsi | Tipe Data | Wajib |
| --- | --- | --- | --- |
| `cmd` | value: `deposit` | `String` | Ya |
| `username` | Username yang telah diatur di pengaturan koneksi API | `String` | Ya |
| `sign` | Signature dengan formula `md5(username + apiKey + "depo")` | `String` | Ya |

## Response

### Contoh

```json
{
  "data": {
    "deposit": 500000000000
  }
}
```

### Deskripsi

| Parameter | Deskripsi | Tipe Data | Wajib |
| --- | --- | --- | --- |
| `deposit` | Sisa deposit Anda | `Float` | Ya |

## Catatan Penting

Response JSON dibungkus oleh variabel `data`, jadi parsing harus membaca nilai dari `data.deposit`.
