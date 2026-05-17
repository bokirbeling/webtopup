#!/usr/bin/env tsx
/**
 * Import products using Supabase SQL INSERT in batches
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

function escapeSQL(str: string): string {
  return str.replace(/'/g, "''");
}

function generateInsertSQL(products: DigiflazzProduct[], batchNum: number): string {
  const values = products.map(p => {
    const sku = generateSKU(p.category, p.brand, p.name);
    const name = escapeSQL(p.name);
    const category = escapeSQL(p.category);
    const provider = escapeSQL(p.brand);
    const price = p.price * 100; // Convert to cents
    
    // Build metadata JSON
    const metadata = {
      type: p.type,
      description: p.desc || '-',
      image_url: p.image_url || null
    };
    const metadataStr = escapeSQL(JSON.stringify(metadata));
    
    return `('${sku}', '${name}', '${category}', '${provider}', ${price}, true, '${metadataStr}')`;
  }).join(',\n  ');

  return `-- Batch ${batchNum}
INSERT INTO demo_products (sku_digiflazz, name, category, provider, base_price_minor, is_active, metadata)
VALUES
  ${values}
ON CONFLICT (sku_digiflazz) DO UPDATE SET
  name = EXCLUDED.name,
  base_price_minor = EXCLUDED.base_price_minor,
  metadata = EXCLUDED.metadata,
  updated_at = NOW();
`;
}

async function main() {
  console.log('🚀 Generate SQL Import Statements');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const files = readdirSync(REFERENCE_DIR).filter(f => f.endsWith('.json') && !f.includes('transformed'));
  
  let allProducts: DigiflazzProduct[] = [];
  
  for (const file of files) {
    const filePath = join(REFERENCE_DIR, file);
    const stats = require('fs').statSync(filePath);
    
    // Skip empty files
    if (stats.size === 0) {
      console.log(`⏭️  ${file}: empty file, skipped`);
      continue;
    }
    
    const content = readFileSync(filePath, 'utf-8');
    
    let products: DigiflazzProduct[];
    try {
      products = JSON.parse(JSON.parse(content));
    } catch {
      try {
        products = JSON.parse(content);
      } catch (e) {
        console.log(`❌ ${file}: invalid JSON, skipped`);
        continue;
      }
    }
    
    // Ensure products is an array
    if (!Array.isArray(products)) {
      console.log(`❌ ${file}: not an array, skipped`);
      continue;
    }
    
    allProducts.push(...products);
    console.log(`✅ ${file}: ${products.length} products`);
  }
  
  console.log(`\n📦 Total products: ${allProducts.toLocaleString()}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // Generate SQL in batches of 500
  const BATCH_SIZE = 500;
  const batches = Math.ceil(allProducts.length / BATCH_SIZE);
  
  console.log(`📝 Generating ${batches} SQL batches...`);
  
  for (let i = 0; i < batches; i++) {
    const start = i * BATCH_SIZE;
    const end = Math.min(start + BATCH_SIZE, allProducts.length);
    const batch = allProducts.slice(start, end);
    
    const sql = generateInsertSQL(batch, i + 1);
    const outputPath = join(REFERENCE_DIR, `import-batch-${String(i + 1).padStart(3, '0')}.sql`);
    
    require('fs').writeFileSync(outputPath, sql, 'utf-8');
    console.log(`   Batch ${i + 1}/${batches}: ${batch.length} products → import-batch-${String(i + 1).padStart(3, '0')}.sql`);
  }
  
  console.log('\n✅ SQL files generated!');
  console.log('\n💡 Next: Execute each SQL file via Supabase MCP');
}

main().catch(console.error);
