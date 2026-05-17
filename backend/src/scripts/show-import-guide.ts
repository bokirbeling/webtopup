#!/usr/bin/env tsx
/**
 * Execute all 50 mini-batches via adnanpay-supabase MCP
 * This script reads each SQL file and outputs the content for manual MCP execution
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const MINI_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'mini-batches');

const batches = readdirSync(MINI_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log('📦 MINI-BATCH IMPORT GUIDE');
console.log('='.repeat(80));
console.log(`Total batches: ${batches.length}`);
console.log(`Current DB: 115 products`);
console.log(`Target: 11,247 products\n`);

console.log('EXECUTION METHOD:');
console.log('For each batch below, execute via adnanpay-supabase_execute_sql MCP tool\n');
console.log('='.repeat(80));

// Show first 5 batches with file paths
for (let i = 0; i < Math.min(5, batches.length); i++) {
  const file = batches[i];
  const path = join(MINI_DIR, file);
  const sql = readFileSync(path, 'utf-8');
  const size = (sql.length / 1024).toFixed(1);
  
  console.log(`\n${i + 1}. ${file} (${size} KB)`);
  console.log(`   Path: ${path}`);
  console.log(`   Products: ~250`);
}

console.log('\n' + '='.repeat(80));
console.log('\nREMAINING BATCHES: 6-50 (follow same pattern)');
console.log('\nTo execute batch N:');
console.log('1. Read file: digiflazz-product-reference/mini-batches/mini-batch-NNN.sql');
console.log('2. Execute via: adnanpay-supabase_execute_sql');
console.log('3. Verify count: SELECT COUNT(*) FROM demo_products;');
console.log('\nExpected final count: 11,247 products');
