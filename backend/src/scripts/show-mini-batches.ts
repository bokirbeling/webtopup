#!/usr/bin/env tsx
/**
 * Execute mini-batches sequentially via file reading
 * Outputs SQL for manual MCP execution
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const MINI_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'mini-batches');

const batches = readdirSync(MINI_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`📦 Total mini-batches: ${batches.length}`);
console.log(`📊 Current DB: 115 products`);
console.log(`🎯 Target: 11,247 products`);
console.log(`⏳ Remaining: ~11,132 products (~45 batches)\n`);

console.log('Execute batches 1-10 first, then continue with remaining 40 batches.\n');
console.log('='.repeat(80));

for (let i = 0; i < Math.min(10, batches.length); i++) {
  const file = batches[i];
  const path = join(MINI_DIR, file);
  const content = readFileSync(path, 'utf-8');
  const size = (content.length / 1024).toFixed(2);
  const lines = content.split('\n').length;
  
  console.log(`\n${i + 1}. ${file}`);
  console.log(`   Size: ${size} KB | Lines: ${lines}`);
  console.log(`   Path: ${path}`);
}

console.log('\n' + '='.repeat(80));
console.log('\n💡 Strategy: Execute batches 1-10, verify count, then continue.');
console.log('   After each batch: SELECT COUNT(*) FROM demo_products;');
