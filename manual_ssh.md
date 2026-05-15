# Manual SSH Adnanpay Natanetwork

Panduan ini untuk mengembalikan koneksi SSH ke server Adnanpay Natanetwork dari terminal lokal Windows/PowerShell.

## Data koneksi

- Host: `103.164.173.46`
- Port SSH: `31988`
- User: `adnanpay`
- Home: `/home/adnanpay`
- Web root: `/home/adnanpay/public_html`
- Private key OpenSSH: `C:\Users\Administrator\.ssh\id_rsa_natanetwork`
- Private key PuTTY/Plink: `C:\Users\Administrator\.ssh\id_rsa_natanetwork.ppk`

> Jangan kirim passphrase ke chat dan jangan commit passphrase ke Git. File lokal `.env.mcp-adnanpay` hanya boleh berisi variable lokal seperti `ADNANPAY_SSH_KEY_PASSPHRASE`, tanpa dipublikasikan.

## 1. Cek file key tersedia

Buka PowerShell, lalu jalankan:

```powershell
Test-Path -LiteralPath "$env:USERPROFILE\.ssh\id_rsa_natanetwork"
Test-Path -LiteralPath "$env:USERPROFILE\.ssh\id_rsa_natanetwork.ppk"
```

Jika hasilnya `True`, key tersedia.

## 2. Koneksi SSH normal dengan OpenSSH

Jalankan command ini di PowerShell:

```powershell
ssh -p 31988 -i "$env:USERPROFILE\.ssh\id_rsa_natanetwork" adnanpay@103.164.173.46
```

Saat diminta passphrase, ketik passphrase private key secara manual. Input passphrase biasanya tidak terlihat di terminal; itu normal.

Jika muncul pertanyaan host authenticity seperti ini:

```text
Are you sure you want to continue connecting (yes/no/[fingerprint])?
```

Ketik:

```text
yes
```

## 3. Cek server setelah login

Setelah berhasil masuk SSH, jalankan:

```bash
pwd
whoami
ls -la /home/adnanpay/public_html
```

Hasil yang diharapkan:

- `whoami` menghasilkan `adnanpay`
- `/home/adnanpay/public_html` bisa dibaca
- terlihat file web root seperti `index.php`, `index.html`, atau hasil upload frontend nanti

## 4. Command satu baris untuk inspeksi cepat

Jika koneksi sudah normal, bisa jalankan command remote langsung:

```powershell
ssh -p 31988 -i "$env:USERPROFILE\.ssh\id_rsa_natanetwork" adnanpay@103.164.173.46 "pwd && whoami && ls -la /home/adnanpay/public_html | head -20"
```

## 5. Alternatif dengan PuTTY/Plink

Jika OpenSSH bermasalah, gunakan Plink dari PuTTY:

```powershell
plink -ssh -P 31988 -i "$env:USERPROFILE\.ssh\id_rsa_natanetwork.ppk" adnanpay@103.164.173.46
```

Jika ingin menjalankan command remote langsung:

```powershell
plink -ssh -P 31988 -i "$env:USERPROFILE\.ssh\id_rsa_natanetwork.ppk" adnanpay@103.164.173.46 "pwd && whoami && ls -la /home/adnanpay/public_html | head -20"
```

Saat Plink meminta passphrase, ketik manual. Jangan menaruh passphrase langsung di command karena bisa masuk history terminal.

## 6. Troubleshooting

### Error: `Encrypted private OpenSSH key detected, but no passphrase given`

Artinya tool otomatis/MCP mencoba membaca private key terenkripsi tanpa passphrase. Solusi manual:

1. Jalankan SSH langsung di terminal dengan command OpenSSH di atas.
2. Ketik passphrase ketika diminta.
3. Setelah login berhasil, kirim kembali hasil command verifikasi ke sesi kerja:

```bash
pwd
whoami
ls -la /home/adnanpay/public_html
```

### Error: `Permission denied (publickey)`

Kemungkinan penyebab:

- Key yang dipakai salah.
- Passphrase salah.
- Public key belum terdaftar di akun cPanel/SSH server.

Coba pastikan path key benar:

```powershell
Get-Item -LiteralPath "$env:USERPROFILE\.ssh\id_rsa_natanetwork"
```

### Error host key / fingerprint

Jika baru pertama konek, OpenSSH akan meminta konfirmasi host key. Ketik `yes` hanya jika host/port sudah benar:

```text
103.164.173.46:31988
```

Fingerprint yang pernah terlihat dari Plink:

```text
ssh-ed25519 255 SHA256:hCBE7xkuA0kmfH6h56hPr62jisDj7WiX5g1kmVo8bwc
```

### Terminal tidak menampilkan passphrase saat diketik

Normal. Lanjut ketik passphrase lalu tekan Enter.

## 7. Yang perlu dikirim balik setelah sukses

Setelah SSH berhasil, kirim output dari:

```bash
pwd
whoami
ls -la /home/adnanpay/public_html
```

Output ini cukup untuk melanjutkan F3 live smoke/deployment check tanpa membagikan passphrase.

## 8. Batasan akses

Server ini adalah akun cPanel user biasa, bukan root. Jangan gunakan `sudo`, jangan update package sistem, dan jangan menjalankan command destruktif. Fokus hanya pada inspeksi `/home/adnanpay`, `public_html`, log yang bisa diakses user, dan deployment file aplikasi.
