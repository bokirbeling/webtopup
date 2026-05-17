#!/usr/bin/env tsx
/**
 * Generate SQL INSERT from structured JSON data
 * Creates batches of 500 products each
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const REF_DIR = join(process.cwd(), '..', 'digiflazz-product-reference');
const OUTPUT_DIR = join(REF_DIR, 'sql-batches-final');

// Create output directory
mkdirSync(OUTPUT_DIR, { recursive: true });

console.log('📦 GENERATING SQL INSERT STATEMENTS');
console.log('='.repeat(80));

// Read structured data
const dataPath = join(REF_DIR, 'all-products-structured.json');
const products = JSON.parse(readFileSync(dataPath, 'utf-8'));

console.log(`Total products: ${products.length}\n`);

// Generate SQL batches (500 products each)
const BATCH_SIZE = 500;
const totalBatches = Math.ceil(products.length / BATCH_SIZE);

console.log(`Generating ${totalBatches} SQL batches...\n`);

for (let i = 0; i < totalBatches; i++) {
  const start = i * BATCH_SIZE;
  const end = Math.min(start + BATCH_SIZE, products.length);
  const batch = products.slice(start, end);
  
  const batchNum = (i + 1).toString().padStart(3, '0');
  const filename = `batch-${batchNum}.sql`;
  
  // Generate SQL
  const values = batch.map((p: any) => {
    const sku = p.sku_digiflazz.replace(/'/g, "''");
    const name = p.name.replace(/'/g, "''");
    const category = p.category.replace(/'/g, "''");
    const provider = p.provider.replace(/'/g, "''");
    const mainCat = p.main_category.replace(/'/g, "''");
    const subCat = p.sub_category.replace(/'/g, "''");
    const prodType = p.product_type.replace(/'/g, "''");
    const metadata = JSON.stringify(p.metadata).replace(/'/g, "''");
    
    return `  ('${sku}', '${name}', '${category}', '${provider}', ${p.base_price_minor}, ${p.is_active}, '${metadata}'::jsonb, '${mainCat}', '${subCat}', '${prodType}')`;
  }).join(',\n');
  
  const sql = `-- Batch ${batchNum}
-- Products: ${start + 1} to ${end}
-- Count: ${batch.length}

INSERT INTO demo_products (
  sku_digiflazz, name, category, provider, 
  base_price_minor, is_active, metadata,
  main_category, sub_category, product_type
)
VALUES
${values}
ON CONFLICT (sku_digiflazz) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  provider = EXCLUDED.provider,
  base_price_minor = EXCLUDED.base_price_minor,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  main_category = EXCLUDED.main_category,
  sub_category = EXCLUDED.sub_category,
  product_type = EXCLUDED.product_type,
  updated_at = NOW();
`;
  
  const outputPath = join(OUTPUT_DIR, filename);
  writeFileSync(outputPath, sql, 'utf-8');
  
  console.log(`✅ ${filename} (${batch.length} products, ${(sql.length / 1024).toFixed(1)} KB)`);
}

console.log('\n' + '='.repeat(80));
console.log(`\n✅ Generated ${totalBatches} SQL batch files`);
console.log(`📁 Output: ${OUTPUT_DIR}`);
console.log('\n🚀 NEXT: Import to database using Python script');
