# Server Spec Ringkas: Adnan Natanetwork MCP

## Tujuan

Memberi AI akses aman untuk membaca kondisi server Adnan Natanetwork, mendeteksi framework/stack yang tersedia, lalu memakai hasilnya sebagai dasar pembuatan PRD.

## Server

```yaml
name: adnan-natanetwork
host: 103.164.173.46
port: 31988
user: adnanpay
home: /home/adnanpay
web_root: /home/adnanpay/public_html
access_level: read-only user
```

## Izin MCP

AI boleh:

- SSH sebagai user `adnanpay`.
- Membaca folder `/home/adnanpay` dan `/home/adnanpay/public_html`.
- Mengecek runtime dan tool yang tersedia.
- Membaca file konfigurasi non-secret untuk deteksi framework.
- Membaca log yang tersedia untuk user jika diperlukan.
- Menyusun rekomendasi framework/stack untuk PRD.

AI tidak boleh:

- Menggunakan `sudo` atau akses root.
- Mengubah, menghapus, memindahkan, atau men-deploy file.
- Menjalankan install/update/migration/restart service.
- Membaca isi secret seperti `.env`, private key, token, password, atau credential.

## Command Whitelist

```bash
pwd
whoami
uname -a
ls -la /home/adnanpay
ls -la /home/adnanpay/public_html
find /home/adnanpay/public_html -maxdepth 3 -type f
php -v
php -m
composer --version
node -v
npm -v
pnpm -v
yarn -v
git --version
mysql --version
cat
head
tail
grep
rg
```

## Command Yang Dilarang

```bash
sudo
su
rm
mv
cp
chmod
chown
composer install
composer update
npm install
npm update
pnpm install
yarn install
git pull
git push
php artisan migrate
php artisan down
php artisan up
systemctl
service
reboot
shutdown
```

## File Deteksi Framework

```yaml
laravel:
  - composer.json
  - artisan
  - routes/web.php
  - routes/api.php

codeigniter:
  - app/Config/App.php
  - system/CodeIgniter.php
  - composer.json

wordpress:
  - wp-config.php
  - wp-content
  - wp-includes
  - wp-admin

nextjs:
  - package.json
  - next.config.js
  - next.config.mjs

vite_react_vue:
  - package.json
  - vite.config.js
  - vite.config.ts
  - src

static_site:
  - index.html
  - assets
  - css
  - js
```

## Data Yang Boleh Dipakai Untuk PRD

- Framework terdeteksi.
- Bahasa dan runtime terdeteksi.
- Struktur folder ringkas.
- Entry point aplikasi.
- Tool deployment yang tersedia.
- Batasan hosting cPanel/user-level.
- Risiko teknis dan rekomendasi stack.

## Aturan Secret

- Jangan baca isi `.env` atau file credential.
- Jika file secret ditemukan, cukup laporkan nama/jenis file.
- Masking semua nilai sensitif.
- Jangan tampilkan password, token, API key, private key, atau database credential.

## Output MCP Yang Diharapkan

```json
{
  "server": "adnan-natanetwork",
  "access_level": "read-only user",
  "web_root": "/home/adnanpay/public_html",
  "detected_frameworks": [],
  "available_runtimes": {
    "php": "unknown",
    "composer": "unknown",
    "node": "unknown",
    "npm": "unknown"
  },
  "prd_recommendation": {
    "recommended_framework": "unknown",
    "reason": "Based on detected server stack and project files",
    "constraints": ["No root access", "cPanel user-level only"]
  }
}
```

## Ringkasan Kebijakan

MCP hanya boleh melakukan discovery read-only. Semua aksi destruktif, deployment, install dependency, migration, restart service, dan pembacaan secret harus diblokir. Tujuan utama akses ini adalah membantu AI memahami framework yang cocok untuk server dan menyusun PRD yang realistis.
