# Bayar Tagihan

Source URL: `https://developer.digiflazz.com/api/buyer/bayar-tagihan/`
Fetched at: `2026-05-15T03:29:23.410Z`

Seluruh transaksi API diproses secara sinkron, jadi setiap request langsung mendapatkan respon status sukses, gagal, atau pending.

## Cek Status dan Pending

Anda dapat melakukan cek status dengan `ref_id` yang sama pada transaksi sebelumnya.

Jika transaksi mendapatkan status `Pending`, Anda dapat:

- Menunggu notifikasi perubahan status melalui webhook.
- Melakukan cek status.

## Endpoint

```text
https://api.digiflazz.com/v1/transaction
```

## Mohon Perhatian

Anda hanya dapat melakukan pembayaran tagihan pada tanggal yang sama dengan tanggal pengecekan tagihan.

## Request

| Parameter | Deskripsi | Tipe Data | Wajib |
| --- | --- | --- | --- |
| `commands` | Perintah yang akan dieksekusi: `pay-pasca` | `String` | Ya |
| `username` | Username yang telah diatur di pengaturan koneksi API | `String` | Ya |
| `buyer_sku_code` | Kode produk Anda | `String` | Ya |
| `customer_no` | Nomor pelanggan | `String` | Ya |
| `ref_id` | Ref ID unik Anda yang sama dengan saat inquiry | `String` | Ya |
| `sign` | Signature dengan formula `md5(username + apiKey + ref_id)` | `String` | Ya |
| `testing` | Isi `true` apabila ingin melakukan development | `Boolean` | Tidak |

```json
{
  "commands": "pay-pasca",
  "username": "username",
  "buyer_sku_code": "pln",
  "customer_no": "530000000003",
  "ref_id": "some1d",
  "sign": "740b00a1b8784e028cc8078edf66d12b"
}
```

## Response PLN

Field dasar sama seperti inquiry, dengan tambahan penting `sn` sebagai serial number atau reference number.

```json
{
  "data": {
    "ref_id": "some1d",
    "customer_no": "530000000001",
    "customer_name": "Nama Pelanggan Pertama",
    "buyer_sku_code": "pln",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "rc": "00",
    "periode": "201901",
    "sn": "S1234554321N",
    "buyer_last_saldo": 90000,
    "price": 10000,
    "selling_price": 11000,
    "desc": {
      "tarif": "R1",
      "daya": 1300,
      "lembar_tagihan": 1,
      "detail": [
        {
          "periode": "201901",
          "nilai_tagihan": "8000",
          "admin": "2500",
          "denda": "500",
          "meter_awal": "00080000",
          "meter_akhir": "00090000"
        }
      ]
    }
  }
}
```

## Response PDAM

```json
{
  "data": {
    "ref_id": "353688162",
    "customer_no": "1013226",
    "customer_name": "Nama Pelanggan Pertama",
    "buyer_sku_code": "pdam",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "rc": "00",
    "periode": "201901",
    "sn": "S1234554321N",
    "buyer_last_saldo": 88500,
    "price": 11500,
    "selling_price": 12500,
    "desc": {
      "tarif": "3A",
      "lembar_tagihan": 1,
      "alamat": "WONOKROMO S.S BARU 2 8",
      "jatuh_tempo": "1-15 DES 2014",
      "detail": [
        {
          "periode": "201901",
          "nilai_tagihan": "8000",
          "denda": "500",
          "meter_awal": "00080000",
          "meter_akhir": "00090000",
          "biaya_lain": "1500"
        }
      ]
    }
  }
}
```

## Response INTERNET

```json
{
  "data": {
    "ref_id": "4536881875",
    "customer_no": "6391601001",
    "customer_name": "Nama Pelanggan",
    "buyer_sku_code": "internet",
    "admin": 5000,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "sn": "I1234554321N",
    "rc": "00",
    "periode": "MEI 2019,JUN 2019",
    "buyer_last_saldo": 77500,
    "price": 22500,
    "selling_price": 24500,
    "desc": {
      "lembar_tagihan": 2,
      "detail": [
        {
          "periode": "MEI 2019",
          "nilai_tagihan": "8000",
          "admin": "2500"
        },
        {
          "periode": "JUN 2019",
          "nilai_tagihan": "11500",
          "admin": "2500"
        }
      ]
    }
  }
}
```

## Response BPJS Kesehatan

```json
{
  "data": {
    "ref_id": "4536881875",
    "customer_no": "8801234560001",
    "customer_name": "Nama Pelanggan",
    "buyer_sku_code": "bpjs",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "sn": "BP1234554321JS",
    "rc": "00",
    "periode": "01",
    "buyer_last_saldo": 75300,
    "price": 24700,
    "selling_price": 25000,
    "desc": {
      "jumlah_peserta": "2",
      "lembar_tagihan": 1,
      "alamat": "JAKARTA PUSAT",
      "detail": [
        {
          "periode": "01"
        }
      ]
    }
  }
}
```

## Response Multifinance

```json
{
  "data": {
    "ref_id": "ref-1",
    "customer_no": "6391601201",
    "customer_name": "Nama Pelanggan",
    "buyer_sku_code": "multifinance",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "sn": "FP1234554321I",
    "rc": "00",
    "periode": "002",
    "buyer_last_saldo": 75300,
    "price": 24700,
    "selling_price": 25000,
    "desc": {
      "lembar_tagihan": 1,
      "item_name": "HONDA VARIO TECHNO 125 PGM FI NON CBS",
      "no_rangka": "MH1JFB111CK196426",
      "no_pol": "B6213UWX",
      "tenor": "030",
      "detail": [
        {
          "periode": "002",
          "denda": "0",
          "biaya_lain": "0"
        }
      ]
    }
  }
}
```

## Response PBB

```json
{
  "data": {
    "ref_id": "ref-4",
    "customer_no": "329801092375999991",
    "customer_name": "Nama Pelanggan Pertama",
    "buyer_sku_code": "cimahi",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "sn": "P1234554321B",
    "rc": "00",
    "periode": "2019",
    "buyer_last_saldo": 500,
    "price": 99500,
    "selling_price": 100000,
    "desc": {
      "lembar_tagihan": 1,
      "alamat": "KO. GRIYA ASRI CIPAGERAN",
      "tahun_pajak": "2019",
      "kelurahan": "CIPAGERAN",
      "kecamatan": "CIPAGERAN",
      "kode_kab_kota": "0023",
      "kab_kota": "PEMKOT CIMAHI",
      "luas_tanah": "113 M2",
      "luas_gedung": "47 M2"
    }
  }
}
```

## Response Pajak Daerah Lainnya

```json
{
  "data": {
    "ref_id": "ref-4",
    "customer_no": "329801092375999991",
    "customer_name": "Nama Pelanggan Pertama",
    "buyer_sku_code": "cimahi",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "sn": "P1234554321B",
    "rc": "00",
    "periode": "2019",
    "buyer_last_saldo": 500,
    "price": 99500,
    "selling_price": 100000,
    "desc": {
      "lembar_tagihan": 1,
      "alamat": "KO. GRIYA ASRI CIPAGERAN",
      "tahun_pajak": "2019",
      "kelurahan": "CIPAGERAN",
      "kecamatan": "CIPAGERAN",
      "kode_kab_kota": "0023",
      "kab_kota": "PEMKOT CIMAHI",
      "provinsi": "Jawa Barat",
      "luas_tanah": "113 M2",
      "luas_gedung": "47 M2"
    }
  }
}
```

## Response GAS NEGARA / PERTAGAS

```json
{
  "data": {
    "ref_id": "ref-9",
    "customer_no": "0110014601",
    "customer_name": "Nama Pelanggan",
    "buyer_sku_code": "pgas",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "sn": "G1234567890S",
    "rc": "00",
    "periode": "0320",
    "buyer_last_saldo": 500,
    "price": 99500,
    "selling_price": 100000,
    "desc": {
      "lembar_tagihan": 1,
      "alamat": "KO. GRIYA ASRI CIPAGERAN",
      "detail": [
        {
          "periode": "0320",
          "meter_awal": "006538",
          "meter_akhir": "006573",
          "usage": "35"
        }
      ]
    }
  }
}
```

## Response TV

```json
{
  "data": {
    "ref_id": "ref-367",
    "customer_no": "127246500101",
    "customer_name": "BAITUS MONGJENG",
    "buyer_sku_code": "tv",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "sn": "18141775",
    "rc": "00",
    "periode": "MEI 22",
    "buyer_last_saldo": 976793000,
    "price": 100500,
    "selling_price": 101500,
    "desc": {
      "lembar_tagihan": 1,
      "detail": [
        {
          "periode": "MEI 22",
          "nilai_tagihan": "99000",
          "no_ref": "205A"
        }
      ]
    }
  }
}
```

## Response BPJSTK

```json
{
  "data": {
    "ref_id": "ref-93",
    "customer_no": "8102051011270001",
    "customer_name": "Nama Pelanggan",
    "buyer_sku_code": "bpjstk",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "sn": "",
    "rc": "00",
    "buyer_last_saldo": 83500,
    "price": 16500,
    "selling_price": 17500,
    "desc": {
      "lembar_tagihan": 1,
      "kode_iuran": "919013012977",
      "kode_program": "JKK,JKM",
      "jkk": 10000,
      "jkm": 2500,
      "jht": 2500,
      "kantor_cabang": "SAMPIT",
      "tgl_efektif": "2023-05-03",
      "tgl_expired": "2027-05-03"
    }
  }
}
```

## Response BPJSTKPU

```json
{
  "data": {
    "ref_id": "ref-93",
    "customer_no": "400000100001",
    "customer_name": "Nama Pelanggan",
    "buyer_sku_code": "bpjstkpu",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "sn": "",
    "rc": "00",
    "buyer_last_saldo": 98500,
    "price": 101500,
    "selling_price": 102500,
    "desc": {
      "lembar_tagihan": 1,
      "kode_iuran": "415092870000/230501086970",
      "jht": 1617477,
      "jkk": 67104,
      "jkm": 84130,
      "jpk": 1000,
      "jpn": 1000,
      "npp": "15092870",
      "kode_divisi": "000"
    }
  }
}
```

## Response PLN Nontaglis

```json
{
  "data": {
    "ref_id": "ref-109",
    "customer_no": "3225030005921",
    "customer_name": "Nama Pelanggan",
    "buyer_sku_code": "plnnontaglist",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "sn": "P1234554321NH",
    "rc": "00",
    "buyer_last_saldo": 75300,
    "price": 24700,
    "selling_price": 25000,
    "desc": {
      "lembar_tagihan": 1,
      "transaksi": "PENYAMBUNGAN BARU",
      "no_registrasi": "5392112011703",
      "tanggal_registrasi": "20120524"
    }
  }
}
```

## Response E-Money

```json
{
  "data": {
    "ref_id": "20feb24ref-123",
    "customer_no": "082100000001",
    "customer_name": "Nama Pelanggan Pertama",
    "buyer_sku_code": "emoney",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "sn": "E1234554321M",
    "rc": "00",
    "buyer_last_saldo": 75300,
    "price": 24700,
    "selling_price": 25000,
    "desc": {
      "lembar_tagihan": 1
    }
  }
}
```

## Request SAMSAT

Untuk payment SAMSAT, `commands` berubah menjadi `pay-pasca`, dan `ref_id` harus sama dengan saat inquiry.

```json
{
  "commands": "pay-pasca",
  "username": "username",
  "buyer_sku_code": "samsat",
  "customer_no": "9658548523568705,0212502110170100",
  "ref_id": "some1d",
  "sign": "740b00a1b8784e028cc8078edf66d12b"
}
```

## Response SAMSAT

```json
{
  "data": {
    "ref_id": "ref-3936",
    "customer_no": "9658548523568701,0212502110170100",
    "customer_name": "Nama Pelanggan Pertama",
    "buyer_sku_code": "samsat",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "sn": "s1234567890s",
    "rc": "00",
    "periode": "2019",
    "buyer_last_saldo": 100000,
    "price": 99500,
    "selling_price": 100000,
    "desc": {
      "lembar_tagihan": 1,
      "alamat": "GRIYA BULELENG 2 RT 005 RW 014 BULELENG",
      "nomor_identitas": "0212502110170100",
      "nomor_rangka": "MHKV5EA2JFJ001044",
      "nomor_mesin": "1NRF012268",
      "nomor_polisi": "DK 1243AL",
      "milik_kenama": "001",
      "merek_kb": "DAIHATSU",
      "model_kb": "XENIA 1.3 R M/T F653RV-GMDFJ",
      "tahun_buatan": "2018",
      "tgl_akhir_pajak_baru": "20210309",
      "biaya_pokok_bbn": "0",
      "biaya_pokok_swd": "143000",
      "biaya_pokok_pkb": "2131500",
      "biaya_denda_swd": "0",
      "biaya_denda_bbn": "0",
      "biaya_denda_pkb": "0",
      "biaya_admin_stnk": "0",
      "biaya_admin_tnkb": "0",
      "biaya_parkir_pokok": "0",
      "biaya_pajak_progresif": "0"
    }
  }
}
```

## Response HP / Lainnya

```json
{
  "data": {
    "ref_id": "353688162",
    "customer_no": "1013226",
    "customer_name": "Nama Pelanggan Pertama",
    "buyer_sku_code": "hp",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "rc": "00",
    "sn": "H1234554321P",
    "buyer_last_saldo": 89000,
    "price": 11000,
    "selling_price": 12500,
    "desc": {
      "lembar_tagihan": 1
    }
  }
}
```

## Catatan Penting

- Response JSON dibungkus oleh variabel `data`.
- Halaman resmi menutup dengan arahan untuk memakai variabel test pada halaman `test-case.md`.
