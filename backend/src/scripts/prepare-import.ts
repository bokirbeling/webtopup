#!/usr/bin/env tsx
/**
 * Import Digiflazz products directly via Supabase MCP
 * Bypasses the RPC function and inserts directly to demo_products table
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const REFERENCE_DIR = join(process.cwd(), '..', 'digiflazz-product-reference');

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
  
  const catSlug = category.toLowerCase().replace(/[^a-z0-9]/g, '');
  const brandSlug = brand.toLowerCase().replace(/[^a-z0-9]/g, '');
  
  return `${catSlug}-${brandSlug}-${hash}`;
}

function transformProduct(product: DigiflazzProduct) {
  return {
    sku: generateSKU(product.category, product.brand, product.name),
    name: product.name,
    category: product.category,
    brand: product.brand,
    type: product.type,
    description: product.desc || '-',
    price: product.price * 100, // Convert to cents
    image_url: product.image_url || null,
    is_active: true
  };
}

async function main() {
  console.log('🚀 Direct Supabase Import');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const files = readdirSync(REFERENCE_DIR).filter(f => f.endsWith('.json'));
  
  let allProducts: any[] = [];
  
  for (const file of files) {
    const filePath = join(REFERENCE_DIR, file);
    const content = readFileSync(filePath, 'utf-8');
    
    // Handle double-encoded JSON
    let products: DigiflazzProduct[];
    try {
      products = JSON.parse(JSON.parse(content));
    } catch {
      products = JSON.parse(content);
    }
    
    const transformed = products.map(transformProduct);
    allProducts.push(...transformed);
    
    console.log(`✅ ${file}: ${products.length} products`);
  }
  
  console.log(`\n📦 Total products to import: ${allProducts.length.toLocaleString()}`);
  
  // Save as single file for manual import
  const outputPath = join(REFERENCE_DIR, 'all-products-transformed.json');
  writeFileSync(outputPath, JSON.stringify(allProducts, null, 2), 'utf-8');
  
  console.log(`\n💾 Saved to: ${outputPath}`);
  console.log('\n💡 Use Supabase MCP to import this file');
}

main().catch(console.error);
