# Test Case

Source URL: `https://developer.digiflazz.com/api/buyer/test-case/`
Fetched at: `2026-05-15T03:29:23.410Z`

Berikut adalah test case resmi yang disediakan Digiflazz. Gunakan `buyer_sku_code` dan `customer_no` di bawah untuk mendapatkan status response yang sesuai.

## Prepaid

| buyer_sku_code | customer_no | Status |
| --- | --- | --- |
| `xld10` | `087800001230` | Sukses |
| `xld10` | `087800001232` | Gagal |
| `xld10` | `087800001233` | Pending kemudian callback sukses |
| `xld10` | `087800001234` | Pending kemudian callback gagal |

### Contoh Sukses

#### Request

```json
{
  "username": "username",
  "buyer_sku_code": "xld10",
  "customer_no": "087800001230",
  "ref_id": "test1",
  "testing": true,
  "sign": "740b00a1b8784e028cc8078edf66d12b"
}
```

#### Response

```json
{
  "data": {
    "ref_id": "test1",
    "customer_no": "087800001230",
    "buyer_sku_code": "xld10",
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "rc": "00",
    "sn": "1234567890",
    "buyer_last_saldo": 990000,
    "price": 10000
  }
}
```

### Contoh Gagal

#### Request

```json
{
  "username": "username",
  "buyer_sku_code": "xld10",
  "customer_no": "087800001232",
  "ref_id": "test2",
  "sign": "740b00a1b8784e028cc8078edf66d12b"
}
```

#### Response

```json
{
  "data": {
    "ref_id": "test2",
    "customer_no": "087800001232",
    "buyer_sku_code": "xld10",
    "message": "Transaksi Gagal",
    "status": "Gagal",
    "rc": "02",
    "buyer_last_saldo": 1000000,
    "price": 10000
  }
}
```

### Contoh Pending

#### Request

```json
{
  "username": "username",
  "buyer_sku_code": "xld10",
  "customer_no": "087800001233",
  "ref_id": "test3",
  "testing": true,
  "sign": "740b00a1b8784e028cc8078edf66d12b"
}
```

#### Response

```json
{
  "data": {
    "ref_id": "test3",
    "customer_no": "087800001233",
    "buyer_sku_code": "xld10",
    "message": "Transaksi pending",
    "status": "Pending",
    "rc": "03",
    "buyer_last_saldo": 990000,
    "price": 10000
  }
}
```

## Postpaid

### Cara Request

Sesuaikan `buyer_sku_code` dan `customer_no` berdasarkan test case pada masing-masing kode produk.

#### Request Inquiry

```json
{
  "commands": "inq-pasca",
  "username": "username",
  "buyer_sku_code": "pln",
  "customer_no": "530000000001",
  "ref_id": "some1d",
  "testing": true,
  "sign": "740b00a1b8784e028cc8078edf66d12b"
}
```

#### Request Payment

```json
{
  "commands": "pay-pasca",
  "username": "username",
  "buyer_sku_code": "pln",
  "customer_no": "530000000001",
  "ref_id": "some1d",
  "sign": "740b00a1b8784e028cc8078edf66d12b"
}
```

### Contoh Response Selain Sukses

#### Inquiry atau Payment Gagal

```json
{
  "data": {
    "ref_id": "some1d",
    "customer_no": "530000000003",
    "buyer_sku_code": "pln",
    "message": "Transaksi Gagal",
    "status": "Gagal",
    "rc": "02"
  }
}
```

#### Payment Pending

```json
{
  "data": {
    "ref_id": "some1d",
    "customer_no": "530000000005",
    "buyer_sku_code": "pln",
    "message": "Transaksi Pending",
    "status": "Pending",
    "rc": "03"
  }
}
```

## PLN

| buyer_sku_code | customer_no | Status |
| --- | --- | --- |
| `pln` | `530000000001` | Sukses, 1 tagihan |
| `pln` | `530000000002` | Sukses, 2 tagihan |
| `pln` | `530000000003` | Inquiry gagal |
| `pln` | `530000000006` | Pembayaran gagal |
| `pln` | `630000000001` | Pending, lalu callback sukses, 1 tagihan |
| `pln` | `630000000002` | Pending, lalu callback sukses, 2 tagihan |
| `pln` | `630000000006` | Pending, lalu callback gagal |

### Response Inquiry Sukses, 1 Tagihan

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
    "buyer_last_saldo": 100000,
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
          "denda": "500"
        }
      ]
    }
  }
}
```

### Response Payment Sukses, 1 Tagihan

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

### Response Payment Sukses, 2 Tagihan

```json
{
  "data": {
    "ref_id": "some1d",
    "customer_no": "530000000002",
    "customer_name": "Nama Pelanggan Kedua",
    "buyer_sku_code": "pln",
    "admin": 5000,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "rc": "00",
    "sn": "S1234554321N",
    "buyer_last_saldo": 77000,
    "price": 23000,
    "selling_price": 25000,
    "desc": {
      "tarif": "R1",
      "daya": 1300,
      "lembar_tagihan": 2,
      "detail": [
        {
          "periode": "201901",
          "nilai_tagihan": "8000",
          "admin": "2500",
          "denda": "500",
          "meter_awal": "00080000",
          "meter_akhir": "00090000"
        },
        {
          "periode": "201902",
          "nilai_tagihan": "11500",
          "admin": "2500",
          "denda": "0",
          "meter_awal": "00090000",
          "meter_akhir": "00095000"
        }
      ]
    }
  }
}
```

## PDAM

| buyer_sku_code | customer_no | Status |
| --- | --- | --- |
| `pdam` | `1013226` | Sukses |
| `pdam` | `1013227` | Inquiry gagal |
| `pdam` | `1013230` | Pembayaran gagal |
| `pdam` | `2013226` | Pending, lalu callback sukses |
| `pdam` | `2013230` | Pending, lalu callback gagal |

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

## INTERNET

| buyer_sku_code | customer_no | Status |
| --- | --- | --- |
| `internet` | `6391601001` | Sukses |
| `internet` | `6391601002` | Inquiry gagal |
| `internet` | `6391601005` | Pembayaran gagal |
| `internet` | `7391601001` | Pending, lalu callback sukses |
| `internet` | `7391601005` | Pending, lalu callback gagal |

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
    "buyer_last_saldo": 100000,
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

## BPJS KESEHATAN

| buyer_sku_code | customer_no | Status |
| --- | --- | --- |
| `bpjs` | `8801234560001` | Sukses |
| `bpjs` | `8801234560002` | Inquiry gagal |
| `bpjs` | `8801234560005` | Pembayaran gagal |
| `bpjs` | `9801234560001` | Pending, lalu callback sukses |
| `bpjs` | `9801234560005` | Pending, lalu callback gagal |

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
    "buyer_last_saldo": 100000,
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

## Multifinance

| buyer_sku_code | customer_no | Status |
| --- | --- | --- |
| `multifinance` | `6391601201` | Sukses |
| `multifinance` | `6391601202` | Inquiry gagal |
| `multifinance` | `6391601205` | Pembayaran gagal |
| `multifinance` | `7391601201` | Pending, lalu callback sukses |
| `multifinance` | `7391601205` | Pending, lalu callback gagal |

```json
{
  "data": {
    "ref_id": "ref-1",
    "customer_no": "6391601201",
    "customer_name": "Nama Pelanggan Pertama",
    "buyer_sku_code": "multifinance",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "sn": "FP1234554321I",
    "rc": "00",
    "buyer_last_saldo": 100000,
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

## PBB

| buyer_sku_code | customer_no | Status |
| --- | --- | --- |
| `cimahi` | `329801092375999991` | Sukses |
| `cimahi` | `329801092375999992` | Inquiry gagal |
| `cimahi` | `329801092375999995` | Pembayaran gagal |
| `cimahi` | `429801092375999991` | Pending, lalu callback sukses |
| `cimahi` | `429801092375999995` | Pending, lalu callback gagal |

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
    "buyer_last_saldo": 100000,
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

## Pajak Daerah Lainnya

| buyer_sku_code | customer_no | Status |
| --- | --- | --- |
| `pdl` | `3298010921` | Sukses |
| `pdl` | `3298010922` | Inquiry gagal |
| `pdl` | `3298010923` | Pembayaran gagal |
| `pdl` | `4298010921` | Pending, lalu callback sukses |
| `pdl` | `4298010923` | Pending, lalu callback gagal |

```json
{
  "data": {
    "ref_id": "ref-4",
    "customer_no": "3298010921",
    "customer_name": "Nama Pelanggan Pertama",
    "buyer_sku_code": "pdl",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "sn": "P1234554321D",
    "rc": "00",
    "buyer_last_saldo": 100000,
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

## GAS NEGARA

| buyer_sku_code | customer_no | Status |
| --- | --- | --- |
| `pgas` | `0110014601` | Sukses, 1 tagihan |
| `pgas` | `0110014602` | Sukses, 2 tagihan |
| `pgas` | `0110014603` | Inquiry gagal |
| `pgas` | `0110014605` | Pembayaran gagal |
| `pgas` | `1110014601` | Pending, lalu callback sukses, 1 tagihan |
| `pgas` | `1110014602` | Pending, lalu callback sukses, 2 tagihan |
| `pgas` | `1110014605` | Pending, lalu callback gagal |

### Response Sukses, 1 Tagihan

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

### Response Sukses, 2 Tagihan

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
    "buyer_last_saldo": 500,
    "price": 99500,
    "selling_price": 100000,
    "desc": {
      "lembar_tagihan": 1,
      "alamat": "KO. GRIYA ASRI CIPAGERAN",
      "detail": [
        {
          "periode": "0320",
          "meter_awal": "006400",
          "meter_akhir": "006500",
          "usage": "100"
        },
        {
          "periode": "0320",
          "meter_awal": "006500",
          "meter_akhir": "006700",
          "usage": "200"
        }
      ]
    }
  }
}
```

## TV

| buyer_sku_code | customer_no | Status |
| --- | --- | --- |
| `tv` | `127246500101` | Sukses |
| `tv` | `127246500102` | Inquiry gagal |
| `tv` | `127246500105` | Pembayaran gagal |
| `tv` | `227246500101` | Pending, lalu callback sukses |
| `tv` | `227246500105` | Pending, lalu callback gagal |

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

## BPJSTK

| buyer_sku_code | customer_no | Status |
| --- | --- | --- |
| `bpjstk` | `8102051011270001` | Sukses |
| `bpjstk` | `8102051011270002` | Inquiry gagal |
| `bpjstk` | `8102051011270003` | Pembayaran gagal |
| `bpjstk` | `9102051011270001` | Pending, lalu callback sukses |
| `bpjstk` | `9102051011270003` | Pending, lalu callback pembayaran gagal |

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

## BPJSTKPU

| buyer_sku_code | customer_no | Status |
| --- | --- | --- |
| `bpjstkpu` | `400000100001` | Sukses |
| `bpjstkpu` | `400000100002` | Inquiry gagal |
| `bpjstkpu` | `400000100003` | Pembayaran gagal |
| `bpjstkpu` | `500000100001` | Pending, lalu callback sukses |
| `bpjstkpu` | `500000100003` | Pending, lalu callback gagal |

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

## PLN Nontaglis

| buyer_sku_code | customer_no | Status |
| --- | --- | --- |
| `plnnontaglist` | `3225030005921` | Sukses |
| `plnnontaglist` | `3225030005922` | Inquiry gagal |
| `plnnontaglist` | `3225030005923` | Pembayaran gagal |
| `plnnontaglist` | `4225030005921` | Pending, lalu callback sukses |
| `plnnontaglist` | `4225030005923` | Pending, lalu callback gagal |

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

## E-Money

| buyer_sku_code | customer_no | Status |
| --- | --- | --- |
| `emoney` | `082100000001` | Sukses |
| `emoney` | `082100000002` | Inquiry gagal |
| `emoney` | `082100000003` | Pembayaran gagal |
| `emoney` | `082110000001` | Pending, lalu callback sukses |
| `emoney` | `082110000003` | Pending, lalu callback gagal |

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

## SAMSAT

| buyer_sku_code | customer_no | Status |
| --- | --- | --- |
| `samsat` | `9658548523568701,0212502110170100` | Sukses |
| `samsat` | `9658548523568702,0212502110170100` | Inquiry gagal |
| `samsat` | `9658548523568705,0212502110170100` | Pembayaran gagal |
| `samsat` | `0658548523568701,0212502110170100` | Pending, lalu callback sukses |
| `samsat` | `0658548523568705,0212502110170100` | Pending, lalu callback gagal |

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

## HP dan Tagihan Lainnya

| buyer_sku_code | customer_no | Status |
| --- | --- | --- |
| `hp` | `081234554320` | Sukses |
| `hp` | `081234554321` | Inquiry gagal |
| `hp` | `081234554324` | Pembayaran gagal |
| `hp` | `081244554320` | Pending, lalu callback sukses |
| `hp` | `081244554324` | Pending, lalu callback gagal |

```json
{
  "data": {
    "ref_id": "some1d",
    "customer_no": "081234554320",
    "customer_name": "Nama Pelanggan Pertama",
    "buyer_sku_code": "hp",
    "admin": 2500,
    "message": "Transaksi Sukses",
    "status": "Sukses",
    "sn": "H1234554321P",
    "rc": "00",
    "buyer_last_saldo": 89000,
    "price": 11000,
    "selling_price": 12500,
    "desc": {
      "lembar_tagihan": 1
    }
  }
}
```
