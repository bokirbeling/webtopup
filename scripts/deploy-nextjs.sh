#!/bin/bash

# Next.js Static Deployment Script for adnanpay.com
# This script deploys the Next.js frontend to replace the current public_html

set -e

echo "=== Adnanpay Next.js Deployment ==="
echo "Target: adnanpay.com"
echo "Date: $(date)"
echo ""

# Configuration
REMOTE_USER="adnanpay"
REMOTE_HOST="natanetwork.net"
REMOTE_PATH="/home/adnanpay/public_html"
BACKUP_PATH="/home/adnanpay/backups/public_html_$(date +%Y%m%d_%H%M%S)"
LOCAL_BUILD_DIR="./next-frontend/out"
BACKEND_PATH="/home/adnanpay/ppob-api"

# Step 1: Build Next.js static export
echo "[1/6] Building Next.js static export..."
cd next-frontend
npm run build
cd ..

if [ ! -d "$LOCAL_BUILD_DIR" ]; then
    echo "Error: Build output directory not found at $LOCAL_BUILD_DIR"
    exit 1
fi

echo "Build completed successfully"
echo ""

# Step 2: Create backup of current public_html
echo "[2/6] Creating backup of current public_html..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "mkdir -p /home/adnanpay/backups && cp -r ${REMOTE_PATH} ${BACKUP_PATH}"
echo "Backup created at: ${BACKUP_PATH}"
echo ""

# Step 3: Clear public_html (preserve .htaccess if exists)
echo "[3/6] Clearing public_html..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "cd ${REMOTE_PATH} && find . -mindepth 1 ! -name '.htaccess' -delete"
echo "public_html cleared"
echo ""

# Step 4: Upload Next.js static files
echo "[4/6] Uploading Next.js static files..."
rsync -avz --progress ${LOCAL_BUILD_DIR}/ ${REMOTE_USER}@${REMOTE_HOST}:${REMOTE_PATH}/
echo "Upload completed"
echo ""

# Step 5: Configure .htaccess for Next.js + Express backend
echo "[5/6] Configuring .htaccess..."
ssh ${REMOTE_USER}@${REMOTE_HOST} "cat > ${REMOTE_PATH}/.htaccess << 'EOF'
# Next.js Static + Express Backend Configuration

# Enable RewriteEngine
RewriteEngine On

# Preserve backend API routes
RewriteCond %{REQUEST_URI} ^/ppob-api
RewriteRule ^ppob-api/(.*)$ http://localhost:3001/$1 [P,L]

# Serve static files directly
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]

# Serve static directories directly
RewriteCond %{REQUEST_FILENAME} -d
RewriteRule ^ - [L]

# Route all other requests to Next.js index.html (client-side routing)
RewriteRule ^ /index.html [L]

# Security headers
<IfModule mod_headers.c>
    Header set X-Content-Type-Options \"nosniff\"
    Header set X-Frame-Options \"SAMEORIGIN\"
    Header set X-XSS-Protection \"1; mode=block\"
</IfModule>

# Compression
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/html text/plain text/xml text/css text/javascript application/javascript application/json
</IfModule>

# Cache static assets
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg \"access plus 1 year\"
    ExpiresByType image/jpeg \"access plus 1 year\"
    ExpiresByType image/gif \"access plus 1 year\"
    ExpiresByType image/png \"access plus 1 year\"
    ExpiresByType image/svg+xml \"access plus 1 year\"
    ExpiresByType text/css \"access plus 1 month\"
    ExpiresByType application/javascript \"access plus 1 month\"
    ExpiresByType application/json \"access plus 0 seconds\"
</IfModule>
EOF
"
echo ".htaccess configured"
echo ""

# Step 6: Smoke test
echo "[6/6] Running smoke tests..."
echo "Testing frontend..."
curl -f -s -o /dev/null https://adnanpay.com/ && echo "✓ Frontend root OK" || echo "✗ Frontend root FAILED"

echo "Testing backend health..."
curl -f -s -o /dev/null https://adnanpay.com/ppob-api/health && echo "✓ Backend health OK" || echo "✗ Backend health FAILED"

echo ""
echo "=== Deployment Complete ==="
echo "Frontend: https://adnanpay.com"
echo "Backend: https://adnanpay.com/ppob-api"
echo "Backup: ${BACKUP_PATH}"
echo ""
echo "To rollback, run:"
echo "  ssh ${REMOTE_USER}@${REMOTE_HOST} 'rm -rf ${REMOTE_PATH}/* && cp -r ${BACKUP_PATH}/* ${REMOTE_PATH}/'"
