#!/usr/bin/env tsx
/**
 * Scrape all products from Digiflazz website with proper category structure
 * Uses Playwright MCP for browser automation
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

// Categories from Digiflazz website
const CATEGORIES = [
  // Prabayar
  'Pulsa',
  'Data',
  'Games',
  'Voucher',
  'E-Money',
  'PLN',
  'China TOPUP',
  'Malaysia TOPUP',
  'Philippines TOPUP',
  'Singapore TOPUP',
  'Thailand TOPUP',
  'Paket SMS & Telpon',
  'Vietnam Topup',
  'Streaming',
  'TV',
  'Aktivasi Voucher',
  'Masa Aktif',
  'Bundling',
  'Aktivasi Perdana',
  'Gas',
  'eSIM',
  'Media Sosial',
  // Pascabayar
  'PLN PASCABAYAR',
  'PDAM',
  'HP PASCABAYAR',
  'INTERNET PASCABAYAR',
  'BPJS KESEHATAN',
  'MULTIFINANCE',
  'PBB',
  'GAS NEGARA',
  'TV PASCABAYAR',
  'SAMSAT',
  'BPJS KETENAGAKERJAAN',
  'PLN NONTAGLIS',
  'E-MONEY',
  // Special
  'Telkomsel Omni',
  'Indosat Only4u',
  'Tri CuanMax',
  'XL Axis Cuanku',
  'by.U'
];

interface Product {
  category: string;
  name: string;
  price: string;
  status: string;
  brand?: string;
  type?: string;
}

console.log('📦 DIGIFLAZZ PRODUCT SCRAPER');
console.log('='.repeat(80));
console.log(`Total categories: ${CATEGORIES.length}\n`);

console.log('⚠️  MANUAL EXECUTION REQUIRED');
console.log('This script requires Playwright MCP browser automation.\n');

console.log('STEPS:');
console.log('1. Navigate to https://id.digiflazz.com/daftar-harga');
console.log('2. For each category, click the tab and scrape products');
console.log('3. Extract: name, price, status, brand, type');
console.log('4. Save to JSON files by category\n');

console.log('='.repeat(80));
console.log('\nCATEGORY LIST:\n');

CATEGORIES.forEach((cat, i) => {
  console.log(`${(i + 1).toString().padStart(2, ' ')}. ${cat}`);
});

console.log('\n' + '='.repeat(80));
console.log('\n📋 SCRAPING LOGIC:');
console.log(`
For each category:
1. Click category tab: document.querySelector('a.nav-link').click()
2. Wait for table to load
3. Extract products from table rows:
   - Name: td[0].textContent
   - Price: td[1].textContent (convert to number)
   - Status: td[2].textContent
4. Parse name to extract:
   - Brand: First word (Telkomsel, XL, Free Fire, etc)
   - Type: Words after brand (Reguler, Flash, Mini, etc)
5. Save to: digiflazz-scraped/<category>.json
`);

console.log('='.repeat(80));
console.log('\n📝 OUTPUT FORMAT:');
console.log(`
{
  "category": "Pulsa",
  "products": [
    {
      "name": "Telkomsel 5.000 Reguler",
      "price": 5000,
      "brand": "Telkomsel",
      "type": "Reguler",
      "status": "available"
    }
  ]
}
`);

console.log('='.repeat(80));
console.log('\n🚀 NEXT STEPS:');
console.log('1. Use Playwright MCP to automate scraping');
console.log('2. Click each category tab sequentially');
console.log('3. Extract all products from visible table');
console.log('4. Save to JSON files');
console.log('5. Generate SQL INSERT statements');
console.log('6. Import to database\n');
