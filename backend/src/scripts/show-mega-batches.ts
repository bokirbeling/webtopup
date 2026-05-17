#!/usr/bin/env tsx
/**
 * Execute mega-batches one by one via console output
 * User will manually execute via MCP
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const MEGA_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'mega-batches');

const batches = readdirSync(MEGA_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`📦 Total mega-batches: ${batches.length}\n`);
console.log('Execute each batch via: adnanpay-supabase_execute_sql\n');
console.log('Progress check: SELECT COUNT(*) FROM demo_products;\n');
console.log('='.repeat(80));

batches.forEach((file, i) => {
  const path = join(MEGA_DIR, file);
  const size = (readFileSync(path, 'utf-8').length / 1024).toFixed(2);
  console.log(`${i + 1}. ${file} (${size} KB)`);
});

console.log('\n' + '='.repeat(80));
console.log('Current DB count: 115 products');
console.log('Target: 11,247 products');
console.log('Remaining: 11,132 products (~22 batches)');
