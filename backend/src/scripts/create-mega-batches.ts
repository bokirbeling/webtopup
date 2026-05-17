#!/usr/bin/env tsx
/**
 * Merge multiple chunks into larger batches for faster execution
 * Combines 10 chunks per mega-batch to reduce MCP calls
 */

import { readdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const CHUNKS_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'chunks');
const OUTPUT_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'mega-batches');

// Create output directory
import { mkdirSync } from 'fs';
try {
  mkdirSync(OUTPUT_DIR, { recursive: true });
} catch (e) {}

const chunkFiles = readdirSync(CHUNKS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`📦 Total chunks: ${chunkFiles.length}`);
console.log(`🔄 Creating mega-batches (10 chunks each)...\n`);

const CHUNKS_PER_BATCH = 10;
let megaBatchCount = 0;

for (let i = 0; i < chunkFiles.length; i += CHUNKS_PER_BATCH) {
  const batchChunks = chunkFiles.slice(i, i + CHUNKS_PER_BATCH);
  const megaBatchNum = Math.floor(i / CHUNKS_PER_BATCH) + 1;
  
  let combinedSQL = `-- Mega Batch ${megaBatchNum}\n`;
  combinedSQL += `-- Chunks: ${batchChunks[0]} to ${batchChunks[batchChunks.length - 1]}\n`;
  combinedSQL += `-- Products: ~${batchChunks.length * 50}\n\n`;
  
  for (const chunkFile of batchChunks) {
    const chunkPath = join(CHUNKS_DIR, chunkFile);
    const chunkSQL = readFileSync(chunkPath, 'utf-8');
    
    // Remove comment lines and add to combined SQL
    const cleanSQL = chunkSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    combinedSQL += cleanSQL + '\n\n';
  }
  
  const outputFile = join(OUTPUT_DIR, `mega-batch-${String(megaBatchNum).padStart(3, '0')}.sql`);
  writeFileSync(outputFile, combinedSQL, 'utf-8');
  
  megaBatchCount++;
  console.log(`✅ Mega Batch ${megaBatchNum}: ${batchChunks.length} chunks (${(combinedSQL.length / 1024).toFixed(2)} KB)`);
}

console.log(`\n📊 Summary:`);
console.log(`   Total mega-batches: ${megaBatchCount}`);
console.log(`   Average chunks per batch: ${(chunkFiles.length / megaBatchCount).toFixed(1)}`);
console.log(`   Estimated products: ${chunkFiles.length * 50}`);
console.log(`\n💡 Execute mega-batches via adnanpay-supabase MCP`);
console.log(`   This reduces ${chunkFiles.length} calls to ${megaBatchCount} calls (${((1 - megaBatchCount / chunkFiles.length) * 100).toFixed(1)}% reduction)`);
