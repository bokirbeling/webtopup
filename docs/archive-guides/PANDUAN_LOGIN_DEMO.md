# Panduan Login Demo - Adnanpay PPOB

## ⚠️ MASALAH ROUTING DITEMUKAN

**Issue**: Link dashboard di Header.tsx menggunakan `/dashboard` tanpa prefix `/demo/`, menyebabkan redirect ke URL yang salah.

**URL yang salah**: https://adnanpay.com/dashboard/  
**URL yang benar**: https://adnanpay.com/demo/dashboard

## 🔧 SOLUSI SEMENTARA

Gunakan URL langsung untuk login:

### 1. Login Admin
**URL**: https://adnanpay.com/demo/admin  
**Email**: admin@adnanpay.com  
**Password**: Admin123!@#

### 2. Login Reseller
**URL**: https://adnanpay.com/demo/dashboard  
**Email**: reseller@adnanpay.com  
**Password**: Reseller123!

### 3. Login Affiliate
**URL**: https://adnanpay.com/demo/dashboard  
**Email**: affiliate@adnanpay.com  
**Password**: Affiliate123!

### 4. Guest Checkout (Tanpa Login)
**URL**: https://adnanpay.com/demo/  
Langsung pilih produk dan checkout

---

## 📝 LANGKAH LOGIN DETAIL

### Cara 1: Akses Langsung (RECOMMENDED)
1. **Copy URL yang sesuai** dari daftar di atas
2. **Paste di browser** dan tekan Enter
3. **Isi email dan password** sesuai role
4. **Klik tombol login**

### Cara 2: Dari Homepage (SEMENTARA BROKEN)
⚠️ **JANGAN GUNAKAN** - Link dashboard di homepage redirect ke URL salah

---

## 🐛 DETAIL MASALAH TEKNIS

**File bermasalah**: `Frontend/src/components/Header.tsx`

**Baris bermasalah**:
```tsx
// Line 73-75: Dashboard link
<a href="/dashboard" className="...">
  Dashboard
</a>

// Line 82-84: Masuk button
<a href="/dashboard" className="...">
  Masuk
</a>

// Line 85-87: Daftar button
<a href="/dashboard" className="...">
  Daftar
</a>
```

**Seharusnya**:
```tsx
<a href="/demo/dashboard" className="...">
  Dashboard
</a>
```

**Dampak**:
- Klik "Dashboard" dari homepage → redirect ke https://adnanpay.com/dashboard/ (404)
- Klik "Masuk" → redirect ke https://adnanpay.com/dashboard/ (404)
- Klik "Daftar" → redirect ke https://adnanpay.com/dashboard/ (404)

**Fix yang diperlukan**:
1. Edit `Frontend/src/components/Header.tsx`
2. Ganti semua `/dashboard` menjadi `/demo/dashboard`
3. Ganti `/admin` menjadi `/demo/admin`
4. Rebuild frontend: `npm run build`
5. Deploy ulang ke server

---

## ✅ VERIFIKASI LOGIN BERHASIL

Setelah login berhasil, Anda akan melihat:

### Admin Dashboard
- Nama: "Dashboard Admin"
- Menu: Kelola Produk, Kelola User, Monitor Transaksi, Kirim Email
- Email ditampilkan: admin@adnanpay.com

### Reseller Dashboard
- Nama: "Dashboard Member"
- Email ditampilkan: reseller@adnanpay.com
- Menu: Transaksi Saya, Komisi, Request Payout
- Harga produk: Harga reseller (dengan markup)

### Affiliate Dashboard
- Nama: "Dashboard Member"
- Email ditampilkan: affiliate@adnanpay.com
- Menu: Transaksi Saya, Referral, Komisi
- Kode affiliate: AFF001

---

## 🔐 KEAMANAN

**PENTING**: Akun demo ini hanya untuk testing. Jangan gunakan untuk transaksi real.

- Password sudah di-hash dengan bcrypt
- Database menggunakan prefix `demo_` (isolated dari production)
- API menggunakan development credentials
- Hanya 5 produk tersedia (gopay10, gopay20, gopay25, gopay50, telkomsel5)

---

## 📞 TROUBLESHOOTING

### Problem: "Email atau password salah"
**Solusi**: 
- Pastikan email dan password persis seperti di atas (case-sensitive)
- Copy-paste dari dokumen ini untuk menghindari typo

### Problem: "404 Not Found"
**Solusi**:
- Jangan klik link dari homepage
- Gunakan URL langsung dari dokumen ini

### Problem: "Failed to fetch"
**Solusi**:
- Cek koneksi internet
- Cek backend status: https://adnanpay.com/ppob-api/health
- Seharusnya return: `{"status":"ok"}`

### Problem: Redirect loop
**Solusi**:
- Clear browser cache dan cookies
- Gunakan incognito/private mode
- Atau gunakan browser lain

---

## 📊 STATUS SISTEM

**Backend**: ✅ Running  
**Frontend**: ⚠️ Routing issue (workaround: gunakan URL langsung)  
**Database**: ✅ Connected  
**Email**: ✅ Configured  

**Last Updated**: 2026-05-17 14:30 WIB
