#!/usr/bin/env tsx
/**
 * Execute all SQL chunks via loop
 * This will be called by the orchestrator to import all products
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const CHUNKS_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'chunks');

export function getAllChunks(): { path: string; sql: string; name: string }[] {
  const chunkFiles = readdirSync(CHUNKS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  return chunkFiles.map(fileName => ({
    name: fileName,
    path: join(CHUNKS_DIR, fileName),
    sql: readFileSync(join(CHUNKS_DIR, fileName), 'utf-8')
  }));
}

async function main() {
  const chunks = getAllChunks();
  
  console.log('📦 SQL Chunks Ready for Import');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Total chunks: ${chunks.length}`);
  console.log(`Estimated products: ${chunks.length * 50}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  console.log('First 10 chunks:');
  chunks.slice(0, 10).forEach((chunk, i) => {
    console.log(`${i + 1}. ${chunk.name} (${(chunk.sql.length / 1024).toFixed(2)} KB)`);
  });
  
  console.log('\n💡 Use adnanpay-supabase MCP execute_sql to import each chunk');
}

if (require.main === module) {
  main().catch(console.error);
}
