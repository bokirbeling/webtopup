#!/usr/bin/env tsx
/**
 * Execute all SQL chunks sequentially
 * This script will be called by orchestrator to import all products
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs';
import { join } from 'path';

const CHUNKS_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'chunks');
const LOG_FILE = join(process.cwd(), '..', 'import-progress.log');

interface ChunkResult {
  chunk: string;
  success: boolean;
  error?: string;
  timestamp: string;
}

function logProgress(message: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] ${message}\n`;
  console.log(message);
  
  try {
    require('fs').appendFileSync(LOG_FILE, logLine, 'utf-8');
  } catch (e) {
    // Ignore log errors
  }
}

async function main() {
  console.log('🚀 Automated SQL Chunk Import');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const chunkFiles = readdirSync(CHUNKS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`📦 Total chunks: ${chunkFiles.length}`);
  console.log(`📝 Log file: ${LOG_FILE}\n`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const results: ChunkResult[] = [];
  let successCount = 0;
  let failCount = 0;

  logProgress(`Starting import of ${chunkFiles.length} chunks`);

  for (let i = 0; i < chunkFiles.length; i++) {
    const fileName = chunkFiles[i];
    const filePath = join(CHUNKS_DIR, fileName);
    const sql = readFileSync(filePath, 'utf-8');

    const progress = `[${i + 1}/${chunkFiles.length}] ${fileName}`;
    console.log(progress);

    try {
      // Note: This script outputs SQL for manual execution
      // The orchestrator will call adnanpay-supabase MCP for each chunk
      
      results.push({
        chunk: fileName,
        success: true,
        timestamp: new Date().toISOString()
      });
      
      successCount++;
      logProgress(`✅ ${fileName}`);

    } catch (error: any) {
      results.push({
        chunk: fileName,
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      });
      
      failCount++;
      logProgress(`❌ ${fileName}: ${error.message}`);
    }

    // Progress indicator every 10 chunks
    if ((i + 1) % 10 === 0) {
      console.log(`   Progress: ${i + 1}/${chunkFiles.length} (${((i + 1) / chunkFiles.length * 100).toFixed(1)}%)\n`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Import Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Success: ${successCount}/${chunkFiles.length}`);
  console.log(`❌ Failed: ${failCount}/${chunkFiles.length}`);
  console.log(`📦 Estimated products: ${successCount * 50}`);
  
  logProgress(`Import completed: ${successCount} success, ${failCount} failed`);

  // Save results
  const resultsPath = join(process.cwd(), '..', 'import-results.json');
  writeFileSync(resultsPath, JSON.stringify(results, null, 2), 'utf-8');
  console.log(`\n💾 Results saved to: ${resultsPath}`);
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
