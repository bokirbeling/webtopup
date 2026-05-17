#!/usr/bin/env tsx
/**
 * Count products in all JSON files and check for duplicates
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const REF_DIR = join(process.cwd(), '..', 'digiflazz-product-reference');

const files = [
  'pulsa-telkomsel.json', 'pulsa-xl.json', 'pulsa-indosat.json', 
  'pulsa-tri.json', 'pulsa-smartfren.json', 'pulsa-axis.json', 'pulsa-byu.json',
  'data.json', 'games.json', 'voucher.json', 'emoney.json', 'pln.json'
];

console.log('📊 PRODUCT COUNT ANALYSIS');
console.log('='.repeat(80));

let totalProducts = 0;
const allSkus = new Set<string>();
const categoryCounts: Record<string, number> = {};

files.forEach(file => {
  const path = join(REF_DIR, file);
  try {
    const content = readFileSync(path, 'utf-8');
    const parsed = JSON.parse(JSON.parse(content)); // Double parse
    const count = parsed.length;
    totalProducts += count;
    
    // Collect SKUs for duplicate check
    parsed.forEach((p: any) => {
      if (p.buyer_sku_code) {
        allSkus.add(p.buyer_sku_code);
      }
    });
    
    const category = file.replace('.json', '');
    categoryCounts[category] = count;
    
    const line = `${file.padEnd(25)} : ${count.toString().padStart(5)} products`;
    console.log(line);
  } catch (err: any) {
    console.log(`${file.padEnd(25)} : ERROR - ${err.message}`);
  }
});

console.log('='.repeat(80));
console.log(`Total products: ${totalProducts}`);
console.log(`Unique SKUs: ${allSkus.size}`);
console.log(`Duplicates: ${totalProducts - allSkus.size}`);

console.log('\n📊 CATEGORY BREAKDOWN:');
console.log('='.repeat(80));

Object.entries(categoryCounts)
  .sort((a, b) => b[1] - a[1])
  .forEach(([cat, count]) => {
    const pct = ((count / totalProducts) * 100).toFixed(1);
    console.log(`${cat.padEnd(25)} : ${count.toString().padStart(5)} (${pct}%)`);
  });

console.log('\n✅ Analysis complete');
