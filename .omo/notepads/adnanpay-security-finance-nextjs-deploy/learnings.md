## [2026-05-16] S4 complete
- Provider Response History (S4): Implementasi tabel `provider_events` untuk audit log provider (Midtrans/Digiflazz). 
- Setiap interaction (create payment, webhook, topup, callback) dicatat sebagai event immutable.
- Reseller bisa lihat event sendiri tanpa raw payload. Admin bisa lihat semua + ledger saldo.
