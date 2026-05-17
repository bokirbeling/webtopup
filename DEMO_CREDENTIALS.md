# Demo Account Credentials - LENGKAP

## Demo Environment

**URL**: https://adnanpay.com/demo/

## Semua Akun Demo ✓ SUDAH DIBUAT

### 1. Admin Account ✓
**Email**: admin@adnanpay.com  
**Password**: Admin123!@#  
**Role**: admin  
**User ID**: 52e58c78-e97e-4d3f-8087-7283391bcc1c  
**Login URL**: https://adnanpay.com/demo/admin

**Fitur**:
- Kelola produk (tambah, edit, hapus, upload Excel)
- Atur markup harga untuk pengguna dan reseller
- Kelola user (approve/reject reseller)
- Monitor transaksi semua user
- Kirim email manual/bulk
- Lihat log provider (Midtrans, Digiflazz)

---

### 2. Reseller Account ✓
**Email**: reseller@adnanpay.com  
**Password**: Reseller123!  
**Role**: seller (reseller approved)  
**User ID**: 9649fe40-8e24-49dc-9d10-61dfb7723b8c  
**Status**: Approved reseller  
**Login URL**: https://adnanpay.com/demo/dashboard

**Fitur**:
- Lihat transaksi sendiri
- Lihat komisi dari penjualan
- Request payout
- Harga khusus reseller (dengan markup)

---

### 3. Affiliate Account ✓
**Email**: affiliate@adnanpay.com  
**Password**: Affiliate123!  
**Role**: pengguna (user biasa)  
**User ID**: 05e2eab0-1a31-4f69-ba46-319c2e7b1ecb  
**Affiliate Code**: AFF001  
**Login URL**: https://adnanpay.com/demo/dashboard

**Fitur**:
- Lihat transaksi sendiri
- Track referral via kode affiliate
- Lihat komisi dari referral
- Request payout

---

### 4. Guest Checkout (Tanpa Login)
**Tidak perlu akun**  
**Flow**: Pilih produk → Isi data pelanggan → Bayar  
**URL**: https://adnanpay.com/demo/

**Produk tersedia** (5 produk development):
- GoPay 10.000 (gopay10)
- GoPay 20.000 (gopay20)
- GoPay 25.000 (gopay25)
- GoPay 50.000 (gopay50)
- Telkomsel 5.000 (telkomsel5)

---

## Panduan Test Cepat

### Test Admin
1. Buka https://adnanpay.com/demo/admin
2. Login: admin@adnanpay.com / Admin123!@#
3. Test: Kelola produk, atur harga, approve reseller

### Test Reseller
1. Buka https://adnanpay.com/demo/dashboard
2. Login: reseller@adnanpay.com / Reseller123!
3. Test: Lihat transaksi, komisi, request payout

### Test Affiliate
1. Buka https://adnanpay.com/demo/dashboard
2. Login: affiliate@adnanpay.com / Affiliate123!
3. Test: Lihat transaksi, track referral, komisi

### Test Guest
1. Buka https://adnanpay.com/demo/
2. Pilih "GoPay 10.000"
3. Isi: Customer ID (081234567890), Email (opsional)
4. Bayar via Midtrans sandbox
5. Track order via invoice code

---

## Ringkasan Akun

| Tipe | Email | Password | Role | Status |
|------|-------|----------|------|--------|
| Admin | admin@adnanpay.com | Admin123!@# | admin | ✓ Active |
| Reseller | reseller@adnanpay.com | Reseller123! | seller | ✓ Approved |
| Affiliate | affiliate@adnanpay.com | Affiliate123! | pengguna | ✓ Active |
| Guest | - | - | - | ✓ No login |

**Semua akun sudah dibuat dan siap digunakan!**

---

## Limitasi Development API

**PENTING**: Demo menggunakan Digiflazz Development API yang hanya support 5 produk:
- gopay10, gopay20, gopay25, gopay50, telkomsel5

Produk lain (dari 7,794 produk yang di-scrape) akan muncul di katalog tapi **akan gagal** saat checkout.

---

## Kredensial Production (Pending)

Menunggu:
1. Midtrans Production Credentials
2. Digiflazz Production Credentials  
3. Dokumen Legal (SIUP, NPWP, Perjanjian API)

**Status**: User sedang urus legal
