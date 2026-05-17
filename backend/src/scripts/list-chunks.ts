#!/usr/bin/env tsx
/**
 * Simple chunk executor - outputs chunk list for manual MCP execution
 * Since we don't have .env, we'll use MCP directly
 */

import { readdirSync } from 'fs';
import { join } from 'path';

const CHUNKS_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'chunks');

const chunkFiles = readdirSync(CHUNKS_DIR)
  .filter(f => f.endsWith('.sql'))
  .sort();

console.log(`📦 Total chunks: ${chunkFiles.length}`);
console.log(`📊 Estimated products: ${chunkFiles.length * 50}\n`);

console.log('Chunk list for batch execution:\n');
chunkFiles.forEach((file, i) => {
  console.log(`${i + 1}. ${file}`);
});

console.log(`\n✅ Execute via: adnanpay-supabase_execute_sql`);
console.log(`📝 Progress check: SELECT COUNT(*) FROM demo_products;`);
