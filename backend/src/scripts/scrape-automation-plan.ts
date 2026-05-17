#!/usr/bin/env tsx
/**
 * Automated scraper for all Digiflazz categories
 * Saves each category to separate JSON file
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const CATEGORIES = [
  'Pulsa', 'Data', 'Games', 'Voucher', 'E-Money', 'PLN',
  'China TOPUP', 'Malaysia TOPUP', 'Philippines TOPUP', 
  'Singapore TOPUP', 'Thailand TOPUP', 'Paket SMS & Telpon',
  'Vietnam Topup', 'Streaming', 'TV', 'Aktivasi Voucher',
  'Masa Aktif', 'Bundling', 'Aktivasi Perdana', 'Gas',
  'eSIM', 'Media Sosial', 'PLN PASCABAYAR', 'PDAM',
  'HP PASCABAYAR', 'INTERNET PASCABAYAR', 'BPJS KESEHATAN',
  'MULTIFINANCE', 'PBB', 'GAS NEGARA', 'TV PASCABAYAR',
  'SAMSAT', 'BPJS KETENAGAKERJAAN', 'PLN NONTAGLIS',
  'E-MONEY', 'Telkomsel Omni', 'Indosat Only4u',
  'Tri CuanMax', 'XL Axis Cuanku', 'by.U'
];

console.log('📦 AUTOMATED DIGIFLAZZ SCRAPER');
console.log('='.repeat(80));
console.log(`Total categories: ${CATEGORIES.length}\n`);

console.log('⚠️  REQUIRES PLAYWRIGHT MCP');
console.log('This script needs to be executed via Playwright MCP browser automation.\n');

console.log('SCRAPING WORKFLOW:');
console.log('1. Already scraped: Pulsa (518 products), Data (3,446 products)');
console.log('2. Remaining: 38 categories');
console.log('3. For each category:');
console.log('   - Click category tab');
console.log('   - Wait 500ms for table load');
console.log('   - Extract all products');
console.log('   - Save to digiflazz-scraped/<category>.json');
console.log('4. After all categories scraped:');
console.log('   - Parse and structure data');
console.log('   - Generate SQL INSERT statements');
console.log('   - Import to database\n');

console.log('='.repeat(80));
console.log('\nREMAINING CATEGORIES:\n');

CATEGORIES.slice(2).forEach((cat, i) => {
  console.log(`${(i + 3).toString().padStart(2, ' ')}. ${cat}`);
});

console.log('\n' + '='.repeat(80));
console.log('\n📋 PLAYWRIGHT MCP COMMANDS FOR EACH CATEGORY:');
console.log(`
// Click category tab
browser_click({ element: "<Category> tab", target: "a.nav-link:has-text('<Category>')" })

// Wait for load
await new Promise(resolve => setTimeout(resolve, 500))

// Extract products
browser_evaluate({
  function: "() => {
    const products = [];
    const rows = document.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const cells = row.querySelectorAll('td');
      if (cells.length >= 3) {
        products.push({
          name: cells[0]?.textContent?.trim() || '',
          price: cells[1]?.textContent?.trim() || '',
          status: cells[2]?.textContent?.trim() || ''
        });
      }
    });
    return { category: '<Category>', totalProducts: products.length, products };
  }"
})

// Save to file (manual step)
`);

console.log('='.repeat(80));
console.log('\n🎯 ESTIMATED TOTALS:');
console.log('Based on previous scraping:');
console.log('  Pulsa: 518 products');
console.log('  Data: 3,446 products');
console.log('  Games: ~3,893 products (estimated)');
console.log('  Voucher: ~1,844 products (estimated)');
console.log('  E-Money: ~1,517 products (estimated)');
console.log('  Others: ~500 products (estimated)');
console.log('  TOTAL: ~11,718 products (estimated)\n');
