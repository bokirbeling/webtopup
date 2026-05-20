require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const mysql = require('mysql2/promise');
const ws = require('ws');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in .env');
  process.exit(1);
}

// Pass ws transport to avoid Node 20 Realtime crash
const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    transport: ws
  }
});

async function main() {
  console.log('Connecting to MySQL Database...');
  const mysqlPool = mysql.createPool({
    host: '127.0.0.1', // Local connection on the server
    user: 'ppob',
    password: 'ppob_pass_123',
    database: 'ppob_products',
    waitForConnections: true,
    connectionLimit: 10
  });

  try {
    console.log('Fetching products from Supabase demo_products table...');
    let allProducts = [];
    let hasMore = true;
    let offset = 0;
    const limit = 1000;

    while (hasMore) {
      console.log(`Fetching batch from offset ${offset}...`);
      const { data, error } = await supabase
        .from('demo_products')
        .select('*')
        .range(offset, offset + limit - 1);

      if (error) {
        throw new Error(`Supabase Fetch Error: ${error.message}`);
      }

      if (!data || data.length === 0) {
        hasMore = false;
      } else {
        allProducts = allProducts.concat(data);
        offset += data.length;
        if (data.length < limit) {
          hasMore = false;
        }
      }
    }

    console.log(`Total products fetched from Supabase: ${allProducts.length}`);

    if (allProducts.length === 0) {
      console.log('No products to migrate.');
      return;
    }

    console.log('Migrating to MySQL in batches...');
    const batchSize = 500;
    let migratedCount = 0;

    for (let i = 0; i < allProducts.length; i += batchSize) {
      const batch = allProducts.slice(i, i + batchSize);
      
      const insertQueries = [];
      const values = [];

      for (const product of batch) {
        // Handle metadata image_url
        let imageUrl = '';
        if (product.metadata) {
          try {
            const meta = typeof product.metadata === 'string' ? JSON.parse(product.metadata) : product.metadata;
            imageUrl = meta.image_url || '';
          } catch (e) {
            // Ignore
          }
        }

        // Map model database fields
        values.push([
          product.sku_digiflazz,
          product.name,
          product.category,
          product.provider,
          product.base_price_minor || 0, // modal
          product.base_price_minor || 0, // jual (default same, markup via dynamic formula later)
          product.is_active ? 'active' : 'inactive',
          product.main_category || '',
          product.sub_category || '',
          product.product_type || '',
          imageUrl,
          product.description || '',
          JSON.stringify(product.metadata || {})
        ]);
      }

      const sql = `
        INSERT INTO produk (
          sku_digiflazz, nama, kategori, provider, harga_modal, harga_jual, status, 
          main_category, sub_category, product_type, image_url, deskripsi, metadata
        ) VALUES ? 
        ON DUPLICATE KEY UPDATE 
          nama = VALUES(nama),
          kategori = VALUES(kategori),
          provider = VALUES(provider),
          harga_modal = VALUES(harga_modal),
          harga_jual = VALUES(harga_jual),
          status = VALUES(status),
          main_category = VALUES(main_category),
          sub_category = VALUES(sub_category),
          product_type = VALUES(product_type),
          image_url = VALUES(image_url),
          deskripsi = VALUES(deskripsi),
          metadata = VALUES(metadata)
      `;

      await mysqlPool.query(sql, [values]);
      migratedCount += batch.length;
      console.log(`Migrated batch: ${migratedCount}/${allProducts.length} products...`);
    }

    console.log('\nSuccess! Product migration completed.');
    console.log(`Total Products Migrated: ${migratedCount}`);

  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await mysqlPool.end();
  }
}

main();
