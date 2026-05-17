-- Dashboard Management Tables for Demo
-- All tables prefixed with demo_ for demo environment

-- 1. Hero Section (Quick Links)
CREATE TABLE IF NOT EXISTS demo_hero_quick_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  icon TEXT NOT NULL, -- lucide icon name
  color TEXT NOT NULL, -- gradient classes
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Promo Carousel
CREATE TABLE IF NOT EXISTS demo_promo_carousel (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL,
  badge TEXT NOT NULL,
  badge_color TEXT NOT NULL, -- bg-rose-500, bg-amber-500, etc
  cta_text TEXT NOT NULL,
  bg_gradient TEXT NOT NULL, -- from-blue-600 via-blue-700 to-slate-800
  accent_color TEXT NOT NULL, -- bg-blue-400/20
  image_url TEXT NOT NULL,
  discount_text TEXT NOT NULL, -- 25%, FREE, +50, etc
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Categories
CREATE TABLE IF NOT EXISTS demo_dashboard_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  label TEXT NOT NULL,
  sub_label TEXT NOT NULL,
  icon TEXT NOT NULL, -- lucide icon name
  color TEXT NOT NULL, -- bg-blue-50 text-blue-600
  border_color TEXT NOT NULL, -- hover:border-blue-200
  is_hot BOOLEAN NOT NULL DEFAULT false,
  link_url TEXT, -- /products/pulsa, /products/game, etc
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Hot Deals
CREATE TABLE IF NOT EXISTS demo_hot_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  operator TEXT NOT NULL,
  original_price_minor BIGINT NOT NULL,
  price_minor BIGINT NOT NULL,
  discount_percentage INTEGER NOT NULL,
  rating DECIMAL(2,1) NOT NULL DEFAULT 4.5,
  sold_count TEXT NOT NULL, -- 12.4rb, 9.1rb, etc
  color_gradient TEXT NOT NULL, -- from-red-50 to-rose-50
  badge_color TEXT NOT NULL, -- bg-red-100 text-red-600
  image_url TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Stats
CREATE TABLE IF NOT EXISTS demo_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icon TEXT NOT NULL, -- lucide icon name
  value TEXT NOT NULL, -- 2.5 Juta+, 50 Juta+, 4.9/5, < 5 Detik
  label TEXT NOT NULL,
  color TEXT NOT NULL, -- text-blue-500
  bg_color TEXT NOT NULL, -- bg-blue-50
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 6. Features
CREATE TABLE IF NOT EXISTS demo_features (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  icon TEXT NOT NULL, -- lucide icon name
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  color TEXT NOT NULL, -- text-emerald-600
  bg_color TEXT NOT NULL, -- bg-emerald-50
  border_color TEXT NOT NULL, -- border-emerald-100
  display_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_hero_quick_links_order ON demo_hero_quick_links(display_order) WHERE is_active = true;
CREATE INDEX idx_promo_carousel_order ON demo_promo_carousel(display_order) WHERE is_active = true;
CREATE INDEX idx_dashboard_categories_order ON demo_dashboard_categories(display_order) WHERE is_active = true;
CREATE INDEX idx_hot_deals_order ON demo_hot_deals(display_order) WHERE is_active = true;
CREATE INDEX idx_stats_order ON demo_stats(display_order) WHERE is_active = true;
CREATE INDEX idx_features_order ON demo_features(display_order) WHERE is_active = true;

-- Enable RLS
ALTER TABLE demo_hero_quick_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_promo_carousel ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_dashboard_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_hot_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE demo_features ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public read, admin write
CREATE POLICY "Public can read hero quick links"
  ON demo_hero_quick_links FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage hero quick links"
  ON demo_hero_quick_links FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Public can read promo carousel"
  ON demo_promo_carousel FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage promo carousel"
  ON demo_promo_carousel FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Public can read dashboard categories"
  ON demo_dashboard_categories FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage dashboard categories"
  ON demo_dashboard_categories FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Public can read hot deals"
  ON demo_hot_deals FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage hot deals"
  ON demo_hot_deals FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Public can read stats"
  ON demo_stats FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage stats"
  ON demo_stats FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Public can read features"
  ON demo_features FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admin can manage features"
  ON demo_features FOR ALL
  USING (auth.jwt() ->> 'role' = 'admin');
