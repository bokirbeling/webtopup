#!/usr/bin/env tsx
/**
 * Execute all 50 mini-batches sequentially
 * Usage: npx tsx execute-all-batches.ts <supabase-url> <service-role-key>
 * Example: npx tsx execute-all-batches.ts https://xxx.supabase.co eyJhbG...
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { Client } from 'pg';

const supabaseUrl = process.argv[2];
const serviceRoleKey = process.argv[3];

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing arguments');
  console.error('Usage: npx tsx execute-all-batches.ts <supabase-url> <service-role-key>');
  console.error('Example: npx tsx execute-all-batches.ts https://xxx.supabase.co eyJhbG...');
  process.exit(1);
}

const MINI_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'mini-batches');
const batches = readdirSync(MINI_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log('📦 BATCH IMPORT EXECUTION');
console.log('='.repeat(80));
console.log(`Total batches: ${batches.length}`);
console.log(`Target: 11,247 products\n`);

// Extract project ref from URL
const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
if (!projectRef) {
  console.error('❌ Invalid Supabase URL format');
  process.exit(1);
}

const connectionString = `postgresql://postgres.${projectRef}:${serviceRoleKey}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;

const executeBatch = async (client: Client, batchFile: string, index: number) => {
  const batchPath = join(MINI_DIR, batchFile);
  const sql = readFileSync(batchPath, 'utf-8');
  
  console.log(`\n[${index + 1}/${batches.length}] ${batchFile}`);
  console.log(`   Size: ${(sql.length / 1024).toFixed(1)} KB`);
  
  try {
    const startTime = Date.now();
    await client.query(sql);
    const duration = Date.now() - startTime;
    
    console.log(`   ✅ Success (${duration}ms)`);
    return true;
  } catch (err: any) {
    console.error(`   ❌ Failed: ${err.message}`);
    return false;
  }
};

const getCount = async (client: Client): Promise<number> => {
  const result = await client.query('SELECT COUNT(*) as count FROM demo_products');
  return parseInt(result.rows[0].count);
};

(async () => {
  const client = new Client({ connectionString });
  
  try {
    console.log('🔌 Connecting to Postgres...');
    await client.connect();
    console.log('✅ Connected\n');
    
    const initialCount = await getCount(client);
    console.log(`📊 Initial count: ${initialCount} products\n`);
    console.log('='.repeat(80));
    
    let successCount = 0;
    let failCount = 0;
    
    for (let i = 0; i < batches.length; i++) {
      const success = await executeBatch(client, batches[i], i);
      
      if (success) {
        successCount++;
        
        // Show progress every 10 batches
        if ((i + 1) % 10 === 0) {
          const currentCount = await getCount(client);
          console.log(`\n   📊 Progress: ${currentCount} products (+${currentCount - initialCount})`);
        }
      } else {
        failCount++;
      }
      
      // Small delay to avoid overwhelming the server
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('\n' + '='.repeat(80));
    console.log('\n📊 FINAL RESULTS:');
    console.log(`   Success: ${successCount}/${batches.length} batches`);
    console.log(`   Failed: ${failCount}/${batches.length} batches`);
    
    const finalCount = await getCount(client);
    console.log(`   Final count: ${finalCount} products`);
    console.log(`   Added: ${finalCount - initialCount} products`);
    
    if (finalCount >= 11247) {
      console.log('\n✅ IMPORT COMPLETE! All products imported.');
    } else {
      console.log(`\n⚠️  Expected 11,247 products, got ${finalCount}`);
    }
    
  } catch (err) {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Disconnected');
  }
})();
