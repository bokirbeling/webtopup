# SSH One-Liner Setup Guide

## Quick Setup (Copy-Paste ke Server Terminal)

Login ke server 192.168.1.8 via console/monitor, lalu paste command ini:

```bash
echo "=== SSH Quick Fix ===" && sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup && sudo bash -c 'cat > /etc/ssh/sshd_config << "EOF"
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
EOF
' && sudo sshd -t && sudo systemctl restart sshd && mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo "ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCoiht9y+/230DiEgTOP2n8axe3o0fgqdfVhRoWn+28qimcJomP2cnaN4qCseghQQDH9IOUuj8HxOoZ3qIEVTmgqy/Mj0LpUFxthqzz0laEOdmOc++UVW3/H89Zb3ST9URBJzJICz7ZfRDX5dw5pgyHoQUa6QQKGT4PQ4R3ryDbwxZzjkqtTIKMrtJFhzDPMoUGNGrM7Y8gU+mwxj2ugpHsjoegvylrfdjkJOWLe7y8w3zmewdTtGGbDms2sNQ5CW6zn0I2ubPbiXHWlrBMKuSM4y2NhtPoyvs+VEWkjlm9+FXKK0DCCcINi3OxhHEvNzTMSsoJPqdzcfPnco+p3/RfbIf5Oi/TOC7EUJrBujX6jWfEwQk54eg35tnNpG8/PfYYaF9FaNdNdzGl+uc4Pi02P2vlzS6QtdrGRkYgSQ/16tJxWTj9vFmmFbhHAjTqSkaRFH0CegMMdh2x7R9JaVz0oeNgTEyZfB+tXqN7UqMGxDyKzwgRk2rEGDLV9uGQukU= Administrator@hanz" > ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo "✓ SSH configured successfully!" && echo "✓ SSH key installed!" && echo "" && echo "Test from Windows: ssh root@192.168.1.8"
```

**Apa yang dilakukan command ini:**
1. ✅ Backup config SSH lama
2. ✅ Install config SSH baru (enable password & root login)
3. ✅ Test config valid
4. ✅ Restart SSH service
5. ✅ Buat folder .ssh
6. ✅ Install SSH public key
7. ✅ Set permissions yang benar

## Test dari Windows

Setelah command selesai, test dari Windows PowerShell:

```powershell
ssh root@192.168.1.8
```

Harusnya langsung connect tanpa password (menggunakan SSH key).

## Alternative: Step by Step

Jika one-liner gagal, jalankan step by step:

### 1. Backup config
```bash
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup
```

### 2. Edit config
```bash
sudo nano /etc/ssh/sshd_config
```

Hapus semua, paste ini:
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

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

### 3. Test & restart
```bash
sudo sshd -t
sudo systemctl restart sshd
```

### 4. Install SSH key
```bash
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
```

Paste:
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCoiht9y+/230DiEgTOP2n8axe3o0fgqdfVhRoWn+28qimcJomP2cnaN4qCseghQQDH9IOUuj8HxOoZ3qIEVTmgqy/Mj0LpUFxthqzz0laEOdmOc++UVW3/H89Zb3ST9URBJzJICz7ZfRDX5dw5pgyHoQUa6QQKGT4PQ4R3ryDbwxZzjkqtTIKMrtJFhzDPMoUGNGrM7Y8gU+mwxj2ugpHsjoegvylrfdjkJOWLe7y8w3zmewdTtGGbDms2sNQ5CW6zn0I2ubPbiXHWlrBMKuSM4y2NhtPoyvs+VEWkjlm9+FXKK0DCCcINi3OxhHEvNzTMSsoJPqdzcfPnco+p3/RfbIf5Oi/TOC7EUJrBujX6jWfEwQk54eg35tnNpG8/PfYYaF9FaNdNdzGl+uc4Pi02P2vlzS6QtdrGRkYgSQ/16tJxWTj9vFmmFbhHAjTqSkaRFH0CegMMdh2x7R9JaVz0oeNgTEyZfB+tXqN7UqMGxDyKzwgRk2rEGDLV9uGQukU= Administrator@hanz
```

Save: `Ctrl+O`, `Enter`, `Ctrl+X`

```bash
chmod 600 ~/.ssh/authorized_keys
```

## Troubleshooting

### Command gagal di tengah
```bash
# Restore backup
sudo cp /etc/ssh/sshd_config.backup /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### SSH masih timeout
```bash
# Check firewall
sudo ufw status
sudo ufw allow 22

# Check SSH service
sudo systemctl status sshd
```

### Permission denied
```bash
# Check permissions
ls -la ~/.ssh/authorized_keys
# Should be: -rw------- (600)

# Fix
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

## After SSH Works

Setelah SSH berhasil, lanjut deployment:

1. ✅ SSH connection OK
2. ⏳ Upload backend (backend-deploy.zip)
3. ⏳ Upload frontend (Frontend/dist/)
4. ⏳ Install Node.js & PM2
5. ⏳ Configure Nginx
6. ⏳ Setup DNS/Cloudflare
7. ⏳ Test deployment

## Server Info

- **IP:** 192.168.1.8
- **User:** root
- **Password:** 1@241223 (backup, SSH key preferred)
- **Domain:** demo.hanzserver.online
- **SSH Key:** Already included in one-liner

## Files Ready

- ✅ `ssh-oneliner.sh` - One-liner script
- ✅ `fix-ssh.sh` - Full setup script
- ✅ `sshd_config_fixed` - SSH config file
- ✅ `backend-deploy.zip` - Backend (0.26 MB)
- ✅ `nginx-demo.conf` - Nginx config
- ✅ `server-setup.sh` - Server setup

---

**Last Updated:** 2026-05-17 22:41 WIB
