# Draft: Adnanpay Production Launch Plan

## Requirements (confirmed from user plan document)

### Target Deployment
- Domain: `adnanpay.com` (production), keep `demo.hanzserver.online` as demo
- Server: Shared Hosting cPanel 1GB RAM
- Stack: Node.js backend + Supabase + React/Vite frontend
- Integration: Digiflazz Buyer API (production mode, not testing)

### Core Goals
- Hemat resource (1GB RAM)
- Cepat & ringan
- Stable production launch
- Integrasi Digiflazz sempurna
- User experience mobile-first

## Current State (from exploration)

### Frontend Architecture
- React + Vite SPA (NOT Next.js - plan mentions Next.js but codebase is Vite)
- Custom client-side routing in App.tsx via popstate + custom 'bayarku:navigate' event
- Routes: /, /catalog, /category/:slug, /products/:cat, /invoice/:code, /dashboard, /admin, /admin/vouchers
- Bundle: ~292KB JS + 50KB CSS = reasonable size
- **CRITICAL BUG**: ProductCatalog fetches ALL 12,775 products on load (no server-side pagination) - must fix
- API client: lib/api.ts - reads VITE_API_BASE_URL, defaults to '/api'

### Backend Architecture  
- Express.js + TypeScript + Supabase service role
- Routes: /api/catalog, /api/vouchers, /api/orders, /api/dashboard, /health
- Modules: 18 modules (account, admin, audit, auth, catalog, commission, dashboard, digiflazz, email, fulfillment, invoice-status, order, payment, payout, postpaid, reconcile, regression, tax)
- ProductCacheService: in-memory 5min TTL cache in backend/src/modules/catalog/
- Server starts with: `import "dotenv/config"` + `createApp()` pattern
- PM2 managed, Nginx reverse proxy
- **Missing compression middleware** (gzip/brotli not confirmed)

### Key Issues to Fix for Production
1. Frontend loads ALL products - needs server-side pagination/filtering
2. Checkout.tsx has prop mismatch (ProductCatalog passes product but Checkout expects onClose/onCheckout too)
3. Admin panel routes not protected (anyone can access /admin)
4. No transaction history page for users
5. Digiflazz integration status unknown (buyer API configured but fulfillment integration?)
6. No gzip compression on backend
7. Memory limit not set (--max-old-space-size)
8. No riwayat transaksi for users

## Technical Decisions

### Frontend Approach: Keep Vite React (NOT migrate to Next.js)
Reason: Codebase is already Vite SPA, migration to Next.js = 1-2 weeks work. User plan mentions Next.js but they're currently on Vite. Plan should optimize current stack instead.

### Server-Side Pagination Strategy
- Backend /catalog/products must accept: ?page=1&limit=50&search=&category=
- Frontend ProductCatalog: fetch page by page, implement virtual scroll or "load more"
- Backend ProductCacheService already has getPaginatedProducts() method

### Memory Strategy for 1GB RAM
- Set NODE_OPTIONS=--max-old-space-size=512 in PM2
- Enable gzip in Express (compression middleware)
- Cache warmup on startup, 5min TTL
- Nginx gzip for static files

## Research Findings (PENDING - agents running)

- Digiflazz integration details
- Admin panel capabilities
- Auth system details
- Fulfillment module status

## Open Questions

- Does Digiflazz buyer API integration work end-to-end? (fulfillment module)
- Is there a payment gateway (Midtrans) integration for real payments?
- Transaction history - does it exist or needs to be built?
- User registration/login flow - what's built?

## Scope Boundaries

INCLUDE:
- Server-side pagination for catalog (fix critical bug)
- Gzip compression + memory limit
- Auth middleware for admin routes
- Digiflazz price sync (auto every 15-30min)
- Transaction history page
- Production .env configuration
- Nginx + PM2 production config
- Deployment to shared hosting (cPanel)

EXCLUDE (separate phase):
- Next.js migration
- Real payment gateway integration (Midtrans)
- Email notifications
- Multi-language support
