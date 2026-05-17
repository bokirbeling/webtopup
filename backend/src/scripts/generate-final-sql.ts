#!/usr/bin/env tsx
/**
 * Generate SQL INSERT statements from all JSON files
 * Output: SQL batch files ready for import
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const REF_DIR = join(process.cwd(), '..', 'digiflazz-product-reference');
const OUTPUT_DIR = join(REF_DIR, 'sql-batches-final');

// Create output directory
mkdirSync(OUTPUT_DIR, { recursive: true });

const files = [
  'pulsa-telkomsel.json', 'pulsa-xl.json', 'pulsa-indosat.json', 
  'pulsa-tri.json', 'pulsa-smartfren.json', 'pulsa-axis.json', 'pulsa-byu.json',
  'data.json', 'games.json', 'voucher.json', 'emoney.json', 'pln.json'
];

interface Product {
  name: string;
  price: number;
  category: string;
  brand: string;
  type: string;
  desc: string;
  image_url: string;
}

const allProducts: Array<Product & { sku: string; main_category: string; sub_category: string; product_type: string }> = [];

console.log('📦 GENERATING SQL FROM JSON FILES');
console.log('='.repeat(80));

// Category mapping
const categoryMap: Record<string, string> = {
  'Pulsa': 'Pulsa',
  'Data': 'Paket Data',
  'Games': 'Games',
  'Voucher': 'Voucher',
  'E-Money': 'E-Money',
  'PLN': 'PLN'
};

files.forEach(file => {
  const path = join(REF_DIR, file);
  try {
    const content = readFileSync(path, 'utf-8');
    const products: Product[] = JSON.parse(JSON.parse(content));
    
    products.forEach(p => {
      // Generate SKU from name + brand
      const skuBase = `${p.category.toLowerCase()}-${p.brand.toLowerCase()}-${p.name}`;
      const hash = createHash('md5').update(skuBase).digest('hex').substring(0, 8);
      const sku = `${p.category.toLowerCase()}-${p.brand.toLowerCase()}-${hash}`;
      
      // Map to database structure
      const mainCategory = categoryMap[p.category] || p.category;
      const subCategory = p.brand;
      const productType = p.type;
      
      allProducts.push({
        ...p,
        sku,
        main_category: mainCategory,
        sub_category: subCategory,
        product_type: productType
      });
    });
    
    console.log(`✅ ${file.padEnd(25)} : ${products.length} products`);
  } catch (err: any) {
    console.log(`❌ ${file.padEnd(25)} : ERROR - ${err.message}`);
  }
});

console.log('='.repeat(80));
console.log(`Total products: ${allProducts.length}`);

// Check for duplicate SKUs
const skuSet = new Set(allProducts.map(p => p.sku));
console.log(`Unique SKUs: ${skuSet.size}`);
console.log(`Duplicates: ${allProducts.length - skuSet.size}`);

// Generate SQL batches (500 products per batch)
const BATCH_SIZE = 500;
const batches = [];

for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
  batches.push(allProducts.slice(i, i + BATCH_SIZE));
}

console.log(`\n📝 Generating ${batches.length} SQL batch files...`);

batches.forEach((batch, index) => {
  const batchNum = (index + 1).toString().padStart(3, '0');
  const filename = `batch-${batchNum}.sql`;
  
  const values = batch.map(p => {
    const name = p.name.replace(/'/g, "''");
    const desc = (p.desc || '').replace(/'/g, "''");
    const metadata = JSON.stringify({
      type: p.type,
      description: desc,
      image_url: p.image_url
    }).replace(/'/g, "''");
    
    const priceMinor = Math.round(p.price * 100); // Convert to cents
    
    return `  ('${p.sku}', '${name}', '${p.category}', '${p.brand}', ${priceMinor}, true, '${metadata}', '${p.main_category}', '${p.sub_category}', '${p.product_type}')`;
  }).join(',\n');
  
  const sql = `-- Batch ${batchNum}
-- Products: ${batch.length}
-- Range: ${index * BATCH_SIZE + 1} - ${Math.min((index + 1) * BATCH_SIZE, allProducts.length)}

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
  
  const sizeMB = (sql.length / 1024).toFixed(1);
  console.log(`  ${filename} : ${batch.length} products, ${sizeMB} KB`);
});

console.log('\n✅ SQL generation complete!');
console.log(`📁 Output: ${OUTPUT_DIR}`);
console.log(`📊 Total batches: ${batches.length}`);
console.log(`📦 Total products: ${allProducts.length}`);
