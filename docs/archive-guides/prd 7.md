PRODUCT REQUIREMENTS DOCUMENT (PRD)
AdnanPay.com - Platform PPOB
Tanggal: 18 Mei 2026
Versi: 1.2
Status: Draft
1. Tujuan Proyek
Membangun platform PPOB yang cepat, stabil, aman, dan efisien di shared hosting 1GB RAM dengan integrasi Digiflazz Buyer.
2. Arsitektur Teknis

Frontend: React + Vite
Backend: Node.js + Express.js
Database: MySQL (cPanel)
API Base URL: /ppob-api

3. Middleware & Security
Middleware yang Wajib Digunakan













































MiddlewareFungsiLibrary Rekomendasiexpress.json()Parse JSON bodyBuilt-in ExpresshelmetSecurity headershelmetcorsCORS PolicycorsInput ValidationValidasi request body & queryZod atau JoirateLimiterAnti spam & brute forceexpress-rate-limitauthMiddlewareJWT AuthenticationjsonwebtokenerrorHandlerGlobal error handlingCustom
Input Validation Rules (Menggunakan Zod - Direkomendasikan)
Contoh implementasi di route:
TypeScript// Middleware contoh
const validate = (schema) => (req, res, next) => {
  try {
    schema.parse(req.body);
    next();
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: "Validasi gagal",
      errors: error.errors
    });
  }
};
4. API Endpoints + Validasi Input
Auth & User

POST /ppob-api/auth/login
Validasi: email / username + password (min 6 karakter)
POST /ppob-api/auth/register
Validasi: nama, username, email, password, no_hp

Produk & Katalog

GET /ppob-api/produk
Validasi Query: page (number), limit (max 50), search (string), kategori, brand
POST /ppob-api/transaksi
Validasi ketat:TypeScript{
  kode_produk: string (required),
  nomor_tujuan: string (required, sesuai tipe produk),
  jumlah: number (optional),
  pin: string (4-6 digit, jika diperlukan)
}

Transaksi

POST /ppob-api/transaksi → Validasi saldo cukup, nomor tujuan, dll.
GET /ppob-api/transaksi → Validasi query page, status, tanggal

Admin / Sync

POST /ppob-api/admin/sync-digiflazz → Hanya admin (role check)

5. Response Format Standar
JSON{
  "success": boolean,
  "message": string,
  "data": object | null,
  "meta": object | null,
  "errors": array | null
}
6. Fitur Utama (Fase 1)
User Side:

Katalog produk dengan search & filter
Checkout dengan validasi ketat
Riwayat transaksi
Profil & Saldo

Admin Side:

Manual sync Digiflazz
Dashboard monitoring

7. Database Design (MySQL)

users
produk
transaksi
sync_logs

8. Non-Functional Requirements

Security: Input validation wajib di semua endpoint yang menerima data
Performance: Halaman produk < 2 detik, Memory idle < 400MB
Sync 12K produk: Batch processing + delay
Rate Limiting: 30 request per menit per IP (bisa disesuaikan)

9. Timeline Estimasi

Phase 1: Setup + API + Validasi → 5 hari
Phase 2: Transaksi & Checkout → 6 hari
Phase 3: Frontend + Testing → 5 hari
Total: ± 18 hari


Sudah ditambahkan middleware validasi input secara detail.

Mau saya tambahkan lagi? Misalnya:

Contoh kode Zod schema lengkap untuk beberapa endpoint
Detail error handling
Role-based middleware (user & admin)

Ketik saja apa yang ingin ditambahkan selanjutnya.buat sedetail mungkin aspek yng perlu dijelaskan✅ Berikut adalah versi PRD yang sudah diperluas secara detail dan komprehensif.

PRODUCT REQUIREMENTS DOCUMENT (PRD)
AdnanPay.com - Platform PPOB
Tanggal: 18 Mei 2026
Versi: 1.3
Status: Draft
Pembuat: Grok + Tim AdnanPay

1. Pendahuluan & Visi
Visi:
Menjadi platform PPOB yang paling cepat, stabil, dan user-friendly di Kalimantan Utara dengan harga kompetitif serta proses transaksi yang reliable.
Misi:

Memberikan akses produk digital berkualitas dengan harga terbaik
Memastikan sistem tetap stabil meski di server shared hosting 1GB RAM
Memberikan pengalaman terbaik bagi reseller dan end-user

2. Tujuan Bisnis

Launch MVP dalam 18–25 hari
Mencapai 100+ transaksi per hari dalam 30 hari pertama
Memory usage server < 700MB saat peak
Tingkat error transaksi < 2%

3. Target Pengguna

Reseller PPOB
Agen pulsa & token
Pengguna end-user (mahasiswa, pekerja, ibu rumah tangga)
Admin / Owner

4. Arsitektur Sistem

Frontend: React + Vite (Single Page Application)
Backend: Node.js + Express.js
Database: MySQL (cPanel)
API Base: /ppob-api
Frontend Path: /home/adnanpay/public_html
Backend Path: /home/adnanpay/ppob-backend
Deployment: Static build + Passenger Node.js
Restart: touch tmp/restart.txt

5. Middleware & Security (Detail)













































MiddlewareDeskripsiLibraryHelmetSecurity headershelmetCORSCross OrigincorsRate Limiter30 req/menit per IPexpress-rate-limitInput ValidationZod SchemazodAuthenticationJWT + Refresh TokenjsonwebtokenError HandlerGlobal errorCustomSanitizerXSS Protectionexpress-mongo-sanitize / validator
6. API Endpoints (Detail Lengkap)
Auth

POST /ppob-api/auth/register
POST /ppob-api/auth/login
GET /ppob-api/auth/profile
PUT /ppob-api/auth/profile
POST /ppob-api/auth/change-pin

Produk

GET /ppob-api/produk (Pagination, Search, Filter)
GET /ppob-api/produk/:kode_produk
GET /ppob-api/kategori
GET /ppob-api/brand

Query Params:

page, limit, search, kategori, brand, sort

Transaksi

POST /ppob-api/transaksi (Checkout)
GET /ppob-api/transaksi
GET /ppob-api/transaksi/:id
GET /ppob-api/transaksi/cek/:id

Body Checkout:
JSON{
  "kode_produk": "string",
  "nomor_tujuan": "string",
  "jumlah": "number",
  "pin": "string"
}
Sync & Admin

POST /ppob-api/admin/sync-digiflazz
GET /ppob-api/admin/sync-status
GET /ppob-api/admin/dashboard
GET /ppob-api/admin/transaksi

Webhook

POST /ppob-api/webhook/digiflazz/callback

7. Database Schema (MySQL)
Tabel produk (utama)

id (BIGINT PK)
kode_produk (VARCHAR 50, UNIQUE)
nama_produk (VARCHAR 255)
kategori (VARCHAR 100)
brand (VARCHAR 100)
type (VARCHAR 50)
harga_modal (INT)
harga_jual (INT)
status (ENUM)
deskripsi (TEXT)
gambar (VARCHAR 500)
updated_at, created_at

Tabel Lainnya:

users
transaksi
transaksi_detail
sync_logs
margin_kategori (untuk atur margin otomatis)

8. Validasi Input (Zod Schema)
Semua endpoint yang menerima input wajib divalidasi menggunakan Zod, termasuk:

Panjang string
Format nomor HP
Range harga
Enum status
Pin 4-6 digit

9. Non-Functional Requirements
Performance:

Halaman produk load < 1.8 detik
API response < 800ms
Memory idle < 400MB

Security:

JWT + HttpOnly Cookie
Rate limiting
Input sanitization
SQL Injection protection

Reliability:

Batch sync Digiflazz (max 800/baris)
Retry mechanism
Logging lengkap

10. Risiko & Mitigasi






























RisikoProbabilitasMitigasiRAM habis saat sync 12kTinggiBatch + delay + limit memoryLatency DigiflazzSedangData di-cache di MySQLServer shared limitTinggiOptimasi query + pagination ketatSerangan brute forceSedangRate limit + JWT
11. Timeline & Milestone

Minggu 1: Setup project, database, sync Digiflazz
Minggu 2: API + Validasi + Admin Panel
Minggu 3: Frontend + Checkout + Testing
Minggu 4: Optimasi + Launch di adnanpay.com

12. Success Criteria

Sistem bisa handle 12.000+ produk
Transaksi sukses > 95%
Memory usage stabil
User bisa checkout dalam < 10 detik


PRD ini sudah sangat detail.

Apakah mau saya tambahkan lagi?
Bisa saya tambahkan bagian berikut:

Contoh response JSON lengkap tiap endpoint
User Flow / User Journey
Wireframe sederhana
Tech Stack detail + alasan
Deployment Procedure

Ketik bagian mana yang ingin ditambahkan atau direvisi lagi. Saya siap terus menyempurnakan.Implementasi batch sync Digiflazz✅ Berikut adalah Implementasi Batch Sync Digiflazz yang Optimal untuk server 1GB RAM kamu.
1. Route Handler (Express)
JavaScript// routes/sync.js atau di app.js
const express = require('express');
const router = express.Router();
const { syncDigiflazzProducts } = require('../controllers/syncController');

// Manual Sync (Admin Only)
router.post('/admin/sync-digiflazz', async (req, res) => {
  try {
    const result = await syncDigiflazzProducts();
    res.json(result);
  } catch (error) {
    console.error('Sync Error:', error);
    res.status(500).json({
      success: false,
      message: 'Gagal melakukan sync',
      error: error.message
    });
  }
});

module.exports = router;

2. Controller - Batch Sync (Paling Penting)
JavaScript// controllers/syncController.js
const axios = require('axios');
const crypto = require('crypto');
const db = require('../config/database'); // MySQL connection

const DIGIFLAZZ_USERNAME = process.env.DIGIFLAZZ_USERNAME;
const DIGIFLAZZ_API_KEY = process.env.DIGIFLAZZ_API_KEY;

async function syncDigiflazzProducts() {
  const startTime = Date.now();
  let totalProcessed = 0;
  let successCount = 0;

  try {
    console.log('🚀 Mulai Sync Digiflazz...');

    // Generate Signature
    const sign = crypto
      .createHash('md5')
      .update(DIGIFLAZZ_USERNAME + DIGIFLAZZ_API_KEY + 'pricelist')
      .digest('hex');

    // Ambil data dari Digiflazz
    const response = await axios.post('https://api.digiflazz.com/v1/price-list', {
      cmd: 'prepaid',
      username: DIGIFLAZZ_USERNAME,
      sign: sign
    });

    const products = response.data.data || [];
    console.log(`📦 Ditemukan ${products.length} produk dari Digiflazz`);

    if (products.length === 0) {
      return { success: false, message: 'Tidak ada data produk' };
    }

    // Batch processing (800 per batch)
    const BATCH_SIZE = 800;

    for (let i = 0; i < products.length; i += BATCH_SIZE) {
      const batch = products.slice(i, i + BATCH_SIZE);
      totalProcessed += batch.length;

      const values = batch.map(item => [
        item.buyer_sku_code,
        item.product_name,
        item.category,
        item.brand,
        item.type,
        item.price,           // harga_modal
        item.price,           // harga_jual (akan diupdate manual nanti)
        item.buyer_product_status ? 'active' : 'inactive',
        item.desc || '',
        new Date()
      ]);

      // Upsert query
      await db.query(`
        INSERT INTO produk 
        (kode_produk, nama_produk, kategori, brand, type, harga_modal, harga_jual, status, deskripsi, updated_at)
        VALUES ?
        ON DUPLICATE KEY UPDATE
          nama_produk = VALUES(nama_produk),
          kategori = VALUES(kategori),
          brand = VALUES(brand),
          type = VALUES(type),
          harga_modal = VALUES(harga_modal),
          status = VALUES(status),
          deskripsi = VALUES(deskripsi),
          updated_at = VALUES(updated_at)
      `, [values]);

      successCount += batch.length;

      // Jeda kecil agar tidak membebani server
      if (i + BATCH_SIZE < products.length) {
        await new Promise(resolve => setTimeout(resolve, 400));
      }

      console.log(`✅ Batch ${Math.floor(i / BATCH_SIZE) + 1} selesai (${successCount}/${products.length})`);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    // Catat log sync
    await db.query('INSERT INTO sync_logs (total_produk, success_count, duration_seconds, status) VALUES (?, ?, ?, ?)', 
      [products.length, successCount, duration, 'success']);

    return {
      success: true,
      message: 'Sync berhasil',
      total: products.length,
      processed: successCount,
      duration: `${duration} detik`
    };

  } catch (error) {
    console.error('❌ Sync gagal:', error.message);
    return {
      success: false,
      message: 'Sync gagal',
      error: error.message
    };
  }
}

module.exports = { syncDigiflazzProducts };

3. Tabel MySQL yang Dibutuhkan
SQLCREATE TABLE produk (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    kode_produk VARCHAR(50) UNIQUE NOT NULL,
    nama_produk VARCHAR(255) NOT NULL,
    kategori VARCHAR(100),
    brand VARCHAR(100),
    type VARCHAR(50),
    harga_modal INT NOT NULL,
    harga_jual INT NOT NULL,
    status ENUM('active', 'inactive') DEFAULT 'active',
    deskripsi TEXT,
    gambar VARCHAR(500),
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_kode (kode_produk),
    INDEX idx_kategori (kategori),
    INDEX idx_brand (brand),
    INDEX idx_status (status),
    INDEX idx_updated (updated_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

4. Cara Setup Cron Job di cPanel (Auto Sync)

Masuk ke cPanel → Cron Jobs
Tambah cron baru dengan command:

Bashcd /home/adnanpay/ppob-backend && /usr/bin/node -e "
  require('./controllers/syncController')
    .syncDigiflazzProducts()
    .then(console.log)
    .catch(console.error);
"
Atau buat file sync.js terpisah dan jalankan setiap 20-30 menit.