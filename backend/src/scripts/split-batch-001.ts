#!/usr/bin/env tsx
/**
 * Split large SQL batches into smaller chunks for MCP execution
 * Target: ~50 products per chunk (~12-15 KB)
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';

const BATCH_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'sql-batches-final');
const OUTPUT_DIR = join(process.cwd(), '..', 'digiflazz-product-reference', 'sql-chunks-small');

// Create output directory
mkdirSync(OUTPUT_DIR, { recursive: true });

const batchFile = join(BATCH_DIR, 'batch-001.sql');
const sql = readFileSync(batchFile, 'utf-8');

console.log('📦 SPLITTING BATCH-001 INTO SMALL CHUNKS');
console.log('='.repeat(80));
console.log(`Input: ${batchFile}`);
console.log(`Size: ${(sql.length / 1024).toFixed(1)} KB`);

// Extract VALUES section
const valuesMatch = sql.match(/VALUES\s+([\s\S]+);/);
if (!valuesMatch) {
  console.error('❌ Could not find VALUES section');
  process.exit(1);
}

const valuesSection = valuesMatch[1];
const rows = valuesSection.split(/\),\s*\(/);

console.log(`Total rows: ${rows.length}`);

// Split into chunks of 50 rows
const CHUNK_SIZE = 50;
const chunks: string[][] = [];

for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
  chunks.push(rows.slice(i, i + CHUNK_SIZE));
}

console.log(`Chunks: ${chunks.length} (${CHUNK_SIZE} rows each)`);
console.log('='.repeat(80));

// Generate SQL for each chunk
chunks.forEach((chunk, index) => {
  const chunkNum = (index + 1).toString().padStart(3, '0');
  
  // Fix first and last rows
  let chunkRows = chunk.map((row, i) => {
    if (i === 0 && !row.startsWith('(')) {
      return '(' + row;
    }
    if (i === chunk.length - 1 && !row.endsWith(')')) {
      return row + ')';
    }
    return '(' + row + ')';
  });
  
  const chunkSql = `-- Chunk ${chunkNum} from batch-001
-- Products: ${chunk.length}

INSERT INTO demo_products (
  sku_digiflazz, name, category, provider, 
  base_price_minor, is_active, metadata,
  main_category, sub_category, product_type
)
VALUES
  ${chunkRows.join(',\n  ')}
ON CONFLICT (sku_digiflazz) DO UPDATE SET
  name = EXCLUDED.name,
  category = EXCLUDED.category,
  provider = EXCLUDED.provider,
  base_price_minor = EXCLUDED.base_price_minor,
  is_active = EXCLUDED.is_active,
  metadata = EXCLUDED.metadata,
  main_category = EXCLUDED.main_category,
  sub_category = EXCLUDED.sub_category,
  product_type = EXCLUDED.product_type,
  updated_at = NOW();
`;
  
  const outputFile = join(OUTPUT_DIR, `chunk-${chunkNum}.sql`);
  writeFileSync(outputFile, chunkSql, 'utf-8');
  
  const sizeKB = (chunkSql.length / 1024).toFixed(1);
  console.log(`✅ chunk-${chunkNum}.sql : ${chunk.length} products, ${sizeKB} KB`);
});

console.log('='.repeat(80));
console.log(`\n✅ Split complete!`);
console.log(`📁 Output: ${OUTPUT_DIR}`);
console.log(`📦 Total chunks: ${chunks.length}`);
console.log(`\n🎯 Next: Execute each chunk via adnanpay-supabase MCP`);
