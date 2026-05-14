# Adnanpay Docker / Podman Support Check

Jalankan command ini di SSH manual Adnanpay untuk mengecek apakah server bisa memakai Docker, Podman, atau runtime Node/cPanel.

## 1. Test koneksi dan info server

```bash
whoami
id
hostname
pwd
uname -a
cat /etc/os-release 2>/dev/null || true
```

## 2. Cek Docker

```bash
echo "=== DOCKER CHECK ==="
command -v docker || echo "docker: not installed"
docker --version 2>&1 || true
docker ps 2>&1 || true
ls -l /var/run/docker.sock 2>/dev/null || echo "docker socket not found"
groups
```

## 3. Cek Podman

```bash
echo "=== PODMAN CHECK ==="
command -v podman || echo "podman: not installed"
podman --version 2>&1 || true
podman info 2>&1 || true
podman ps 2>&1 || true
ls -l /run/user/$(id -u)/podman/podman.sock 2>/dev/null || echo "rootless podman socket not found"
ls -l /run/podman/podman.sock 2>/dev/null || echo "system podman socket not found"
```

## 4. Cek Node.js / npm / Passenger cPanel

```bash
echo "=== NODE / CPANEL RUNTIME CHECK ==="
command -v node || echo "node: not found"
node --version 2>&1 || true
command -v npm || echo "npm: not found"
npm --version 2>&1 || true
command -v passenger-config || echo "passenger-config: not found"
passenger-config --version 2>&1 || true
command -v cloudlinux-selector || echo "cloudlinux-selector: not found"
cloudlinux-selector --summary 2>&1 || true
```

## 5. Cek web root

```bash
echo "=== WEB ROOT CHECK ==="
ls -la /home/adnanpay
ls -la /home/adnanpay/public_html
```

## 6. One-shot command lengkap

Kalau mau sekali paste:

```bash
echo "=== USER/OS ==="; whoami; id; hostname; pwd; uname -a; cat /etc/os-release 2>/dev/null || true; \
echo "=== DOCKER CHECK ==="; command -v docker || echo "docker: not installed"; docker --version 2>&1 || true; docker ps 2>&1 || true; ls -l /var/run/docker.sock 2>/dev/null || echo "docker socket not found"; groups; \
echo "=== PODMAN CHECK ==="; command -v podman || echo "podman: not installed"; podman --version 2>&1 || true; podman info 2>&1 || true; podman ps 2>&1 || true; ls -l /run/user/$(id -u)/podman/podman.sock 2>/dev/null || echo "rootless podman socket not found"; ls -l /run/podman/podman.sock 2>/dev/null || echo "system podman socket not found"; \
echo "=== NODE / CPANEL RUNTIME CHECK ==="; command -v node || echo "node: not found"; node --version 2>&1 || true; command -v npm || echo "npm: not found"; npm --version 2>&1 || true; command -v passenger-config || echo "passenger-config: not found"; passenger-config --version 2>&1 || true; command -v cloudlinux-selector || echo "cloudlinux-selector: not found"; cloudlinux-selector --summary 2>&1 || true; \
echo "=== WEB ROOT CHECK ==="; ls -la /home/adnanpay; ls -la /home/adnanpay/public_html
```

## Cara baca hasil

Jika muncul:

```text
docker: not installed
docker socket not found
```

Docker tidak tersedia.

Jika muncul:

```text
permission denied while trying to connect to Docker daemon
```

Docker ada, tapi user `adnanpay` tidak punya izin.

Jika muncul:

```text
Cannot connect to the Docker daemon
```

Docker binary ada, tapi daemon tidak jalan atau tidak bisa diakses.

Jika muncul:

```text
podman: not installed
```

Podman tidak tersedia.

Jika command berikut berhasil tanpa error permission:

```text
podman info
podman ps
```

Podman kemungkinan bisa dipakai.

## Rekomendasi deploy jika Docker/Podman tidak tersedia

Untuk cPanel/CloudLinux tanpa root, jalur paling realistis:

1. Build frontend static.
2. Upload hasil frontend ke `/home/adnanpay/public_html`.
3. Jalankan backend Node melalui fitur Node.js App / Passenger / CloudLinux Selector jika tersedia.
