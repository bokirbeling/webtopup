# Response Code

Source URL: `https://developer.digiflazz.com/api/buyer/response-code/`
Fetched at: `2026-05-15T03:29:23.410Z`

| RC | Message | Status | Terbentuk Transaksi | Deskripsi |
| --- | --- | --- | --- | --- |
| `00` | Transaksi Sukses | Sukses | Ya | - |
| `01` | Timeout | Gagal | Ya | - |
| `02` | Transaksi Gagal | Gagal | Ya | - |
| `03` | Transaksi Pending | Pending | Ya | - |
| `40` | Payload Error | Gagal | Tidak | Tipe data atau parameter tidak sesuai |
| `41` | Signature tidak valid | Gagal | Tidak | Perhatikan formula pembuatan signature dan pastikan `apiKey` sudah sesuai dengan mode API, development atau production |
| `42` | Gagal memproses API Buyer | Gagal | Tidak | Username belum sesuai |
| `43` | SKU tidak di temukan atau Non-Aktif | Gagal | Tidak | - |
| `44` | Saldo tidak cukup | Gagal | Tidak | - |
| `45` | IP Anda tidak kami kenali | Gagal | Tidak | Whitelist IP pada menu pengaturan koneksi dan pastikan mode API sesuai |
| `47` | Transaksi sudah terjadi di buyer lain | Gagal | Tidak | - |
| `49` | Ref ID tidak unik | Gagal | Tidak | - |
| `50` | Transaksi Tidak Ditemukan | Gagal | Ya | - |
| `51` | Nomor Tujuan Diblokir | Gagal | Ya | - |
| `52` | Prefix Tidak Sesuai Dengan Operator | Gagal | Ya | - |
| `53` | Produk Seller Sedang Tidak Tersedia | Gagal | Ya | - |
| `54` | Nomor Tujuan Salah | Gagal | Ya | - |
| `55` | Produk Sedang Gangguan | Gagal | Ya | - |
| `56` | Limit saldo seller | Gagal | Tidak | Deprecated |
| `57` | Jumlah Digit Kurang Atau Lebih | Gagal | Ya | - |
| `58` | Sedang Cut Off | Gagal | Ya | - |
| `59` | Tujuan di Luar Wilayah/Cluster | Gagal | Ya | - |
| `60` | Tagihan belum tersedia | Gagal | Ya | - |
| `61` | Belum pernah melakukan deposit | Gagal | Tidak | - |
| `62` | Seller sedang mengalami gangguan | Gagal | Tidak | - |
| `63` | Tidak support transaksi multi | Gagal | Tidak | - |
| `64` | Tarik tiket gagal, coba nominal lain atau hubungi admin. | Gagal | Tidak | - |
| `65` | Limit transaksi multi | Gagal | Tidak | Deprecated |
| `66` | Cut Off (Perbaikan Sistem Seller) | Gagal | Tidak | - |
| `67` | Seller belum ter-verfikasi | Gagal | Tidak | - |
| `68` | Stok habis | Gagal | Tidak | - |
| `69` | Harga seller lebih besar dari ketentuan harga Buyer | Gagal | Tidak | - |
| `70` | Timeout Dari Biller | Gagal | Ya | - |
| `71` | Produk Sedang Tidak Stabil | Gagal | Ya | - |
| `72` | Lakukan Unreg Paket Dahulu | Gagal | Ya | - |
| `73` | Kwh Melebihi Batas | Gagal | Ya | - |
| `74` | Transaksi Refund | Gagal | Ya | - |
| `80` | Akun Anda telah diblokir oleh Seller | Gagal | Tidak | - |
| `81` | Seller ini telah diblokir oleh Anda | Gagal | Tidak | - |
| `82` | Akun Anda belum ter-verfikasi | Gagal | Tidak | - |
| `83` | Anda telah mencapai limitasi pengecekan pricelist, silahkan coba beberapa saat lagi | Gagal | Tidak | API pricelist untuk semua produk hanya bisa dilakukan maksimal 5 menit sekali. Untuk satu kode, maksimal 1 kali per detik |
| `84` | Nominal tidak valid | Gagal | Ya | - |
| `85` | Anda telah mencapai limitasi transaksi, silahkan coba 1 menit lagi | Gagal | Ya | - |
| `86` | Anda telah mencapai limitasi pengecekan nomor PLN, silahkan coba beberapa saat lagi | Gagal | Ya | - |
| `87` | Transaksi E-money wajib kelipatan Rp 1.000 | Gagal | Tidak | - |
| `88` | Akun Anda tidak dapat melakukan aksi ini | Gagal | Tidak | - |
| `99` | DF Router Issue | Pending | Ya | - |
