#!/usr/bin/env tsx
/**
 * Create smaller batches (5 chunks each) for MCP size limits
 */

import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const CHUNKS_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'chunks');
const OUTPUT_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'mini-batches');

try {
  mkdirSync(OUTPUT_DIR, { recursive: true });
} catch (e) {}

const chunkFiles = readdirSync(CHUNKS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`📦 Total chunks: ${chunkFiles.length}`);
console.log(`🔄 Creating mini-batches (5 chunks each)...\n`);

const CHUNKS_PER_BATCH = 5;
let miniBatchCount = 0;

for (let i = 0; i < chunkFiles.length; i += CHUNKS_PER_BATCH) {
  const batchChunks = chunkFiles.slice(i, i + CHUNKS_PER_BATCH);
  const miniBatchNum = Math.floor(i / CHUNKS_PER_BATCH) + 1;
  
  let combinedSQL = `-- Mini Batch ${miniBatchNum}\n`;
  combinedSQL += `-- Chunks: ${batchChunks[0]} to ${batchChunks[batchChunks.length - 1]}\n`;
  combinedSQL += `-- Products: ~${batchChunks.length * 50}\n\n`;
  
  for (const chunkFile of batchChunks) {
    const chunkPath = join(CHUNKS_DIR, chunkFile);
    const chunkSQL = readFileSync(chunkPath, 'utf-8');
    
    const cleanSQL = chunkSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');
    
    combinedSQL += cleanSQL + '\n\n';
  }
  
  const outputFile = join(OUTPUT_DIR, `mini-batch-${String(miniBatchNum).padStart(3, '0')}.sql`);
  writeFileSync(outputFile, combinedSQL, 'utf-8');
  
  miniBatchCount++;
  const sizeKB = (combinedSQL.length / 1024).toFixed(2);
  console.log(`✅ Mini Batch ${miniBatchNum}: ${batchChunks.length} chunks (${sizeKB} KB)`);
}

console.log(`\n📊 Summary:`);
console.log(`   Total mini-batches: ${miniBatchCount}`);
console.log(`   Average size: ~65 KB per batch`);
console.log(`   Estimated products: ${chunkFiles.length * 50}`);
console.log(`\n💡 This reduces ${chunkFiles.length} calls to ${miniBatchCount} calls (${((1 - miniBatchCount / chunkFiles.length) * 100).toFixed(1)}% reduction)`);
