#!/usr/bin/env tsx
/**
 * Re-structure existing JSON data with proper category hierarchy
 * Maps Digiflazz categories to our category structure
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

// Category mapping: Digiflazz category -> Our main_category
const CATEGORY_MAP: Record<string, string> = {
  'Pulsa': 'Pulsa',
  'Data': 'Paket Data',
  'Games': 'Games',
  'Voucher': 'Voucher',
  'E-Money': 'E-Money',
  'PLN': 'PLN',
  'Pascabayar': 'Pascabayar',
};

interface DigiflazzProduct {
  name: string;
  price: number;
  category: string;
  brand: string;
  type: string;
  desc: string;
  image_url: string;
}

interface StructuredProduct {
  sku_digiflazz: string;
  name: string;
  category: string; // Original Digiflazz category
  provider: string; // Brand
  base_price_minor: number; // Price in cents
  is_active: boolean;
  metadata: {
    type: string;
    description: string;
    image_url: string;
  };
  main_category: string; // Our category
  sub_category: string; // Brand
  product_type: string; // Type
}

const JSON_FILES = [
  'pulsa-telkomsel.json',
  'pulsa-xl.json',
  'pulsa-indosat.json',
  'pulsa-tri.json',
  'pulsa-smartfren.json',
  'pulsa-axis.json',
  'pulsa-byu.json',
  'data.json',
  'games.json',
  'voucher.json',
  'emoney.json',
  'pln.json'
];

const REF_DIR = join(process.cwd(), '..', 'digiflazz-product-reference');

console.log('📦 RE-STRUCTURING DIGIFLAZZ DATA');
console.log('='.repeat(80));

let allProducts: StructuredProduct[] = [];
let totalCount = 0;

for (const file of JSON_FILES) {
  const filePath = join(REF_DIR, file);
  
  try {
    console.log(`\n📄 Processing ${file}...`);
    const content = readFileSync(filePath, 'utf-8');
    
    // Parse double-encoded JSON
    let data = JSON.parse(content);
    if (typeof data === 'string') {
      data = JSON.parse(data);
    }
    
    const products: DigiflazzProduct[] = Array.isArray(data) ? data : data.data || [];
    console.log(`   Found ${products.length} products`);
    
    // Structure each product
    const structured = products.map(p => {
      const mainCategory = CATEGORY_MAP[p.category] || p.category;
      const sku = `${p.category.toLowerCase()}-${p.brand.toLowerCase()}-${createHash('md5').update(p.name).digest('hex').substring(0, 8)}`;
      
      const product: StructuredProduct = {
        sku_digiflazz: sku,
        name: p.name,
        category: p.category,
        provider: p.brand,
        base_price_minor: p.price, // Already in minor units
        is_active: true,
        metadata: {
          type: p.type,
          description: p.desc || '',
          image_url: p.image_url || `https://cdn.mobilepulsa.net/img/logo/pulsa/small/${p.brand.toLowerCase()}.png`
        },
        main_category: mainCategory,
        sub_category: p.brand,
        product_type: p.type
      };
      
      return product;
    });
    
    allProducts.push(...structured);
    totalCount += structured.length;
    
  } catch (err) {
    console.error(`   ❌ Error: ${err}`);
  }
}

console.log('\n' + '='.repeat(80));
console.log(`\n✅ Total products structured: ${totalCount}`);

// Group by main_category
const byCategory = allProducts.reduce((acc, p) => {
  if (!acc[p.main_category]) acc[p.main_category] = [];
  acc[p.main_category].push(p);
  return acc;
}, {} as Record<string, StructuredProduct[]>);

console.log('\n📊 CATEGORY BREAKDOWN:');
Object.entries(byCategory).forEach(([cat, prods]) => {
  console.log(`   ${cat}: ${prods.length} products`);
});

// Save structured data
const outputPath = join(REF_DIR, 'all-products-structured.json');
writeFileSync(outputPath, JSON.stringify(allProducts, null, 2), 'utf-8');
console.log(`\n💾 Saved to: ${outputPath}`);

console.log('\n🎯 NEXT STEPS:');
console.log('1. Generate SQL INSERT statements from structured data');
console.log('2. Import to database');
console.log('3. Verify no duplicates');
