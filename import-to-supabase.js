import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const supabaseUrl = 'https://wprbrqmimwwukrhuawms.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndwcmJycW1pbXd3dWtyaHVhd21zIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3Njc2NTg3MywiZXhwIjoyMDkyMzQxODczfQ.ttx6S4Yr9p0KXl-eZ9Gg5IgAC8X0qRqadOiCYx1uOFc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function importProducts() {
  console.log('Reading CSV file...');
  const csvContent = fs.readFileSync('digiflazz-all-products-combined.csv', 'utf-8');
  const records = parse(csvContent, {
    columns: true,
    skip_empty_lines: true
  });

  console.log(`Total products to import: ${records.length}`);

  const batchSize = 500;
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    
    const products = batch.map(row => ({
      sku_digiflazz: row.sku_digiflazz,
      name: row.name,
      category: row.category,
      provider: row.provider,
      base_price_minor: parseInt(row.base_price_minor),
      is_active: row.is_active === 'true',
      main_category: row.main_category,
      sub_category: row.sub_category,
      product_type: row.product_type,
      metadata: {
        image_url: row.image_url,
        description: row.description
      }
    }));

    console.log(`Importing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(records.length / batchSize)} (${products.length} products)...`);

    const { data, error } = await supabase
      .from('demo_products')
      .insert(products);

    if (error) {
      console.error(`Error in batch ${Math.floor(i / batchSize) + 1}:`, error.message);
      errors += products.length;
    } else {
      imported += products.length;
      console.log(`✓ Batch ${Math.floor(i / batchSize) + 1} imported successfully`);
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n=== Import Summary ===');
  console.log(`Total products: ${records.length}`);
  console.log(`Successfully imported: ${imported}`);
  console.log(`Errors: ${errors}`);

  // Verify count
  const { count } = await supabase
    .from('demo_products')
    .select('*', { count: 'exact', head: true });

  console.log(`Database count: ${count}`);
}

importProducts().catch(console.error);
