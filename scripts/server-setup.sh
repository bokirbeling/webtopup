#!/bin/bash
# Server Setup Script for demo.hanzserver.online
# Run this on 192.168.1.8 as root

set -e

echo "=== PPOB Demo Server Setup ==="
echo ""

# 1. Configure SSH
echo "[1/6] Configuring SSH..."
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/#PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
sed -i 's/PermitRootLogin prohibit-password/PermitRootLogin yes/' /etc/ssh/sshd_config
systemctl restart sshd || service ssh restart
echo "✓ SSH configured"

# 2. Setup SSH key
echo "[2/6] Setting up SSH key..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat > ~/.ssh/authorized_keys << 'EOF'
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAABgQCoiht9y+/230DiEgTOP2n8axe3o0fgqdfVhRoWn+28qimcJomP2cnaN4qCseghQQDH9IOUuj8HxOoZ3qIEVTmgqy/Mj0LpUFxthqzz0laEOdmOc++UVW3/H89Zb3ST9URBJzJICz7ZfRDX5dw5pgyHoQUa6QQKGT4PQ4R3ryDbwxZzjkqtTIKMrtJFhzDPMoUGNGrM7Y8gU+mwxj2ugpHsjoegvylrfdjkJOWLe7y8w3zmewdTtGGbDms2sNQ5CW6zn0I2ubPbiXHWlrBMKuSM4y2NhtPoyvs+VEWkjlm9+FXKK0DCCcINi3OxhHEvNzTMSsoJPqdzcfPnco+p3/RfbIf5Oi/TOC7EUJrBujX6jWfEwQk54eg35tnNpG8/PfYYaF9FaNdNdzGl+uc4Pi02P2vlzS6QtdrGRkYgSQ/16tJxWTj9vFmmFbhHAjTqSkaRFH0CegMMdh2x7R9JaVz0oeNgTEyZfB+tXqN7UqMGxDyKzwgRk2rEGDLV9uGQukU= Administrator@hanz
EOF
chmod 600 ~/.ssh/authorized_keys
echo "✓ SSH key installed"

# 3. Install Node.js (if not installed)
echo "[3/6] Checking Node.js..."
if ! command -v node &> /dev/null; then
    echo "Installing Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi
node --version
npm --version
echo "✓ Node.js ready"

# 4. Install PM2 (if not installed)
echo "[4/6] Checking PM2..."
if ! command -v pm2 &> /dev/null; then
    echo "Installing PM2..."
    npm install -g pm2
fi
pm2 --version
echo "✓ PM2 ready"

# 5. Create deployment directories
echo "[5/6] Creating directories..."
mkdir -p /var/www/ppob-demo/backend
mkdir -p /var/www/ppob-demo/frontend
chown -R root:root /var/www/ppob-demo
echo "✓ Directories created"

# 6. Install/check Nginx
echo "[6/6] Checking Nginx..."
if ! command -v nginx &> /dev/null; then
    echo "Installing Nginx..."
    apt-get update
    apt-get install -y nginx
fi
nginx -v
systemctl enable nginx
systemctl start nginx
echo "✓ Nginx ready"

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Upload backend files to /var/www/ppob-demo/backend/"
echo "2. Upload frontend files to /var/www/ppob-demo/frontend/"
echo "3. Configure Nginx for demo.hanzserver.online"
echo "4. Start backend with PM2"
echo ""
echo "Server is ready for deployment!"
