# Implementation Plan - Dashboard Management System

## Current Status
- ✅ Database tables created (demo_hero_quick_links, demo_promo_carousel, demo_dashboard_categories, demo_hot_deals, demo_stats, demo_features)
- ✅ RLS policies applied
- ✅ Seed data inserted
- ✅ Backend API created (backend/src/routes/dashboard.router.ts)
- 🔄 Register router in app.ts (IN PROGRESS)
- ⏳ Admin panel UI
- ⏳ Frontend components update
- ⏳ Category routing

## Todo List

### High Priority
1. **Register dashboard router in app.ts** (IN PROGRESS)
   - Import createDashboardContentRouter from routes/dashboard.router.ts
   - Add route: app.use(fullPath("/api/dashboard"), createDashboardContentRouter())
   - Test endpoints: GET /api/dashboard/hero, /promos, /categories, /deals, /stats, /features

2. **Connect Categories to product list pages**
   - Create ProductList.tsx component
   - Add route in App.tsx: /products/:category
   - Update Categories.tsx onClick to navigate
   - Fetch products by category from catalog API

3. **Create admin panel UI for Dashboard Management**
   - Create DashboardManagement.tsx in Frontend/src/components/admin/
   - Tabs: Hero, Promos, Categories, Deals, Stats, Features
   - CRUD operations for each section
   - Image upload for promos and categories

4. **Update frontend components to fetch from API**
   - Hero.tsx: fetch from /api/dashboard/hero
   - PromoCarousel.tsx: fetch from /api/dashboard/promos
   - Categories.tsx: fetch from /api/dashboard/categories
   - HotDeals.tsx: fetch from /api/dashboard/deals
   - Stats.tsx: fetch from /api/dashboard/stats
   - Features.tsx: fetch from /api/dashboard/features

### Medium Priority
5. **Full scraping (after dashboard complete)**
   - Install playwright: pip install playwright && playwright install chromium
   - Run: python backend/src/scripts/full_scrape_digiflazz.py
   - Output: digiflazz-full-products.csv
   - Import to Supabase via Dashboard

6. **Update dashboard categories after scraping**
   - Add Pascabayar categories (PDAM, BPJS, etc)
   - Update icons and colors
   - Reorder display_order

## API Endpoints (Already Created)

### Public Endpoints
- GET /api/dashboard/hero - Get hero quick links
- GET /api/dashboard/promos - Get promo carousel
- GET /api/dashboard/categories - Get dashboard categories
- GET /api/dashboard/deals - Get hot deals
- GET /api/dashboard/stats - Get statistics
- GET /api/dashboard/features - Get features

### Admin Endpoints (require auth + admin role)
- POST /api/dashboard/hero - Create hero link
- PUT /api/dashboard/hero/:id - Update hero link
- DELETE /api/dashboard/hero/:id - Delete hero link
- (Same pattern for promos, categories, deals, stats, features)

## Database Schema

### demo_hero_quick_links
- id (uuid, PK)
- title (text)
- icon (text)
- link (text)
- display_order (int)
- is_active (boolean)
- created_at, updated_at

### demo_promo_carousel
- id (uuid, PK)
- title (text)
- subtitle (text)
- badge_text (text)
- cta_text (text)
- cta_link (text)
- image_url (text)
- gradient_from (text)
- gradient_to (text)
- display_order (int)
- is_active (boolean)
- created_at, updated_at

### demo_dashboard_categories
- id (uuid, PK)
- title (text)
- description (text)
- icon (text)
- color (text)
- link (text)
- is_hot (boolean)
- display_order (int)
- is_active (boolean)
- created_at, updated_at

### demo_hot_deals
- id (uuid, PK)
- title (text)
- original_price (int)
- discounted_price (int)
- discount_percentage (int)
- rating (decimal)
- sold_count (int)
- image_url (text)
- link (text)
- display_order (int)
- is_active (boolean)
- created_at, updated_at

### demo_stats
- id (uuid, PK)
- label (text)
- value (text)
- icon (text)
- display_order (int)
- is_active (boolean)
- created_at, updated_at

### demo_features
- id (uuid, PK)
- title (text)
- description (text)
- icon (text)
- display_order (int)
- is_active (boolean)
- created_at, updated_at

## Next Steps

1. Register dashboard router ✓
2. Test all API endpoints
3. Create ProductList component
4. Update Categories onClick
5. Create admin panel UI
6. Update frontend components
7. Full scraping (40 categories)
8. Import CSV
9. Update dashboard categories

## Notes

- All dashboard content is now database-driven
- Admin can manage all sections via API
- Frontend will fetch from API instead of hardcoded
- Scraping will add 34 more categories (16 Prabayar + 18 Pascabayar)
- Current products: 11,229 (6 categories only)
- Expected after full scraping: ~15,000-20,000 products (40 categories)
