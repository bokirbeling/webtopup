const fs = require('fs');

// Read scraped data
let rawData = JSON.parse(fs.readFileSync('digiflazz-all-tables.json', 'utf8'));

// Check if data is double-encoded (string containing JSON)
if (typeof rawData === 'string') {
  console.log('Data is double-encoded, parsing again...');
  rawData = JSON.parse(rawData);
}

console.log(`Total rows: ${rawData.length}`);
console.log(`Data type: ${typeof rawData}`);
console.log(`Is array: ${Array.isArray(rawData)}`);

// Brand mapping by table index
const brandMap = {
  0: 'TELKOMSEL',
  1: 'TELKOMSEL',
  2: 'XL',
  3: 'INDOSAT',
  4: 'INDOSAT',
  5: 'TRI',
  6: 'SMARTFREN',
  7: 'BY.U',
  8: 'AXIS'
};

// CSV header matching demo_products table structure
const csvHeaders = 'sku_digiflazz,name,category,provider,base_price_minor,is_active,main_category,sub_category,product_type,image_url,description\n';
let csvContent = csvHeaders;

// Process each row - check if array
if (!Array.isArray(rawData)) {
  console.error('Error: rawData is not an array');
  console.error('Sample data:', JSON.stringify(rawData).substring(0, 200));
  process.exit(1);
}

rawData.forEach((row, index) => {
  const brand = brandMap[row.table] || 'UNKNOWN';
  const nameLines = row.col0.split('\n');
  const productName = nameLines[0]?.trim() || '';
  const productType = nameLines[1]?.trim() || 'Umum';
  
  // Extract price from col1 (Harga Terbaik)
  const priceText = row.col1.replace(/[^0-9]/g, '');
  const price = parseInt(priceText) || 0;
  
  if (productName && price > 0) {
    // Generate SKU matching existing format
    const sku = `pulsa-${brand.toLowerCase()}-${Date.now()}-${index}`;
    
    // Escape CSV fields
    const escapeCsv = (str) => {
      if (!str) return '';
      str = String(str);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };
    
    // Default image URL (can be updated later)
    const imageUrl = 'https://cdn.mobilepulsa.net/img/logo/pulsa/small/' + brand.toLowerCase() + '.png';
    
    const csvRow = [
      escapeCsv(sku),
      escapeCsv(productName),
      escapeCsv('Pulsa'),
      escapeCsv(brand),
      escapeCsv(price * 100), // Convert to minor units (cents)
      'true',
      escapeCsv('Pulsa'),
      escapeCsv(brand),
      escapeCsv(productType),
      escapeCsv(imageUrl),
      escapeCsv(productName)
    ].join(',');
    
    csvContent += csvRow + '\n';
  }
});

// Write CSV file
fs.writeFileSync('digiflazz-products-scraped.csv', csvContent, 'utf8');
console.log('CSV file created: digiflazz-products-scraped.csv');
console.log('Total products exported:', csvContent.split('\n').length - 2);
