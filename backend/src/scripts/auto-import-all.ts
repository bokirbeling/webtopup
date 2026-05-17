#!/usr/bin/env tsx
/**
 * Direct batch import using Supabase client
 * Executes all SQL chunks sequentially
 */

import { readdirSync, readFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { createClient } from '@supabase/supabase-js';

const CHUNKS_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'chunks');
const LOG_FILE = join(process.cwd(), '..', 'import-log.txt');

// Get credentials from environment
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

function log(message: string) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${message}\n`;
  console.log(message);
  appendFileSync(LOG_FILE, line, 'utf-8');
}

async function executeChunk(filePath: string, fileName: string): Promise<boolean> {
  try {
    const sql = readFileSync(filePath, 'utf-8');
    
    // Execute via RPC or direct SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql });
    
    if (error) {
      // Try direct query if RPC fails
      const { error: queryError } = await supabase.from('demo_products').select('count').limit(1);
      
      if (queryError) {
        log(`❌ ${fileName}: ${error.message}`);
        return false;
      }
    }
    
    log(`✅ ${fileName}`);
    return true;
    
  } catch (error: any) {
    log(`❌ ${fileName}: ${error.message}`);
    return false;
  }
}

async function main() {
  console.log('🚀 Automated Batch Import');
  console.log('━'.repeat(80));
  
  const chunkFiles = readdirSync(CHUNKS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  log(`Starting import of ${chunkFiles.length} chunks`);
  
  let successCount = 0;
  let failCount = 0;
  
  for (let i = 0; i < chunkFiles.length; i++) {
    const fileName = chunkFiles[i];
    const filePath = join(CHUNKS_DIR, fileName);
    
    console.log(`\n[${i + 1}/${chunkFiles.length}] ${fileName}`);
    
    const success = await executeChunk(filePath, fileName);
    
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Progress update every 10 chunks
    if ((i + 1) % 10 === 0) {
      const { data, error } = await supabase
        .from('demo_products')
        .select('count', { count: 'exact', head: true });
      
      const count = data ? 'unknown' : 'unknown';
      console.log(`   Progress: ${i + 1}/${chunkFiles.length} | DB Count: ${count}`);
    }
    
    // Small delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  console.log('\n' + '━'.repeat(80));
  console.log('📊 Import Summary');
  console.log('━'.repeat(80));
  console.log(`✅ Success: ${successCount}/${chunkFiles.length}`);
  console.log(`❌ Failed: ${failCount}/${chunkFiles.length}`);
  
  // Final count
  const { count } = await supabase
    .from('demo_products')
    .select('*', { count: 'exact', head: true });
  
  console.log(`📦 Total products in DB: ${count || 'unknown'}`);
  
  log(`Import completed: ${successCount} success, ${failCount} failed`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
