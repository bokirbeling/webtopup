const fs = require('fs');

// Fungsi untuk escape CSV field
function escapeCSV(field) {
  if (field === null || field === undefined) return '';
  const str = String(field);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// Baca file JSON dari digiflazz-product-reference
const files = [
  'digiflazz-product-reference/games.json',
  'digiflazz-product-reference/data.json',
  'digiflazz-product-reference/voucher.json',
  'digiflazz-product-reference/e-money.json',
  'digiflazz-product-reference/pulsa.json',
  'digiflazz-product-reference/pln.json'
];

const allProducts = [];

// Load semua file
files.forEach(file => {
  try {
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (data.data && Array.isArray(data.data)) {
      allProducts.push(...data.data);
    }
  } catch (err) {
    console.error('Error reading ' + file + ':', err.message);
  }
});

console.log('Total products loaded:', allProducts.length);

// CSV Header
const headers = [
  'sku_digiflazz',
  'name',
  'category',
  'provider',
  'base_price_minor',
  'is_active',
  'main_category',
  'sub_category',
  'product_type',
  'image_url',
  'description'
];

let csv = headers.join(',') + '\n';

// Convert products to CSV
allProducts.forEach(product => {
  const row = [
    escapeCSV(product.buyer_sku_code),
    escapeCSV(product.product_name),
    escapeCSV(product.category),
    escapeCSV(product.brand),
    escapeCSV(Math.round(product.price * 100)), // Convert to minor units
    escapeCSV(product.buyer_product_status ? 'true' : 'false'),
    escapeCSV(product.category),
    escapeCSV(product.brand),
    escapeCSV(product.product_type || 'Umum'),
    escapeCSV(product.image_url || ''),
    escapeCSV(product.desc || product.product_name)
  ];
  csv += row.join(',') + '\n';
});

// Write CSV file
fs.writeFileSync('digiflazz-products-all.csv', csv, 'utf8');
console.log('CSV file created: digiflazz-products-all.csv');
console.log('Total rows:', allProducts.length);
