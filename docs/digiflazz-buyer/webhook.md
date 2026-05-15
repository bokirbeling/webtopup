# Webhooks

Source URL: `https://developer.digiflazz.com/api/buyer/webhook/`
Fetched at: `2026-05-15T03:29:23.410Z`

Webhooks memungkinkan aplikasi Anda berlangganan event tertentu terkait penambahan atau perubahan status transaksi di Digiflazz. Saat event terjadi, Digiflazz mengirimkan HTTP `POST` payload ke URL yang sudah dikonfigurasi. Webhook bisa dipakai untuk update realtime, notifikasi, grafik realtime, dan analisa data.

Webhook dikonfigurasi pada menu `Atur Koneksi > API > Webhook`.

## Delivery Headers

### List Headers

| Header | Deskripsi |
| --- | --- |
| `X-Digiflazz-Event` | Nama tipe event yang menyebabkan event dikirim |
| `X-Hub-Signature` | HMAC hex dari response body. Header ini dikirim jika webhook memakai `secret`. HMAC menggunakan hash `sha1` dan HMAC key. |
| `User-Agent` | Digunakan untuk membedakan jenis transaksi, prepaid atau postpaid |

### X-Digiflazz-Event

| Nama | Deskripsi |
| --- | --- |
| `create` | Event saat transaksi baru terjadi |
| `update` | Event saat transaksi yang sudah ada mengalami perubahan status |

### User-Agent

| Nama | Deskripsi |
| --- | --- |
| `Digiflazz-Hookshot` | Webhook mengirim data transaksi prepaid |
| `Digiflazz-Pasca-Hookshot` | Webhook mengirim data transaksi postpaid |

## Payloads

### Contoh pengiriman, Prabayar

```http
POST /webhook HTTP/1.1
Host: localhost:4567
X-Hub-Signature: sha1=7d6f016c23d03b696e76dada91c07f178cc0af4d
User-Agent: Digiflazz-Hookshot
Content-Type: application/json
Content-Length: 445
X-Digiflazz-Event: create

{
  "data": {
    "ref_id": "30467470",
    "customer_no": "081280556115",
    "buyer_sku_code": "ovo100",
    "message": "Sukses",
    "status": "Sukses",
    "rc": "00",
    "buyer_last_saldo": 326719460,
    "sn": "SEPTIAPAR/20190401214753214742",
    "price": 199800,
    "tele": "@telegram",
    "wa": "081234512345"
  }
}
```

### Contoh pengiriman, Pascabayar

Contoh di bawah adalah payload untuk produk PLN pascabayar. Untuk produk pascabayar lain, ikuti struktur response pada halaman `bayar-tagihan.md`.

```http
POST /webhook HTTP/1.1
Host: localhost:4567
X-Hub-Signature: sha1=debdf6dfb3b62dfd3e98cd39e600027080938f52
User-Agent: Digiflazz-Pasca-Hookshot
Content-Type: application/json
Content-Length: 695
X-Digiflazz-Event: update

{
  "data": {
    "ref_id": "1763103975",
    "customer_no": "530000000000",
    "customer_name": "SUBCRIBER NAME",
    "buyer_sku_code": "plnpsaca",
    "admin": 2750,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "rc": "00",
    "sn": "004212C9245F1BA43A77CEBD5CD5DA39",
    "periode": "201608",
    "buyer_last_saldo": 326719460,
    "price": 300950,
    "selling_price": 302750,
    "desc": {
      "tarif": "R1",
      "daya": 1300,
      "lembar_tagihan": 1800,
      "detail": [
        {
          "periode": "201608",
          "nilai_tagihan": "300000",
          "admin": "2750",
          "denda": "0",
          "meter_awal": "00080000",
          "meter_akhir": "00080000"
        }
      ]
    }
  }
}
```

### Contoh Handle Event

Contoh resmi menerima event di program PHP Laravel:

```php
<?php
use Illuminate\Http\Request;

Route::post('/webhook', function(Request $request) {
    $secret = 'somesecretvalue';

    $post_data = file_get_contents('php://input');
    $signature = hash_hmac('sha1', $post_data, $secret);
    \Log::info($signature);

    if ($request->header('X-Hub-Signature') == 'sha1='.$signature) {
        \Log::info(json_decode($request->getContent(), true));
    }
});
```

## Ping Event

Saat Anda menetapkan webhook, Digiflazz mengirim event `ping` sederhana untuk memberitahukan bahwa webhook yang dikonfigurasi sudah benar dan dapat digunakan. Event ini tidak disimpan, jadi tidak bisa diambil melalui API. Anda dapat memicu `ping` dengan memanggil ping endpoint.

### Ping Event Payload

| Key | Value |
| --- | --- |
| `sed` | Random string dari Digiflazz |
| `hook_id` | ID dari webhook yang memicu ping |
| `hook` | Detail dari konfigurasi webhook Anda |

### Ping Endpoint

```text
https://api.digiflazz.com/v1/report/hooks/[YOUR-WEBHOOK-ID]/pings
```

### Contoh Ping

```http
> POST /v1/report/hooks/11aaabbb/pings HTTP/1.1
> Host: localhost:4567
> Accept: */*
> Content-Length: 0

< HTTP/1.1 200 OK
< Content-Length: 155
< Content-Type: application/json

{
  "sed": "AgXXtVAHp",
  "hook_id": "11aaabbb",
  "hook": {
    "url": "https://awesomesite.com/webhooks",
    "secret": "somesecretkeywords",
    "type": "application/json",
    "status": 1
  }
}
```
