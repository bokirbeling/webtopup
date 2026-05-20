# Demo Separation Summary

**Date**: 2026-05-16T22:56:34.252Z
**Task**: Pisahkan demo ke subdirectory `/demo`

## Actions Completed

### 1. Demo Directory Setup
- Created `/home/adnanpay/public_html/demo/` directory
- Copied all frontend files to demo:
  - `_next/` (Next.js build artifacts)
  - `404/`, `admin/`, `dashboard/`, `invoice/`, `lacak/` (pages)
  - `product-assets/` (images)
  - `index.html`, `404.html`

### 2. .htaccess Configuration
Created `/home/adnanpay/public_html/demo/.htaccess`:
```apache
RewriteEngine On
RewriteBase /demo/

# Proxy /ppob-api to backend
RewriteRule ^ppob-api/(.*)$ http://localhost:3001/$1 [P,L]

# Next.js static files
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /demo/index.html [L]
```

### 3. Backend Configuration
Backend already in demo mode:
- `NODE_ENV=development`
- `SUPABASE_TABLE_PREFIX=demo_`
- `MIDTRANS_SERVER_KEY=SB-Mid-server-...` (Sandbox)

### 4. Database Status
- `demo_orders`: 2 records
- `demo_payments`: 0 records
- `orders` (production): 1 record (isolated)

## URLs

### Demo Environment
- Homepage: https://adnanpay.com/demo/
- Dashboard: https://adnanpay.com/demo/dashboard/
- Admin: https://adnanpay.com/demo/admin/
- Track Order: https://adnanpay.com/demo/lacak/
- Backend API: https://adnanpay.com/demo/ppob-api/

### Production Environment
- Homepage: https://adnanpay.com/
- Dashboard: https://adnanpay.com/dashboard/
- Admin: https://adnanpay.com/admin/
- Track Order: https://adnanpay.com/lacak/
- Backend API: https://adnanpay.com/ppob-api/

## Verification

✓ Demo URL returns 200 OK
✓ Homepage loads with Adnanpay branding
✓ Navbar with Dashboard, Admin, Lacak Order links
✓ Product catalog with search and filter
✓ Product cards display correctly

## Key Features

**Demo Mode**:
- Uses `demo_orders`, `demo_payments`, `demo_fulfillments` tables
- Midtrans Sandbox mode
- Safe for testing without affecting production data

**Production Mode**:
- Uses `orders`, `payments`, `fulfillments` tables
- Midtrans Production mode (when configured)
- Real transactions and data

## Next Steps

1. Test demo checkout flow
2. Verify payment initialization works in demo
3. Test admin panel in demo mode
4. Document demo vs production differences

---

**Status**: ✓ COMPLETE
**Demo URL**: https://adnanpay.com/demo/
**Production URL**: https://adnanpay.com/
