# Adnanpay PPOB Platform - System Architecture

## Overview

Adnanpay adalah platform PPOB (Payment Point Online Bank) yang memungkinkan transaksi digital seperti pulsa, paket data, token listrik, voucher game, e-money, dan pembayaran tagihan.

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Client Layer                         │
├─────────────────────────────────────────────────────────────┤
│  Browser (React + Vite)                                      │
│  - Guest Checkout                                            │
│  - Reseller Dashboard                                        │
│  - Admin Panel                                               │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
├─────────────────────────────────────────────────────────────┤
│  Express.js Backend (Node.js + TypeScript)                   │
│  - REST API                                                  │
│  - JWT Authentication                                        │
│  - Business Logic                                            │
│  - State Machine                                             │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Supabase   │  │   Midtrans   │  │  Digiflazz   │
│  PostgreSQL  │  │   Payment    │  │   Provider   │
│   Database   │  │   Gateway    │  │     API      │
└──────────────┘  └──────────────┘  └──────────────┘
```

## Technology Stack

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite 5
- **Styling**: Tailwind CSS 3
- **Icons**: Lucide React
- **HTTP**: Native Fetch API
- **State**: React Hooks (useState, useEffect)

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Express.js 4
- **Language**: TypeScript 5
- **Database Client**: Supabase JS Client
- **Authentication**: JWT (jsonwebtoken)
- **Password Hashing**: bcryptjs
- **Email**: Nodemailer
- **Testing**: Playwright

### Database
- **Provider**: Supabase (PostgreSQL 15)
- **ORM**: None (Direct SQL via Supabase client)
- **Migrations**: SQL files in `supabase/migrations/`
- **Security**: Row Level Security (RLS)

### External Services
- **Payment Gateway**: Midtrans (Sandbox & Production)
- **Product Provider**: Digiflazz Buyer API
- **Email**: SMTP (mail.adnanpay.com)
- **Hosting**: cPanel (Natanetwork VPS)

## Database Schema

### Core Tables

#### users
```sql
- id: uuid (PK)
- email: text (unique)
- password_hash: text
- role: text (admin, seller, pengguna)
- is_reseller_active: boolean
- reseller_status: text
- email_verified: boolean
- email_verification_token: text
- email_verification_expires_at: timestamptz
```

#### products
```sql
- id: uuid (PK)
- sku_digiflazz: text (unique)
- name: text
- category: text
- provider: text
- base_price_minor: bigint
- is_active: boolean
```

#### orders
```sql
- id: uuid (PK)
- order_number: text (unique)
- customer_ref: text
- product_code: text
- provider: text
- amount_minor: bigint
- currency: text
- status: text
- expires_at: timestamptz
```

#### payments
```sql
- id: uuid (PK)
- order_id: uuid (FK)
- provider: text
- provider_reference: text
- amount_minor: bigint
- status: text
- paid_at: timestamptz
```

#### fulfillments
```sql
- id: uuid (PK)
- order_id: uuid (FK)
- provider: text
- provider_reference: text
- status: text
- fulfilled_at: timestamptz
```

### Security Tables

#### midtrans_events
```sql
- id: uuid (PK)
- order_id: uuid (FK)
- event_type: text
- signature_key: text
- transaction_status: text
- fraud_status: text
- raw_payload: jsonb
- created_at: timestamptz
```

#### digiflazz_events
```sql
- id: uuid (PK)
- order_id: uuid (FK)
- event_type: text
- status: text
- raw_payload: jsonb
- created_at: timestamptz
```

### Financial Tables

#### commissions
```sql
- id: uuid (PK)
- user_id: uuid (FK)
- order_id: uuid (FK)
- amount_minor: bigint
- status: text
- paid_at: timestamptz
```

#### payout_requests
```sql
- id: uuid (PK)
- user_id: uuid (FK)
- amount_minor: bigint
- encrypted_identity_data: text
- status: text
- approved_at: timestamptz
```

#### tax_allocations
```sql
- id: uuid (PK)
- order_id: uuid (FK)
- tax_type: text
- rate_percentage: numeric
- amount_minor: bigint
- allocated_at: timestamptz
```

## Backend Modules

### 1. Account Module
- User profile management
- Reseller status management

### 2. Admin Module
- Product management
- User management
- Excel product upload
- System monitoring

### 3. Audit Module
- Provider event logging
- System audit trails

### 4. Auth Module
- Registration
- Login
- JWT token generation
- Email verification

### 5. Catalog Module
- Product listing
- Price calculation
- Category filtering

### 6. Commission Module
- Commission calculation
- Performance tracking
- Referral/discount codes

### 7. Dashboard Module
- User dashboard
- Transaction history
- Statistics

### 8. Digiflazz Module
- Buyer API integration
- Product fulfillment
- Status checking
- Webhook handling

### 9. Email Module
- SMTP integration
- Email templates
- Verification emails
- Notification emails

### 10. Fulfillment Module
- Order fulfillment
- Provider integration
- Status updates

### 11. Invoice Status Module
- Invoice generation
- Status tracking

### 12. Order Module
- Order creation
- Order lifecycle
- State machine

### 13. Payment Module
- Midtrans integration
- Payment verification
- Webhook handling

### 14. Payout Module
- Payout requests
- Identity encryption
- Balance management

### 15. Postpaid Module
- Bill inquiry
- Bill payment

### 16. Reconcile Module
- Payment reconciliation
- Drift detection

### 17. Tax Module
- Tax allocation
- Tax reporting

## Security Architecture

### Authentication Flow
```
1. User submits email + password
2. Backend validates credentials
3. Backend generates JWT token
4. Frontend stores token
5. Frontend sends token in Authorization header
6. Backend verifies token on each request
```

### Payment Security
```
1. User initiates payment
2. Backend creates order
3. Backend calls Midtrans API
4. Midtrans returns payment URL
5. User completes payment
6. Midtrans sends webhook
7. Backend verifies signature
8. Backend updates order status
```

### Data Encryption
- **Payout Identity**: AES-256-GCM encryption
- **Passwords**: bcrypt with salt rounds
- **JWT**: HS256 algorithm
- **HTTPS**: TLS 1.2+

### Row Level Security (RLS)
- All tables have RLS enabled
- Users can only access their own data
- Admin can access all data
- Service role bypasses RLS

## API Architecture

### REST API Endpoints

#### Public Endpoints
- `GET /health` - Health check
- `GET /api/catalog/products` - Product listing
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login

#### Protected Endpoints (JWT Required)
- `GET /api/dashboard` - User dashboard
- `POST /api/orders` - Create order
- `GET /api/orders/:id` - Get order
- `POST /api/payments/midtrans/initialize` - Initialize payment
- `GET /api/commissions` - Get commissions
- `POST /api/payout/request` - Request payout

#### Admin Endpoints (Admin Role Required)
- `GET /api/admin/users` - List users
- `POST /api/admin/products` - Create product
- `POST /api/admin/products/upload` - Bulk upload
- `GET /api/admin/orders` - List all orders

#### Webhook Endpoints
- `POST /api/payments/midtrans/webhook` - Midtrans webhook
- `POST /api/fulfillment/digiflazz/webhook` - Digiflazz webhook

## State Machine

### Order Lifecycle
```
created → payment_pending → payment_success → fulfillment_pending 
  → fulfillment_success → completed

Alternative paths:
- payment_pending → payment_failed → cancelled
- payment_pending → expired → cancelled
- fulfillment_pending → fulfillment_failed → refund_pending
```

### Payment States
- `pending` - Awaiting payment
- `success` - Payment confirmed
- `failed` - Payment failed
- `expired` - Payment expired

### Fulfillment States
- `pending` - Awaiting fulfillment
- `processing` - Being processed
- `success` - Fulfilled successfully
- `failed` - Fulfillment failed

## Integration Points

### Midtrans Integration
- **Environment**: Sandbox (dev), Production (prod)
- **API Base**: `https://app.sandbox.midtrans.com` (sandbox)
- **Authentication**: Server Key in Authorization header
- **Signature**: SHA512 hash verification
- **Webhook**: POST to `/api/payments/midtrans/webhook`

### Digiflazz Integration
- **Environment**: Development (dev), Production (prod)
- **API Base**: `https://api.digiflazz.com/v1`
- **Authentication**: Username + API Key
- **HMAC**: Optional signature verification
- **Products**: 5 in dev, 7,794+ in production
- **Webhook**: POST to `/api/fulfillment/digiflazz/webhook`

### Email Integration
- **Provider**: SMTP (mail.adnanpay.com)
- **Port**: 465 (SSL/TLS)
- **Authentication**: Username + Password
- **Templates**: HTML email templates
- **Use Cases**: Verification, notifications, alerts

## Deployment Architecture

### Production Environment
```
┌─────────────────────────────────────────┐
│         adnanpay.com (cPanel)           │
├─────────────────────────────────────────┤
│  /public_html/                          │
│  ├── demo/              (Frontend)      │
│  │   ├── index.html                     │
│  │   └── assets/                        │
│  └── .htaccess         (Proxy rules)    │
│                                          │
│  /ppob-backend/         (Backend)       │
│  ├── dist/                              │
│  ├── node_modules/                      │
│  └── .env.production                    │
└─────────────────────────────────────────┘
```

### Proxy Configuration
```apache
# Frontend routes
RewriteRule ^demo/(.*)$ /demo/$1 [L]

# Backend API proxy
RewriteRule ^ppob-api/(.*)$ http://localhost:3001/$1 [P,L]
```

### Process Management
- **Backend**: Passenger (cPanel)
- **Restart**: `touch tmp/restart.txt`
- **Logs**: `/home/adnanpay/ppob-backend/logs/`

## Performance Considerations

### Database Optimization
- Indexes on frequently queried columns
- RLS policies for security
- Connection pooling via Supabase

### Caching Strategy
- No caching layer (future improvement)
- Fresh data on every request

### API Rate Limiting
- No rate limiting (future improvement)
- Rely on provider rate limits

## Monitoring & Logging

### Application Logs
- Console logs in development
- File logs in production
- Error tracking (future: Sentry)

### Database Monitoring
- Supabase dashboard
- Query performance
- Connection stats

### External Service Monitoring
- Midtrans dashboard
- Digiflazz dashboard
- Email delivery logs

## Future Improvements

1. **Caching**: Redis for product catalog
2. **Rate Limiting**: Express rate limiter
3. **CDN**: CloudFlare for static assets
4. **Monitoring**: Sentry for error tracking
5. **Testing**: Automated E2E tests
6. **CI/CD**: GitHub Actions
7. **Documentation**: OpenAPI/Swagger
8. **Mobile**: React Native app

## Glossary

- **PPOB**: Payment Point Online Bank
- **RLS**: Row Level Security
- **JWT**: JSON Web Token
- **HMAC**: Hash-based Message Authentication Code
- **SKU**: Stock Keeping Unit
- **Minor Units**: Smallest currency unit (e.g., cents)
