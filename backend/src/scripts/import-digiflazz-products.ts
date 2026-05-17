#!/usr/bin/env tsx
/**
 * Import Digiflazz products from scraped JSON files to Supabase
 * 
 * Usage:
 *   npm run import-products -- --batch-size=1000 --categories=pulsa,games
 *   npm run import-products -- --dry-run
 */

import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readFileSync, readdirSync, existsSync } from 'fs';
import { join } from 'path';

// Load environment variables
config({ path: join(process.cwd(), '..', '.env') });

type DigiflazzProduct = {
  name: string;
  price: number;
  category: string;
  brand: string;
  type: string;
  desc: string;
  image_url: string;
};

type ProductOperation = {
  sku_digiflazz: string;
  name: string;
  category: string;
  provider: string;
  base_price_minor: number;
  is_active: boolean;
  metadata: Record<string, unknown>;
};

const REFERENCE_DIR = join(process.cwd(), '..', 'digiflazz-product-reference');
const BATCH_SIZE = 500; // Supabase RPC batch limit

// Category mapping to file names
const CATEGORY_FILES: Record<string, string[]> = {
  pulsa: [
    'pulsa-telkomsel.json',
    'pulsa-xl.json',
    'pulsa-indosat.json',
    'pulsa-tri.json',
    'pulsa-smartfren.json',
    'pulsa-axis.json',
    'pulsa-byu.json'
  ],
  data: ['data.json'],
  games: ['games.json'],
  voucher: ['voucher.json'],
  emoney: ['emoney.json'],
  pln: ['pln.json']
};

function generateSKU(product: DigiflazzProduct, index: number): string {
  const brandSlug = product.brand.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const categorySlug = product.category.toLowerCase().replace(/[^a-z0-9]/g, '-');
  const hash = Buffer.from(`${product.name}-${product.price}-${index}`).toString('base64').substring(0, 8).replace(/[+/=]/g, '');
  return `${categorySlug}-${brandSlug}-${hash}`.substring(0, 50);
}

function transformProduct(raw: DigiflazzProduct, index: number): ProductOperation {
  return {
    sku_digiflazz: generateSKU(raw, index),
    name: raw.name.trim(),
    category: raw.category.trim(),
    provider: raw.brand.trim(),
    base_price_minor: Math.round(raw.price * 100), // Convert to minor units (cents)
    is_active: true,
    metadata: {
      type: raw.type,
      description: raw.desc,
      image_url: raw.image_url,
      original_price: raw.price,
      imported_at: new Date().toISOString()
    }
  };
}

async function importProductBatch(
  supabase: ReturnType<typeof createClient>,
  operations: ProductOperation[],
  dryRun: boolean
): Promise<number> {
  if (dryRun) {
    console.log(`[DRY RUN] Would insert ${operations.length} products`);
    return operations.length;
  }

  const { data, error } = await supabase.rpc('admin_bulk_upsert_products', {
    p_operations: operations
  });

  if (error) {
    throw new Error(`Failed to insert batch: ${error.message}`);
  }

  return Array.isArray(data) ? data.length : 0;
}

async function importFromFile(
  supabase: ReturnType<typeof createClient>,
  filePath: string,
  dryRun: boolean,
  limit?: number
): Promise<{ imported: number; skipped: number }> {
  console.log(`\n📂 Processing: ${filePath}`);
  
  if (!existsSync(filePath)) {
    console.log(`⚠️  File not found, skipping`);
    return { imported: 0, skipped: 0 };
  }

  const rawContent = readFileSync(filePath, 'utf-8');
  let rawData = JSON.parse(rawContent);
  
  // Handle double-encoded JSON (string containing JSON)
  if (typeof rawData === 'string') {
    rawData = JSON.parse(rawData);
  }
  
  if (!Array.isArray(rawData)) {
    console.log(`⚠️  Invalid JSON format (not an array), skipping`);
    return { imported: 0, skipped: 0 };
  }
  
  const typedData = rawData as DigiflazzProduct[];
  
  const totalProducts = limit ? Math.min(typedData.length, limit) : typedData.length;
  
  console.log(`   Total products: ${typedData.length.toLocaleString()}`);
  if (limit) {
    console.log(`   Limited to: ${limit.toLocaleString()}`);
  }

  let imported = 0;
  let skipped = 0;

  for (let i = 0; i < totalProducts; i += BATCH_SIZE) {
    const batch = typedData.slice(i, Math.min(i + BATCH_SIZE, totalProducts));
    const operations = batch.map((product, idx) => transformProduct(product, i + idx));

    try {
      const count = await importProductBatch(supabase, operations, dryRun);
      imported += count;
      
      const progress = Math.min(i + BATCH_SIZE, totalProducts);
      const percentage = ((progress / totalProducts) * 100).toFixed(1);
      process.stdout.write(`\r   Progress: ${progress.toLocaleString()}/${totalProducts.toLocaleString()} (${percentage}%)`);
    } catch (error) {
      console.error(`\n   ❌ Error at batch ${i}-${i + BATCH_SIZE}:`, error);
      skipped += batch.length;
    }
  }

  console.log(`\n   ✅ Imported: ${imported.toLocaleString()}`);
  if (skipped > 0) {
    console.log(`   ⚠️  Skipped: ${skipped.toLocaleString()}`);
  }

  return { imported, skipped };
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const batchSizeArg = args.find(arg => arg.startsWith('--batch-size='));
  const categoriesArg = args.find(arg => arg.startsWith('--categories='));
  const limitArg = args.find(arg => arg.startsWith('--limit='));

  const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined;
  const categories = categoriesArg 
    ? categoriesArg.split('=')[1].split(',')
    : Object.keys(CATEGORY_FILES);

  console.log('🚀 Digiflazz Product Import');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE IMPORT'}`);
  console.log(`Categories: ${categories.join(', ')}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  if (limit) {
    console.log(`Limit per file: ${limit.toLocaleString()}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  let totalImported = 0;
  let totalSkipped = 0;

  for (const category of categories) {
    const files = CATEGORY_FILES[category];
    if (!files) {
      console.log(`⚠️  Unknown category: ${category}`);
      continue;
    }

    console.log(`\n📦 Category: ${category.toUpperCase()}`);
    
    for (const file of files) {
      const filePath = join(REFERENCE_DIR, file);
      const result = await importFromFile(supabase, filePath, dryRun, limit);
      totalImported += result.imported;
      totalSkipped += result.skipped;
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Total imported: ${totalImported.toLocaleString()}`);
  if (totalSkipped > 0) {
    console.log(`⚠️  Total skipped: ${totalSkipped.toLocaleString()}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (dryRun) {
    console.log('💡 Run without --dry-run to perform actual import');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
