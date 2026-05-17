# Adnanpay PPOB Platform - Deployment Guide

## Prerequisites

### Required Accounts
- ✅ Supabase account with project created
- ✅ Midtrans account (Sandbox for dev, Production for prod)
- ✅ Digiflazz account (Development API for dev, Production for prod)
- ✅ cPanel hosting account (Natanetwork)
- ✅ Domain with SSL certificate (adnanpay.com)
- ✅ Email account with SMTP access

### Required Software
- Node.js 20+
- npm or yarn
- Git
- SSH client
- PostgreSQL client (optional, for local testing)

## Environment Setup

### 1. Database Setup (Supabase)

1. Create Supabase project at https://supabase.com
2. Note your project credentials:
   - Project URL: `https://[project-ref].supabase.co`
   - Service Role Key: From Settings → API
3. Apply migrations:
   ```bash
   # Option 1: Via Supabase Dashboard
   # Go to SQL Editor → New Query → Paste migration content → Run
   
   # Option 2: Via Supabase CLI
   supabase db push
   ```
4. Verify tables created:
   - users, products, orders, payments, fulfillments
   - midtrans_events, digiflazz_events
   - commissions, payout_requests, tax_allocations

### 2. Backend Environment Variables

Create `backend/.env.production`:

```bash
# Server
NODE_ENV=production
PORT=3001

# Database
SUPABASE_URL=https://[your-project].supabase.co
SUPABASE_SERVICE_ROLE_KEY=[your-service-role-key]
SUPABASE_TABLE_PREFIX=        # Empty for production, "demo_" for demo

# Payment Gateway
MIDTRANS_SERVER_KEY=[your-production-server-key]
MIDTRANS_API_BASE_URL=https://app.midtrans.com

# Product Provider
DIGIFLAZZ_USERNAME=[your-production-username]
DIGIFLAZZ_API_KEY=[your-production-api-key]
DIGIFLAZZ_API_BASE_URL=https://api.digiflazz.com/v1

# Authentication
JWT_SECRET=[generate-random-32-char-string]

# Email
SMTP_HOST=mail.adnanpay.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=mail@adnanpay.com
SMTP_PASS=[your-smtp-password]
SMTP_FROM_NAME=Adnanpay
SMTP_FROM_EMAIL=mail@adnanpay.com

# Encryption
PAYOUT_ENCRYPTION_KEY=[generate-base64-256-bit-key]
```

**Generate JWT Secret**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Generate Encryption Key**:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 3. Frontend Environment Variables

Create `Frontend/.env.production`:

```bash
VITE_API_BASE_URL=/ppob-api
```

## Backend Deployment

### Build Backend

```bash
cd backend
npm install
npm run build
```

Verify build output in `backend/dist/`

### Package Backend

```bash
# Create deployment package
tar -czf backend-deploy.tar.gz \
  dist/ \
  node_modules/ \
  package.json \
  package-lock.json \
  .env.production
```

### Upload to Server

```bash
# Via SCP
scp -P 31988 backend-deploy.tar.gz adnanpay@103.164.173.46:/home/adnanpay/

# Via SSH
ssh -p 31988 adnanpay@103.164.173.46
cd /home/adnanpay
tar -xzf backend-deploy.tar.gz -C ppob-backend/
```

### Configure Node.js Environment

```bash
# Via cPanel: Setup Node.js App
# - Node.js version: 20.x
# - Application root: /home/adnanpay/ppob-backend
# - Application URL: adnanpay.com/ppob-api
# - Application startup file: dist/server.js
```

### Restart Backend

```bash
ssh -p 31988 adnanpay@103.164.173.46
touch /home/adnanpay/ppob-backend/tmp/restart.txt
```

### Verify Backend

```bash
curl https://adnanpay.com/ppob-api/health
# Expected: {"status":"ok"}
```

## Frontend Deployment

### Build Frontend

```bash
cd Frontend
npm install
NODE_ENV=production npm run build
```

Verify build output in `Frontend/dist/`

### Package Frontend

```bash
cd Frontend/dist
zip -r ../../frontend-deploy.zip .
```

### Upload to Server

```bash
# Via SCP
scp -P 31988 frontend-deploy.zip adnanpay@103.164.173.46:/home/adnanpay/

# Via SSH
ssh -p 31988 adnanpay@103.164.173.46
cd /home/adnanpay/public_html/demo
unzip -o /home/adnanpay/frontend-deploy.zip
```

### Configure .htaccess

Create `/home/adnanpay/public_html/demo/.htaccess`:

```apache
RewriteEngine On
RewriteBase /demo/

# Proxy API requests to backend
RewriteRule ^ppob-api/(.*)$ http://localhost:3001/$1 [P,L]

# Client-side routing for SPA
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ /demo/index.html [L]
```

### Verify Frontend

Open browser: https://adnanpay.com/demo/
- Check console for errors
- Verify API calls go to `/ppob-api`
- Test product catalog loading

## Database Migrations

### Apply Migrations

Migrations are in `supabase/migrations/`:

1. `20260422010406_transactional_schema_rls_idempotency_task4_v2.sql`
2. `20260514021500_demo_tables_for_development_mode.sql`
3. `20260514030000_accounts_catalog_pricing_order_snapshots.sql`
4. `20260515090000_postpaid_inquiries_and_pln_inquiries.sql`
5. `20260515110000_email_verification_fields.sql`
6. `20260516151300_provider_events_and_balance_ledgers.sql`
7. `20260516151500_referrals_discounts_commissions.sql`
8. `20260516172400_payout_withdrawal_system.sql`
9. `20260516172500_tax_allocation_system.sql`

**Apply via Supabase Dashboard**:
1. Go to SQL Editor
2. Copy migration content
3. Run query
4. Verify tables created

**Apply via Supabase CLI**:
```bash
supabase db push
```

### Verify Migrations

```sql
-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check RLS enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';
```

## Post-Deployment Verification

### Backend Health Check

```bash
curl https://adnanpay.com/ppob-api/health
# Expected: {"status":"ok"}
```

### API Endpoints

```bash
# Catalog
curl https://adnanpay.com/ppob-api/api/catalog/products

# Auth (should return 401)
curl https://adnanpay.com/ppob-api/api/dashboard
```

### Frontend

1. Open https://adnanpay.com/demo/
2. Check browser console (no errors)
3. Verify product catalog loads
4. Test guest checkout flow
5. Test dashboard login

### Database

```sql
-- Check demo tables
SELECT COUNT(*) FROM demo_orders;
SELECT COUNT(*) FROM demo_products;

-- Check production tables
SELECT COUNT(*) FROM orders;
SELECT COUNT(*) FROM products;
```

## Rollback Procedure

### Backend Rollback

```bash
# Restore from backup
ssh -p 31988 adnanpay@103.164.173.46
cd /home/adnanpay
tar -xzf backup-ppob-backend-[timestamp].tar.gz -C ppob-backend/
touch ppob-backend/tmp/restart.txt
```

### Frontend Rollback

```bash
# Restore from backup
ssh -p 31988 adnanpay@103.164.173.46
cd /home/adnanpay/public_html/demo
rm -rf *
tar -xzf /home/adnanpay/backup-demo-[timestamp].tar.gz
```

### Database Rollback

```sql
-- Revert migration (if needed)
-- Run down migration or restore from backup
```

## Monitoring

### Application Logs

```bash
# Backend logs
ssh -p 31988 adnanpay@103.164.173.46
tail -f /home/adnanpay/ppob-backend/logs/app.log
```

### Error Tracking

- Check Supabase logs
- Check Midtrans dashboard
- Check Digiflazz dashboard
- Check email delivery logs

### Performance Monitoring

- Response times
- Database query performance
- API rate limits
- Server resources (CPU, memory)

## Troubleshooting

### Backend Not Starting

1. Check Node.js version: `node --version`
2. Check environment variables: `cat .env.production`
3. Check logs: `tail -f logs/app.log`
4. Restart: `touch tmp/restart.txt`

### Frontend Not Loading

1. Check .htaccess configuration
2. Check browser console for errors
3. Verify API base URL in build
4. Clear browser cache

### Database Connection Failed

1. Verify Supabase credentials
2. Check network connectivity
3. Verify RLS policies
4. Check service role key

### Payment Integration Failed

1. Verify Midtrans credentials
2. Check webhook URL configuration
3. Verify signature verification
4. Check Midtrans dashboard logs

### Email Not Sending

1. Verify SMTP credentials
2. Check port 465 not blocked
3. Test SMTP connection
4. Check email logs

## Security Checklist

- [ ] All environment variables secured
- [ ] JWT secret is random and strong
- [ ] Encryption key is random and strong
- [ ] HTTPS enabled with valid SSL
- [ ] RLS policies enabled on all tables
- [ ] Service role key not exposed to frontend
- [ ] Midtrans signature verification enabled
- [ ] Digiflazz HMAC verification enabled
- [ ] SMTP credentials secured
- [ ] Admin credentials strong
- [ ] Backup strategy in place

## Backup Strategy

### Database Backup

```bash
# Via Supabase Dashboard
# Settings → Database → Backups → Create Backup

# Via pg_dump (if direct access)
pg_dump -h [host] -U [user] -d [database] > backup.sql
```

### Application Backup

```bash
# Backend
tar -czf backup-ppob-backend-$(date +%Y%m%d).tar.gz ppob-backend/

# Frontend
tar -czf backup-demo-$(date +%Y%m%d).tar.gz public_html/demo/
```

### Backup Schedule

- **Daily**: Automated Supabase backups
- **Weekly**: Manual application backups
- **Before deployment**: Always create backup

## Production Checklist

- [ ] All migrations applied
- [ ] Environment variables configured
- [ ] Backend deployed and running
- [ ] Frontend deployed and accessible
- [ ] Health check passing
- [ ] API endpoints working
- [ ] Payment integration tested
- [ ] Email notifications working
- [ ] SSL certificate valid
- [ ] Monitoring configured
- [ ] Backup created
- [ ] Rollback procedure tested
- [ ] Documentation updated

## Support

For deployment issues:
- Email: mail@adnanpay.com
- Documentation: See `docs/` directory
- Architecture: See `ARCHITECTURE.md`
