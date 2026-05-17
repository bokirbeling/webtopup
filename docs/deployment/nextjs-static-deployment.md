# Next.js Static Deployment to adnanpay.com

## Overview

This document describes the deployment process for the Next.js frontend to `adnanpay.com`, replacing the current Vite React frontend while preserving the Express backend under `/ppob-api`.

## Architecture

### Before Deployment
- Frontend: Vite React at `https://adnanpay.com`
- Backend: Express at `https://adnanpay.com/ppob-api`

### After Deployment
- Frontend: Next.js static at `https://adnanpay.com`
- Backend: Express at `https://adnanpay.com/ppob-api` (unchanged)

## Prerequisites

1. **S1-S7 Complete**: All security and finance tasks must be completed and verified
2. **Local Build Success**: `npm run build` in `next-frontend/` must succeed
3. **SSH Access**: Access to `adnanpay@natanetwork.net`
4. **Backup Space**: Sufficient disk space for backup (~100MB estimated)

## Deployment Process

### Step 1: Build Next.js Static Export

```bash
cd next-frontend
npm run build
```

This creates static files in `next-frontend/out/`:
- `index.html` - Main entry point
- `_next/` - Next.js runtime and chunks
- `*.html` - Pre-rendered pages
- Static assets (images, fonts, etc.)

### Step 2: Run Deployment Script

```bash
chmod +x scripts/deploy-nextjs.sh
./scripts/deploy-nextjs.sh
```

The script performs:
1. Build Next.js static export
2. Backup current `public_html` to timestamped directory
3. Clear `public_html` (preserve `.htaccess`)
4. Upload Next.js static files via rsync
5. Configure `.htaccess` for routing
6. Run smoke tests

### Step 3: Verify Deployment

**Frontend Routes:**
- `https://adnanpay.com/` - Homepage
- `https://adnanpay.com/dashboard` - User dashboard
- `https://adnanpay.com/admin` - Admin panel
- `https://adnanpay.com/invoice/[code]` - Invoice lookup

**Backend Routes:**
- `https://adnanpay.com/ppob-api/health` - Health check
- `https://adnanpay.com/ppob-api/catalog` - Product catalog
- `https://adnanpay.com/ppob-api/orders` - Order management

**Static Assets:**
- `https://adnanpay.com/_next/static/` - Next.js chunks
- `https://adnanpay.com/images/` - Product images

### Step 4: Smoke Test Checklist

- [ ] Homepage loads without errors
- [ ] Dashboard accessible (auth required)
- [ ] Admin panel accessible (admin role required)
- [ ] Invoice lookup works
- [ ] Product catalog images load
- [ ] Backend health endpoint returns 200
- [ ] API calls from frontend succeed
- [ ] Client-side routing works (no 404 on refresh)

## Configuration

### next.config.ts

```typescript
const nextConfig: NextConfig = {
  output: 'export',              // Enable static export
  images: { unoptimized: true }, // Disable image optimization
  trailingSlash: true,           // Add trailing slash for static hosting
};
```

### .htaccess

```apache
RewriteEngine On

# Preserve backend API routes
RewriteCond %{REQUEST_URI} ^/ppob-api
RewriteRule ^ppob-api/(.*)$ http://localhost:3001/$1 [P,L]

# Serve static files directly
RewriteCond %{REQUEST_FILENAME} -f
RewriteRule ^ - [L]

# Route all other requests to index.html (client-side routing)
RewriteRule ^ /index.html [L]
```

## Rollback Procedure

If deployment fails or issues are discovered:

### Automatic Rollback

```bash
ssh adnanpay@natanetwork.net
cd /home/adnanpay/backups
ls -lt | head -5  # Find latest backup
rm -rf /home/adnanpay/public_html/*
cp -r /home/adnanpay/backups/public_html_YYYYMMDD_HHMMSS/* /home/adnanpay/public_html/
```

### Manual Rollback

1. SSH to server: `ssh adnanpay@natanetwork.net`
2. List backups: `ls -lt /home/adnanpay/backups/`
3. Identify backup: `public_html_YYYYMMDD_HHMMSS`
4. Clear current: `rm -rf /home/adnanpay/public_html/*`
5. Restore backup: `cp -r /home/adnanpay/backups/public_html_YYYYMMDD_HHMMSS/* /home/adnanpay/public_html/`
6. Verify: `curl https://adnanpay.com/`

### Rollback Verification

- [ ] Frontend loads
- [ ] Backend health check passes
- [ ] No console errors
- [ ] Auth flow works
- [ ] API calls succeed

## Troubleshooting

### Issue: 404 on Page Refresh

**Cause**: `.htaccess` not configured correctly for client-side routing

**Fix**:
```apache
RewriteRule ^ /index.html [L]
```

### Issue: Backend API Not Accessible

**Cause**: Proxy rule missing or incorrect

**Fix**:
```apache
RewriteCond %{REQUEST_URI} ^/ppob-api
RewriteRule ^ppob-api/(.*)$ http://localhost:3001/$1 [P,L]
```

### Issue: Images Not Loading

**Cause**: Image optimization enabled in static export

**Fix**: Ensure `next.config.ts` has:
```typescript
images: { unoptimized: true }
```

### Issue: CSS Not Applied

**Cause**: Base path mismatch or asset path incorrect

**Fix**: Check `next.config.ts` `basePath` and `assetPrefix` settings

## Post-Deployment

### Monitoring

- Monitor server logs: `tail -f /home/adnanpay/logs/error.log`
- Monitor backend logs: `pm2 logs ppob-api`
- Check disk usage: `df -h`

### Cleanup Old Backups

Keep last 5 backups, delete older:
```bash
ssh adnanpay@natanetwork.net
cd /home/adnanpay/backups
ls -t | tail -n +6 | xargs rm -rf
```

### Update DNS (if needed)

If domain changes or CDN added:
1. Update DNS A/CNAME records
2. Wait for propagation (up to 48 hours)
3. Verify with `dig adnanpay.com`

## Security Considerations

### HTTPS

- Ensure SSL certificate is valid
- Force HTTPS in `.htaccess`:
```apache
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

### Headers

Security headers configured in `.htaccess`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`

### Backend Isolation

- Backend runs on `localhost:3001` (not exposed)
- Only accessible via proxy through `/ppob-api`
- No direct external access to backend port

## Performance

### Caching

Static assets cached for 1 year:
- Images: `access plus 1 year`
- CSS/JS: `access plus 1 month`
- API responses: `access plus 0 seconds`

### Compression

Gzip compression enabled for:
- HTML, CSS, JavaScript
- JSON responses
- XML, plain text

### CDN (Future)

Consider adding CDN for:
- Static assets (`_next/static/`)
- Product images
- Global edge caching

## Evidence Files

After deployment, create evidence:

1. `.sisyphus/evidence/nextjs-task-8-deploy-smoke.txt`
   - Smoke test results
   - Response times
   - Error logs (if any)

2. `.sisyphus/evidence/nextjs-task-8-rollback.txt`
   - Rollback procedure verification
   - Backup location
   - Restore test results

## Deployment Checklist

- [ ] S1-S7 completed and verified
- [ ] Local build succeeds
- [ ] SSH access confirmed
- [ ] Backup space available
- [ ] Run deployment script
- [ ] Verify frontend routes
- [ ] Verify backend routes
- [ ] Verify static assets
- [ ] Run smoke tests
- [ ] Test rollback procedure
- [ ] Document backup location
- [ ] Create evidence files
- [ ] Monitor for 24 hours
- [ ] Clean up old backups

## Support

For deployment issues:
- Check server logs: `/home/adnanpay/logs/`
- Check backend logs: `pm2 logs ppob-api`
- Verify `.htaccess` configuration
- Test backend health: `curl http://localhost:3001/health`
- Rollback if critical issues found
