#!/usr/bin/env tsx
/**
 * Automated batch import loop
 * Reads all SQL chunks and outputs them for MCP execution
 */

import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const CHUNKS_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'chunks');

async function main() {
  const chunkFiles = readdirSync(CHUNKS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  console.log(`Total chunks: ${chunkFiles.length}\n`);
  console.log('='.repeat(80));
  console.log('BATCH IMPORT INSTRUCTIONS');
  console.log('='.repeat(80));
  console.log('\nFor each chunk below, execute via adnanpay-supabase MCP:\n');

  for (let i = 0; i < chunkFiles.length; i++) {
    const fileName = chunkFiles[i];
    const filePath = join(CHUNKS_DIR, fileName);
    
    console.log(`\n[${i + 1}/${chunkFiles.length}] ${fileName}`);
    console.log('-'.repeat(80));
    console.log(`File: ${filePath}`);
    console.log(`Size: ${(readFileSync(filePath, 'utf-8').length / 1024).toFixed(2)} KB`);
    
    if (i < 5) {
      console.log('\nSQL Preview:');
      const sql = readFileSync(filePath, 'utf-8');
      const lines = sql.split('\n').slice(0, 10);
      lines.forEach(line => console.log(`  ${line}`));
      console.log('  ...');
    }
  }

  console.log('\n' + '='.repeat(80));
  console.log('EXECUTION PLAN');
  console.log('='.repeat(80));
  console.log(`\n1. Execute chunks 1-10 manually to verify`);
  console.log(`2. If successful, continue with remaining ${chunkFiles.length - 10} chunks`);
  console.log(`3. Estimated products: ${chunkFiles.length * 50} (~11,247 total)`);
  console.log(`4. Check progress: SELECT COUNT(*) FROM demo_products;\n`);
}

main().catch(console.error);
