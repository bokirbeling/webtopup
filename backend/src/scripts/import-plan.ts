#!/usr/bin/env tsx
/**
 * Generate executable import commands for user
 * Outputs ready-to-use MCP commands
 */

import { readdirSync } from 'fs';
import { join } from 'path';

const MINI_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'mini-batches');

const batches = readdirSync(MINI_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log('📦 IMPORT EXECUTION PLAN');
console.log('='.repeat(80));
console.log(`\nTotal batches: ${batches.length}`);
console.log(`Current DB: 115 products`);
console.log(`Target: 11,247 products\n`);

console.log('STRATEGY:');
console.log('1. Execute batches 1-10 (2,500 products)');
console.log('2. Verify count: SELECT COUNT(*) FROM demo_products;');
console.log('3. Continue with remaining 40 batches');
console.log('4. Final verification\n');

console.log('='.repeat(80));
console.log('\nBATCH LIST (First 10):');
console.log('='.repeat(80));

for (let i = 0; i < Math.min(10, batches.length); i++) {
  const file = batches[i];
  const path = join(MINI_DIR, file).replace(/\\/g, '/');
  console.log(`\n${i + 1}. ${file}`);
  console.log(`   Read file: ${path}`);
  console.log(`   Execute via: adnanpay-supabase_execute_sql`);
}

console.log('\n' + '='.repeat(80));
console.log('\n📝 MANUAL EXECUTION STEPS:');
console.log('1. Read mini-batch file content');
console.log('2. Execute SQL via adnanpay-supabase MCP');
console.log('3. Check count after each batch');
console.log('4. Continue to next batch\n');

console.log('Expected progress:');
console.log('  Batch 1-10:  115 → 2,615 products');
console.log('  Batch 11-20: 2,615 → 5,115 products');
console.log('  Batch 21-30: 5,115 → 7,615 products');
console.log('  Batch 31-40: 7,615 → 10,115 products');
console.log('  Batch 41-50: 10,115 → 11,247 products (DONE)');
