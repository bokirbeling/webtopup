#!/usr/bin/env tsx
/**
 * Execute all 23 batches via Node.js script
 * Reads each SQL file and outputs for manual MCP execution
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const BATCH_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'sql-batches-final');

const batches = readdirSync(BATCH_DIR)
  .filter(f => f.startsWith('batch-') && f.endsWith('.sql'))
  .sort();

console.log('📦 EXECUTING ALL BATCHES');
console.log('='.repeat(80));
console.log(`Total batches: ${batches.length}\n`);

// For each batch, output the SQL
for (let i = 0; i < batches.length; i++) {
  const file = batches[i];
  const path = join(BATCH_DIR, file);
  const sql = readFileSync(path, 'utf-8');
  
  console.log(`\n${'='.repeat(80)}`);
  console.log(`BATCH ${i + 1}/${batches.length}: ${file}`);
  console.log(`Size: ${(sql.length / 1024).toFixed(1)} KB`);
  console.log('='.repeat(80));
  console.log(sql);
  console.log('\n');
}

console.log('='.repeat(80));
console.log('✅ All batches printed');
console.log('Copy each SQL block and execute via adnanpay-supabase_execute_sql');
