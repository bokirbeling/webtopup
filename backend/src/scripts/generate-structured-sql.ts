#!/usr/bin/env tsx
/**
 * Generate import SQL with proper category structure
 * Maps Digiflazz data to new hierarchical category system
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const REF_DIR = join(process.cwd(), '..', 'digiflazz-product-reference');
const OUTPUT_DIR = join(REF_DIR, 'structured-batches');

// Category mapping: Digiflazz category -> Our main_category
const CATEGORY_MAP: Record<string, string> = {
  'Data': 'Paket Data',
  'Pulsa': 'Pulsa',
  'Games': 'Games',
  'E-Money': 'E-Money',
  'Voucher': 'Voucher',
  'Listrik PLN': 'PLN',
  'Pascabayar': 'Pascabayar',
};

type DigiflazzProduct = {
  name: string;
  price: number;
  category: string;
  brand: string;
  type: string;
  desc: string;
  image_url: string;
};

function generateSKU(category: string, brand: string, name: string): string {
  const hash = createHash('md5')
    .update(`${category}-${brand}-${name}`)
    .digest('hex')
    .substring(0, 8);
  
  const categorySlug = category.toLowerCase().replace(/\s+/g, '-');
  const brandSlug = brand.toLowerCase().replace(/\s+/g, '-');
  
  return `${categorySlug}-${brandSlug}-${hash}`;
}

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function mapCategory(digiflazzCategory: string): string {
  return CATEGORY_MAP[digiflazzCategory] || digiflazzCategory;
}

function productToSQL(product: DigiflazzProduct): string {
  const sku = generateSKU(product.category, product.brand, product.name);
  const mainCategory = mapCategory(product.category);
  const subCategory = product.brand;
  const productType = product.type || 'Reguler';
  const priceMinor = product.price * 100; // Convert to cents
  
  const metadata = JSON.stringify({
    type: product.type,
    description: product.desc,
    image_url: product.image_url,
  });
  
  return `  ('${sku}', '${escapeSQL(product.name)}', '${escapeSQL(product.category)}', '${escapeSQL(product.brand)}', ${priceMinor}, true, '${escapeSQL(metadata)}', '${escapeSQL(mainCategory)}', '${escapeSQL(subCategory)}', '${escapeSQL(productType)}')`;
}

function processJSONFile(filename: string): DigiflazzProduct[] {
  const filePath = join(REF_DIR, filename);
  const content = readFileSync(filePath, 'utf-8').trim();
  
  // Skip empty files
  if (!content || content === '""' || content === '[]') {
    return [];
  }
  
  try {
    // Double-encoded JSON
    const parsed = JSON.parse(JSON.parse(content));
    
    if (!Array.isArray(parsed)) {
      console.warn(`⚠️  ${filename}: Not an array, skipping`);
      return [];
    }
    
    return parsed;
  } catch (err) {
    console.warn(`⚠️  ${filename}: Parse error, skipping`);
    return [];
  }
}

function generateBatchSQL(products: DigiflazzProduct[], batchNum: number): string {
  const values = products.map(p => productToSQL(p)).join(',\n');
  
  return `-- Structured Batch ${batchNum}
-- Products: ${products.length}
-- Generated: ${new Date().toISOString()}

INSERT INTO demo_products (
  sku_digiflazz, 
  name, 
  category, 
  provider, 
  base_price_minor, 
  is_active, 
  metadata,
  main_category,
  sub_category,
  product_type
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
  updated_at = timezone('utc'::text, now());
`;
}

// Main execution
console.log('📦 GENERATING STRUCTURED SQL BATCHES');
console.log('='.repeat(80));

// Create output directory
const fs = require('fs');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Get all JSON files
const jsonFiles = readdirSync(REF_DIR)
  .filter(f => f.endsWith('.json') && f !== 'categories.json')
  .sort();

console.log(`\nFound ${jsonFiles.length} JSON files\n`);

let allProducts: DigiflazzProduct[] = [];
let fileStats: Record<string, number> = {};

// Load all products
for (const file of jsonFiles) {
  console.log(`📄 Processing ${file}...`);
  const products = processJSONFile(file);
  
  if (products.length > 0) {
    allProducts.push(...products);
    fileStats[file] = products.length;
    console.log(`   ✅ ${products.length} products`);
  } else {
    console.log(`   ⚠️  Empty or invalid`);
  }
}

console.log('\n' + '='.repeat(80));
console.log(`\n📊 TOTAL PRODUCTS: ${allProducts.length}\n`);

// Show category distribution
const categoryCount: Record<string, number> = {};
const brandCount: Record<string, Record<string, number>> = {};

for (const product of allProducts) {
  const mainCat = mapCategory(product.category);
  categoryCount[mainCat] = (categoryCount[mainCat] || 0) + 1;
  
  if (!brandCount[mainCat]) {
    brandCount[mainCat] = {};
  }
  brandCount[mainCat][product.brand] = (brandCount[mainCat][product.brand] || 0) + 1;
}

console.log('CATEGORY DISTRIBUTION:');
for (const [cat, count] of Object.entries(categoryCount).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${cat}: ${count} products`);
  
  const brands = brandCount[cat];
  const topBrands = Object.entries(brands)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);
  
  for (const [brand, brandCount] of topBrands) {
    console.log(`    └─ ${brand}: ${brandCount}`);
  }
}

// Generate batches (500 products per batch)
const BATCH_SIZE = 500;
const batches = [];

for (let i = 0; i < allProducts.length; i += BATCH_SIZE) {
  const batch = allProducts.slice(i, i + BATCH_SIZE);
  batches.push(batch);
}

console.log('\n' + '='.repeat(80));
console.log(`\n📦 GENERATING ${batches.length} BATCHES (${BATCH_SIZE} products each)\n`);

for (let i = 0; i < batches.length; i++) {
  const batchNum = i + 1;
  const batch = batches[i];
  const sql = generateBatchSQL(batch, batchNum);
  
  const filename = `structured-batch-${batchNum.toString().padStart(3, '0')}.sql`;
  const filepath = join(OUTPUT_DIR, filename);
  
  writeFileSync(filepath, sql, 'utf-8');
  
  const sizeKB = (sql.length / 1024).toFixed(1);
  console.log(`  ${batchNum}. ${filename} - ${batch.length} products (${sizeKB} KB)`);
}

console.log('\n' + '='.repeat(80));
console.log('\n✅ GENERATION COMPLETE!');
console.log(`\nOutput directory: ${OUTPUT_DIR}`);
console.log(`Total batches: ${batches.length}`);
console.log(`Total products: ${allProducts.length}`);
console.log('\nNext steps:');
console.log('1. Review structured-batches/ directory');
console.log('2. Execute batches via import script');
console.log('3. Verify category hierarchy');
