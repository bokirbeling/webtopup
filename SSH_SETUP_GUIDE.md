# SSH Setup Guide - Server 192.168.1.8

## Problem
SSH connection dari Windows ke server 192.168.1.8 timeout karena SSH server belum dikonfigurasi untuk menerima password authentication dan root login.

## Solution

### Step 1: Login ke Server
Login ke server 192.168.1.8 menggunakan console/monitor fisik atau KVM.

### Step 2: Backup Config Lama
```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
```

### Step 3: Edit SSH Config
```bash
sudo nano /etc/ssh/sshd_config
```

Hapus semua isi file, lalu paste konfigurasi ini:

```
Port 22
AddressFamily any
ListenAddress 0.0.0.0
ListenAddress ::

HostKey /etc/ssh/ssh_host_rsa_key
HostKey /etc/ssh/ssh_host_ecdsa_key
HostKey /etc/ssh/ssh_host_ed25519_key

PermitRootLogin yes
PubkeyAuthentication yes
PasswordAuthentication yes
PermitEmptyPasswords no
ChallengeResponseAuthentication no

UsePAM yes
X11Forwarding no
PrintMotd no
AcceptEnv LANG LC_*

Subsystem sftp /usr/lib/openssh/sftp-server

RekeyLimit default none
```

Save file: `Ctrl+O`, `Enter`, `Ctrl+X`

### Step 4: Test Config
```bash
sudo sshd -t
```

Jika tidak ada error, lanjut ke step berikutnya.

### Step 5: Restart SSH Service
```bash
sudo systemctl restart sshd
```

Atau jika systemctl tidak tersedia:
```bash
sudo service ssh restart
```

### Step 6: Setup SSH Key (Opsional tapi Recommended)
```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
```

Paste public key ini:
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCoiht9y+/230DiEgTOP2n8axe3o0fgqdfVhRoWn+28qimcJomP2cnaN4qCseghQQDH9IOUuj8HxOoZ3qIEVTmgqy/Mj0LpUFxthqzz0laEOdmOc++UVW3/H89Zb3ST9URBJzJICz7ZfRDX5dw5pgyHoQUa6QQKGT4PQ4R3ryDbwxZzjkqtTIKMrtJFhzDPMoUGNGrM7Y8gU+mwxj2ugpHsjoegvylrfdjkJOWLe7y8w3zmewdTtGGbDms2sNQ5CW6zn0I2ubPbiXHWlrBMKuSM4y2NhtPoyvs+VEWkjlm9+FXKK0DCCcINi3OxhHEvNzTMSsoJPqdzcfPnco+p3/RfbIf5Oi/TOC7EUJrBujX6jWfEwQk54eg35tnNpG8/PfYYaF9FaNdNdzGl+uc4Pi02P2vlzS6QtdrGRkYgSQ/16tJxWTj9vFmmFbhHAjTqSkaRFH0CegMMdh2x7R9JaVz0oeNgTEyZfB+tXqN7UqMGxDyKzwgRk2rEGDLV9uGQukU= Administrator@hanz
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

Set permissions:
```bash
chmod 600 ~/.ssh/authorized_keys
```

### Step 7: Test dari Windows
```powershell
# Test dengan password
ssh root@192.168.1.8
# Masukkan password: 1@241223

# Atau jika SSH key sudah disetup, akan langsung connect tanpa password
```

## Automated Script (Alternative)

Jika ingin menggunakan script otomatis, jalankan ini di server:

```bash
# Download script
wget -O fix-ssh.sh https://raw.githubusercontent.com/your-repo/fix-ssh.sh

# Atau copy manual dari file fix-ssh.sh yang sudah dibuat

# Jalankan
chmod +x fix-ssh.sh
./fix-ssh.sh
```

## Troubleshooting

### SSH masih timeout
```bash
# Check SSH service status
sudo systemctl status sshd

# Check SSH port
sudo netstat -tlnp | grep 22

# Check firewall
sudo ufw status
sudo ufw allow 22
```

### Permission denied setelah config
```bash
# Check SSH config syntax
sudo sshd -t

# Check file permissions
ls -la /etc/ssh/sshd_config

# Restore backup jika ada masalah
sudo cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### SSH key tidak work
```bash
# Check authorized_keys permissions
ls -la ~/.ssh/authorized_keys
# Should be: -rw------- (600)

# Check .ssh directory permissions
ls -la ~/.ssh
# Should be: drwx------ (700)

# Fix permissions
chmod 700 ~/.ssh
chmod 600 ~/.ssh/authorized_keys
```

## Security Notes

⚠️ **Important**: Konfigurasi ini mengaktifkan `PermitRootLogin yes` dan `PasswordAuthentication yes` untuk kemudahan deployment. Setelah deployment selesai, disarankan untuk:

1. Disable password authentication (gunakan SSH key saja)
2. Disable root login (gunakan sudo user)
3. Change SSH port dari 22 ke port lain
4. Setup fail2ban untuk proteksi brute force

## Next Steps

Setelah SSH berhasil:
1. ✅ Test SSH connection dari Windows
2. ⏳ Deploy backend ke server
3. ⏳ Deploy frontend ke server
4. ⏳ Configure Nginx
5. ⏳ Setup DNS/Cloudflare Tunnel
6. ⏳ Test full deployment

---

**Server Info:**
- IP: 192.168.1.8
- User: root
- Password: 1@241223
- Domain: demo.hanzserver.online

**Files Ready:**
- `fix-ssh.sh` - Automated SSH setup script
- `sshd_config_fixed` - SSH config file
- `server-setup.sh` - Full server setup script
- `backend-deploy.zip` - Backend application
- `nginx-demo.conf` - Nginx configuration

**Last Updated:** 2026-05-17 22:31 WIB
