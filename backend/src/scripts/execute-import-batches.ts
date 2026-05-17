#!/usr/bin/env tsx
/**
 * Execute all SQL import batches via Supabase
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const REFERENCE_DIR = join(process.cwd(), '..', 'digiflazz-product-reference');

async function executeSQLFile(filePath: string, batchNum: number): Promise<boolean> {
  try {
    const sql = readFileSync(filePath, 'utf-8');
    
    // Note: This script generates the SQL commands to be executed manually
    // via Supabase MCP or SQL editor
    
    console.log(`\n📄 Batch ${batchNum}: ${filePath}`);
    console.log(`   SQL size: ${(sql.length / 1024).toFixed(2)} KB`);
    
    return true;
  } catch (error) {
    console.error(`   ❌ Error reading batch ${batchNum}:`, error);
    return false;
  }
}

async function main() {
  console.log('🚀 SQL Import Executor');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const sqlFiles = readdirSync(REFERENCE_DIR)
    .filter(f => f.startsWith('import-batch-') && f.endsWith('.sql'))
    .sort();

  console.log(`Found ${sqlFiles.length} SQL batch files\n`);

  let successCount = 0;
  
  for (let i = 0; i < sqlFiles.length; i++) {
    const filePath = join(REFERENCE_DIR, sqlFiles[i]);
    const success = await executeSQLFile(filePath, i + 1);
    if (success) successCount++;
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Processed: ${successCount}/${sqlFiles.length} batches`);
  console.log('\n💡 Execute each SQL file via:');
  console.log('   - Supabase SQL Editor');
  console.log('   - adnanpay-supabase MCP execute_sql');
  console.log('   - psql command line');
}

main().catch(console.error);
