#!/usr/bin/env tsx
/**
 * Split large SQL batches into smaller chunks for MCP execution
 * MCP has size limits, so we split 500-row batches into 50-row chunks
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';

const REFERENCE_DIR = join(process.cwd(), '..', 'digiflazz-product-reference');
const CHUNK_SIZE = 50; // rows per chunk

function splitSQLBatch(sql: string, batchNum: number): string[] {
  const lines = sql.split('\n');
  const headerEndIndex = lines.findIndex(line => line.trim() === 'VALUES');
  
  if (headerEndIndex === -1) {
    throw new Error('Invalid SQL format: VALUES not found');
  }

  const header = lines.slice(0, headerEndIndex + 1).join('\n');
  const footer = lines.slice(-4).join('\n'); // ON CONFLICT clause
  
  // Extract value rows (between VALUES and ON CONFLICT)
  const valueLines = lines.slice(headerEndIndex + 1, lines.length - 4)
    .filter(line => line.trim().length > 0);

  const chunks: string[] = [];
  
  for (let i = 0; i < valueLines.length; i += CHUNK_SIZE) {
    const chunkLines = valueLines.slice(i, i + CHUNK_SIZE);
    
    // Remove trailing comma from last line
    const lastLineIndex = chunkLines.length - 1;
    chunkLines[lastLineIndex] = chunkLines[lastLineIndex].replace(/,\s*$/, '');
    
    const chunkSQL = `-- Batch ${batchNum} Chunk ${Math.floor(i / CHUNK_SIZE) + 1}\n${header}\n${chunkLines.join('\n')}\n${footer}`;
    chunks.push(chunkSQL);
  }

  return chunks;
}

async function main() {
  console.log('✂️  SQL Batch Splitter');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const sqlFiles = readdirSync(REFERENCE_DIR)
    .filter(f => f.startsWith('import-batch-') && f.endsWith('.sql'))
    .sort();

  console.log(`Found ${sqlFiles.length} SQL batch files`);
  console.log(`Chunk size: ${CHUNK_SIZE} rows\n`);

  let totalChunks = 0;

  for (let i = 0; i < sqlFiles.length; i++) {
    const fileName = sqlFiles[i];
    const filePath = join(REFERENCE_DIR, fileName);
    const sql = readFileSync(filePath, 'utf-8');

    console.log(`\n📄 Processing: ${fileName}`);

    try {
      const chunks = splitSQLBatch(sql, i + 1);
      console.log(`   Split into ${chunks.length} chunks`);

      // Save chunks
      for (let j = 0; j < chunks.length; j++) {
        const chunkFileName = `import-batch-${String(i + 1).padStart(3, '0')}-chunk-${String(j + 1).padStart(3, '0')}.sql`;
        const chunkPath = join(REFERENCE_DIR, 'chunks', chunkFileName);
        
        // Create chunks directory if not exists
        const chunksDir = join(REFERENCE_DIR, 'chunks');
        if (!require('fs').existsSync(chunksDir)) {
          require('fs').mkdirSync(chunksDir, { recursive: true });
        }

        writeFileSync(chunkPath, chunks[j], 'utf-8');
      }

      totalChunks += chunks.length;
      console.log(`   ✅ Saved ${chunks.length} chunk files`);

    } catch (error: any) {
      console.error(`   ❌ Error:`, error.message);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Total chunks created: ${totalChunks}`);
  console.log(`📁 Output directory: ${join(REFERENCE_DIR, 'chunks')}`);
  console.log('\n💡 Each chunk can now be executed via MCP');
}

main().catch(console.error);
