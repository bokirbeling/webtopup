#!/usr/bin/env tsx
/**
 * Verify no duplicates in generated SQL batches
 * Checks SKU uniqueness across all batches
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const BATCH_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'structured-batches');

console.log('🔍 DUPLICATE CHECK');
console.log('='.repeat(80));

const batchFiles = readdirSync(BATCH_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`Checking ${batchFiles.length} batch files...\n`);

const allSKUs = new Set<string>();
const duplicateSKUs = new Map<string, number>();
let totalProducts = 0;

for (const file of batchFiles) {
  const content = readFileSync(join(BATCH_DIR, file), 'utf-8');
  
  // Extract SKUs from SQL
  const skuMatches = content.matchAll(/\('([^']+)',/g);
  
  for (const match of skuMatches) {
    const sku = match[1];
    totalProducts++;
    
    if (allSKUs.has(sku)) {
      duplicateSKUs.set(sku, (duplicateSKUs.get(sku) || 1) + 1);
    } else {
      allSKUs.add(sku);
    }
  }
}

console.log('📊 RESULTS:');
console.log(`   Total products: ${totalProducts}`);
console.log(`   Unique SKUs: ${allSKUs.size}`);
console.log(`   Duplicate SKUs: ${duplicateSKUs.size}`);

if (duplicateSKUs.size > 0) {
  console.log('\n⚠️  DUPLICATES FOUND:\n');
  
  const sorted = Array.from(duplicateSKUs.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);
  
  for (const [sku, count] of sorted) {
    console.log(`   ${sku}: ${count} occurrences`);
  }
  
  console.log('\n❌ DUPLICATE CHECK FAILED');
  process.exit(1);
} else {
  console.log('\n✅ NO DUPLICATES FOUND');
  console.log('   All SKUs are unique across all batches');
}

console.log('\n' + '='.repeat(80));
