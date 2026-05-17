#!/usr/bin/env tsx
/**
 * Convert all products to CSV format for Supabase upload
 * Output: Single CSV file with all 11,229 products
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';

const REF_DIR = join(process.cwd(), '..', 'digiflazz-product-reference');

const files = [
  'pulsa-telkomsel.json', 'pulsa-xl.json', 'pulsa-indosat.json', 
  'pulsa-tri.json', 'pulsa-smartfren.json', 'pulsa-axis.json', 'pulsa-byu.json',
  'data.json', 'games.json', 'voucher.json', 'emoney.json', 'pln.json'
];

interface Product {
  name: string;
  price: number;
  category: string;
  brand: string;
  type: string;
  desc: string;
  image_url: string;
}

const categoryMap: Record<string, string> = {
  'Pulsa': 'Pulsa',
  'Data': 'Paket Data',
  'Games': 'Games',
  'Voucher': 'Voucher',
  'E-Money': 'E-Money',
  'PLN': 'PLN'
};

console.log('📦 GENERATING CSV FROM JSON FILES');
console.log('='.repeat(80));

const csvRows: string[] = [];

// CSV Header
csvRows.push('sku_digiflazz,name,category,provider,base_price_minor,is_active,metadata,main_category,sub_category,product_type');

let totalProducts = 0;

files.forEach(file => {
  const path = join(REF_DIR, file);
  try {
    const content = readFileSync(path, 'utf-8');
    const products: Product[] = JSON.parse(JSON.parse(content));
    
    products.forEach(p => {
      // Generate SKU
      const skuBase = `${p.category.toLowerCase()}-${p.brand.toLowerCase()}-${p.name}`;
      const hash = createHash('md5').update(skuBase).digest('hex').substring(0, 8);
      const sku = `${p.category.toLowerCase()}-${p.brand.toLowerCase()}-${hash}`;
      
      // Escape CSV values
      const escapeCsv = (val: string) => {
        if (!val) return '';
        // Replace quotes with double quotes and wrap in quotes if contains comma/quote/newline
        if (val.includes(',') || val.includes('"') || val.includes('\n')) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      };
      
      const name = escapeCsv(p.name);
      const desc = escapeCsv(p.desc || '');
      const metadata = escapeCsv(JSON.stringify({
        type: p.type,
        description: p.desc,
        image_url: p.image_url
      }));
      
      const priceMinor = Math.round(p.price * 100);
      const mainCategory = categoryMap[p.category] || p.category;
      const subCategory = p.brand;
      const productType = p.type;
      
      csvRows.push([
        sku,
        name,
        p.category,
        p.brand,
        priceMinor,
        'true',
        metadata,
        mainCategory,
        subCategory,
        productType
      ].join(','));
      
      totalProducts++;
    });
    
    console.log(`✅ ${file.padEnd(25)} : ${products.length} products`);
  } catch (err: any) {
    console.log(`❌ ${file.padEnd(25)} : ERROR - ${err.message}`);
  }
});

console.log('='.repeat(80));
console.log(`Total products: ${totalProducts}`);

// Write CSV file
const csvContent = csvRows.join('\n');
const outputPath = join(REF_DIR, 'all-products.csv');
writeFileSync(outputPath, csvContent, 'utf-8');

const sizeMB = (csvContent.length / 1024 / 1024).toFixed(2);
console.log(`\n✅ CSV generated!`);
console.log(`📁 Output: ${outputPath}`);
console.log(`📊 Size: ${sizeMB} MB`);
console.log(`📦 Products: ${totalProducts}`);
console.log(`\n🎯 Next: Upload this CSV to Supabase via dashboard`);
