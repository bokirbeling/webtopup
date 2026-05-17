#!/usr/bin/env tsx
/**
 * Import all batches directly via Node.js Supabase client
 * This bypasses MCP and executes SQL directly
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load .env from parent directory
config({ path: join(process.cwd(), '..', '.env') });

const REFERENCE_DIR = join(process.cwd(), '..', 'digiflazz-product-reference');

async function main() {
  console.log('🚀 Direct Supabase SQL Import');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  console.log(`📡 Connecting to: ${supabaseUrl}`);

  const supabase = createClient(supabaseUrl, supabaseKey);

  const sqlFiles = readdirSync(REFERENCE_DIR)
    .filter(f => f.startsWith('import-batch-') && f.endsWith('.sql'))
    .sort();

  console.log(`📦 Found ${sqlFiles.length} SQL batch files\n`);

  let successCount = 0;
  let totalInserted = 0;

  for (let i = 0; i < sqlFiles.length; i++) {
    const fileName = sqlFiles[i];
    const filePath = join(REFERENCE_DIR, fileName);
    const sql = readFileSync(filePath, 'utf-8');

    console.log(`\n📄 Batch ${i + 1}/${sqlFiles.length}: ${fileName}`);
    console.log(`   Size: ${(sql.length / 1024).toFixed(2)} KB`);

    try {
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

      if (error) {
        console.error(`   ❌ Error:`, error.message);
        continue;
      }

      successCount++;
      console.log(`   ✅ Success`);

      // Estimate inserted count (500 per batch except last)
      const estimatedCount = i === sqlFiles.length - 1 ? 247 : 500;
      totalInserted += estimatedCount;

    } catch (error: any) {
      console.error(`   ❌ Exception:`, error.message);
    }

    // Small delay between batches
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Successful batches: ${successCount}/${sqlFiles.length}`);
  console.log(`📦 Estimated products inserted: ${totalInserted.toLocaleString()}`);

  // Verify final count
  const { data: countData } = await supabase
    .from('demo_products')
    .select('*', { count: 'exact', head: true });

  console.log(`\n🔍 Verification:`);
  console.log(`   Database total: ${countData?.length || 'unknown'} products`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
