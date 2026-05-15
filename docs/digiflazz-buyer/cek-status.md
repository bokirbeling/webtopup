# Cek Status

Source URL: `https://developer.digiflazz.com/api/buyer/cek-status/`
Fetched at: `2026-05-15T03:29:23.410Z`

## Mohon Perhatian

Untuk menjaga konsistensi proses, Digiflazz menyarankan agar pemanggilan API untuk transaksi atau data yang sama tidak dilakukan berulang dalam interval kurang dari 1 menit. Pemanggilan berulang dalam rentang waktu tersebut dapat menimbulkan race condition atau duplikasi proses. Risiko dari kondisi itu berada di luar tanggung jawab Digiflazz.

## Prepaid

Cek status prepaid dilakukan dengan melakukan topup ulang memakai `ref_id` yang sama pada transaksi sebelumnya.

Ikuti petunjuk di halaman `topup.md` untuk detail request dasar.

Mohon perhatian, jangan pernah mencoba cek status terhadap transaksi yang sudah lewat 90 hari karena hal itu akan menyebabkan pembuatan transaksi baru.

## Postpaid

Cek status pascabayar dilakukan dengan `ref_id` yang sama pada transaksi sebelumnya dengan `commands: status-pasca`.

Mohon perhatian, cek status pascabayar terhadap transaksi yang sudah lewat 90 hari akan mendapatkan pesan `Data belum ada`.

## Request

| Parameter | Deskripsi | Tipe Data | Wajib |
| --- | --- | --- | --- |
| `commands` | Perintah yang akan dieksekusi: `status-pasca` | `String` | Ya |
| `username` | Username yang telah diatur di pengaturan koneksi API | `String` | Ya |
| `buyer_sku_code` | Kode produk Anda | `String` | Ya |
| `customer_no` | Nomor pelanggan | `String` | Ya |
| `ref_id` | Ref ID unik Anda | `String` | Ya |
| `sign` | Signature dengan formula `md5(username + apiKey + ref_id)` | `String` | Ya |

### Contoh

```json
{
  "commands": "status-pasca",
  "username": "username",
  "buyer_sku_code": "pln",
  "customer_no": "530000000003",
  "ref_id": "some1d",
  "sign": "740b00a1b8784e028cc8078edf66d12b"
}
```

## Capture Note

Official content retrieved for this page contained the warning and request guidance above. No separate response block was present in the fetched page content used for this local mirror.
