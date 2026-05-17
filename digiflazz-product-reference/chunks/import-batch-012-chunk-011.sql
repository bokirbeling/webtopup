-- Batch 12 Chunk 11
-- Batch 12
INSERT INTO demo_products (sku_digiflazz, name, category, provider, base_price_minor, is_active, metadata)
VALUES
ON CONFLICT (sku_digiflazz) DO UPDATE SET
  name = EXCLUDED.name
  base_price_minor = EXCLUDED.base_price_minor,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();
