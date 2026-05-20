# Server Deployment Guide - demo.hanzserver.online

## Current Status
- ✅ Backend ready: backend-deploy.zip (0.26 MB)
- ✅ Frontend built: Frontend/dist/
- ✅ Nginx config: nginx-demo.conf
- ✅ Setup script: server-setup.sh
- ⏳ SSH access blocked (needs server-side config)

## Quick Start

### 1. Fix SSH Access (Run on server 192.168.1.8)

Login to server console/monitor and run:

```bash
# Download and run setup script
wget https://raw.githubusercontent.com/your-repo/server-setup.sh
chmod +x server-setup.sh
./server-setup.sh
```

Or manually:

```bash
# Edit SSH config
sudo nano /etc/ssh/sshd_config

# Add/uncomment these lines:
PasswordAuthentication yes
PermitRootLogin yes
PubkeyAuthentication yes

# Save and restart SSH
sudo systemctl restart sshd

# Add SSH key
mkdir -p ~/.ssh
chmod 700 ~/.ssh
nano ~/.ssh/authorized_keys
# Paste this key:
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCoiht9y+/230DiEgTOP2n8axe3o0fgqdfVhRoWn+28qimcJomP2cnaN4qCseghQQDH9IOUuj8HxOoZ3qIEVTmgqy/Mj0LpUFxthqzz0laEOdmOc++UVW3/H89Zb3ST9URBJzJICz7ZfRDX5dw5pgyHoQUa6QQKGT4PQ4R3ryDbwxZzjkqtTIKMrtJFhzDPMoUGNGrM7Y8gU+mwxj2ugpHsjoegvylrfdjkJOWLe7y8w3zmewdTtGGbDms2sNQ5CW6zn0I2ubPbiXHWlrBMKuSM4y2NhtPoyvs+VEWkjlm9+FXKK0DCCcINi3OxhHEvNzTMSsoJPqdzcfPnco+p3/RfbIf5Oi/TOC7EUJrBujX6jWfEwQk54eg35tnNpG8/PfYYaF9FaNdNdzGl+uc4Pi02P2vlzS6QtdrGRkYgSQ/16tJxWTj9vFmmFbhHAjTqSkaRFH0CegMMdh2x7R9JaVz0oeNgTEyZfB+tXqN7UqMGxDyKzwgRk2rEGDLV9uGQukU= Administrator@hanz

chmod 600 ~/.ssh/authorized_keys
```

### 2. Test SSH from Windows

```powershell
ssh root@192.168.1.8
# Should connect without password
```

### 3. Deploy Backend

```powershell
# Upload backend
scp backend-deploy.zip root@192.168.1.8:/tmp/

# On server:
ssh root@192.168.1.8
cd /var/www/ppob-demo/backend
unzip /tmp/backend-deploy.zip
npm install
npm run build

# Start with PM2
pm2 start dist/index.js --name ppob-backend --env production
pm2 save
pm2 startup
```

### 4. Deploy Frontend

First, update API URL in frontend:

```typescript
// Frontend/src/config.ts (create if not exists)
export const API_BASE = 'https://demo.hanzserver.online/api';
```

Then build and upload:

```powershell
cd Frontend
npm run build

# Upload
scp -r dist/* root@192.168.1.8:/var/www/ppob-demo/frontend/
```

### 5. Configure Nginx

```bash
# On server
sudo cp /tmp/nginx-demo.conf /etc/nginx/sites-available/demo.hanzserver.online
sudo ln -s /etc/nginx/sites-available/demo.hanzserver.online /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Setup SSL (Optional)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d demo.hanzserver.online
```

### 7. Configure DNS

Point demo.hanzserver.online to 192.168.1.8:
- A record: demo.hanzserver.online → 192.168.1.8

## Cloudflare Tunnel Alternative

If you prefer Cloudflare Tunnel instead of direct DNS:

```bash
# Install cloudflared
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Login
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create ppob-demo

# Configure tunnel
nano ~/.cloudflared/config.yml
```

Config:
```yaml
tunnel: <tunnel-id>
credentials-file: /root/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: demo.hanzserver.online
    service: http://localhost:80
  - service: http_status:404
```

Start tunnel:
```bash
cloudflared tunnel run ppob-demo

# Or as service
sudo cloudflared service install
sudo systemctl start cloudflared
```

## Verification Checklist

- [ ] SSH connection works
- [ ] Backend running on port 3001
- [ ] Frontend files in /var/www/ppob-demo/frontend/
- [ ] Nginx config loaded
- [ ] DNS pointing to server
- [ ] SSL certificate installed (optional)
- [ ] https://demo.hanzserver.online loads
- [ ] API calls work (check browser console)
- [ ] Products load in catalog
- [ ] Voucher system works
- [ ] Checkout flow works

## Troubleshooting

### SSH still not working
```bash
# Check SSH service
sudo systemctl status sshd

# Check SSH config
sudo sshd -T | grep -i password
sudo sshd -T | grep -i permitroot

# Check firewall
sudo ufw status
sudo ufw allow 22
```

### Backend not starting
```bash
pm2 logs ppob-backend --lines 50

# Check .env file
cat /var/www/ppob-demo/backend/.env

# Check port
netstat -tlnp | grep 3001
```

### Frontend shows blank page
```bash
# Check Nginx error log
sudo tail -f /var/log/nginx/error.log

# Check file permissions
ls -la /var/www/ppob-demo/frontend/

# Check Nginx config
sudo nginx -t
```

### API calls fail (CORS/Network error)
```bash
# Check backend logs
pm2 logs ppob-backend

# Check Nginx proxy
curl http://localhost:3001/api/dashboard/categories

# Check from outside
curl https://demo.hanzserver.online/api/dashboard/categories
```

## Files Ready

1. **server-setup.sh** - Automated server setup
2. **backend-deploy.zip** - Backend application (0.26 MB)
3. **Frontend/dist/** - Frontend static files
4. **nginx-demo.conf** - Nginx configuration

## Next Steps

1. ✅ Run server-setup.sh on server (or manual SSH config)
2. ⏳ Test SSH connection
3. ⏳ Upload backend
4. ⏳ Upload frontend
5. ⏳ Configure Nginx
6. ⏳ Setup DNS/Cloudflare
7. ⏳ Test deployment

---

**Last Updated:** 2026-05-17 22:29 WIB
