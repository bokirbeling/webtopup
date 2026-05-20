const fs = require('fs');

// Combine all scraped category files
const categories = [
  { file: 'digiflazz-all-tables.json', category: 'Pulsa', mainCategory: 'Pulsa' },
  { file: 'digiflazz-data-category.json', category: 'Data', mainCategory: 'Data' },
  { file: 'digiflazz-games-category.json', category: 'Games', mainCategory: 'Games' },
  { file: 'digiflazz-voucher-category.json', category: 'Voucher', mainCategory: 'Voucher' },
  { file: 'digiflazz-emoney-category.json', category: 'E-Money', mainCategory: 'E-Money' },
  { file: 'digiflazz-pln-category.json', category: 'PLN', mainCategory: 'PLN' }
];

// Brand mapping by table index (will be updated per category)
const brandMaps = {
  'Pulsa': {
    0: 'TELKOMSEL', 1: 'TELKOMSEL', 2: 'XL', 3: 'INDOSAT', 
    4: 'INDOSAT', 5: 'TRI', 6: 'SMARTFREN', 7: 'BY.U', 8: 'AXIS'
  },
  'Data': {
    0: 'TELKOMSEL', 1: 'TELKOMSEL', 2: 'XL', 3: 'INDOSAT',
    4: 'TRI', 5: 'SMARTFREN', 6: 'AXIS'
  },
  'Games': {
    0: 'Mobile Legends', 1: 'Free Fire', 2: 'PUBG', 3: 'Genshin Impact',
    4: 'Valorant', 5: 'Steam', 6: 'Garena', 7: 'Google Play'
  },
  'Voucher': {
    0: 'Google Play', 1: 'iTunes', 2: 'Steam', 3: 'Garena',
    4: 'Razer Gold', 5: 'PlayStation', 6: 'Xbox'
  },
  'E-Money': {
    0: 'GoPay', 1: 'OVO', 2: 'DANA', 3: 'ShopeePay',
    4: 'LinkAja', 5: 'Sakuku', 6: 'AstraPay'
  },
  'PLN': {
    0: 'PLN', 1: 'PLN'
  }
};

// CSV header
const csvHeaders = 'sku_digiflazz,name,category,provider,base_price_minor,is_active,main_category,sub_category,product_type,image_url,description\n';
let csvContent = csvHeaders;
let totalProducts = 0;

// Escape CSV fields
const escapeCsv = (str) => {
  if (!str) return '';
  str = String(str);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
};

// Process each category
categories.forEach(catInfo => {
  if (!fs.existsSync(catInfo.file)) {
    console.log(`Skipping ${catInfo.category} - file not found`);
    return;
  }

  console.log(`Processing ${catInfo.category}...`);
  
  let rawData = JSON.parse(fs.readFileSync(catInfo.file, 'utf8'));
  
  // Handle double-encoded JSON
  if (typeof rawData === 'string') {
    rawData = JSON.parse(rawData);
  }
  
  if (!Array.isArray(rawData)) {
    console.log(`Skipping ${catInfo.category} - not an array`);
    return;
  }

  const brandMap = brandMaps[catInfo.category] || {};
  
  rawData.forEach((row, index) => {
    const brand = brandMap[row.table] || 'UNKNOWN';
    const nameLines = row.col0.split('\n');
    const productName = nameLines[0]?.trim() || '';
    const productType = nameLines[1]?.trim() || 'Umum';
    
    const priceText = row.col1.replace(/[^0-9]/g, '');
    const price = parseInt(priceText) || 0;
    
    if (productName && price > 0) {
      const sku = `${catInfo.category.toLowerCase()}-${brand.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}-${index}`;
      const imageUrl = `https://cdn.mobilepulsa.net/img/logo/${catInfo.category.toLowerCase()}/small/${brand.toLowerCase().replace(/\s+/g, '-')}.png`;
      
      const csvRow = [
        escapeCsv(sku),
        escapeCsv(productName),
        escapeCsv(catInfo.category),
        escapeCsv(brand),
        escapeCsv(price * 100),
        'true',
        escapeCsv(catInfo.mainCategory),
        escapeCsv(brand),
        escapeCsv(productType),
        escapeCsv(imageUrl),
        escapeCsv(productName)
      ].join(',');
      
      csvContent += csvRow + '\n';
      totalProducts++;
    }
  });
  
  console.log(`  Added ${rawData.length} rows from ${catInfo.category}`);
});

// Write combined CSV
fs.writeFileSync('digiflazz-all-products-combined.csv', csvContent, 'utf8');
console.log(`\nTotal products exported: ${totalProducts}`);
console.log('CSV file created: digiflazz-all-products-combined.csv');
