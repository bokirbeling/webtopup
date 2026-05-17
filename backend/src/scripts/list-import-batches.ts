#!/usr/bin/env tsx
/**
 * Import batches one by one via manual execution
 * Reads SQL files and outputs them for manual copy-paste to Supabase SQL Editor
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const REFERENCE_DIR = join(process.cwd(), '..', 'digiflazz-product-reference');

async function main() {
  console.log('📋 SQL Batch Files Ready for Manual Import');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  const sqlFiles = readdirSync(REFERENCE_DIR)
    .filter(f => f.startsWith('import-batch-') && f.endsWith('.sql'))
    .sort();

  console.log(`Found ${sqlFiles.length} SQL batch files\n`);
  console.log('Instructions:');
  console.log('1. Open Supabase SQL Editor');
  console.log('2. Copy each SQL file content');
  console.log('3. Execute in SQL Editor');
  console.log('4. Verify count after each batch\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  for (let i = 0; i < sqlFiles.length; i++) {
    const fileName = sqlFiles[i];
    const filePath = join(REFERENCE_DIR, fileName);
    const sql = readFileSync(filePath, 'utf-8');
    const lines = sql.split('\n').length;
    const size = (sql.length / 1024).toFixed(2);

    console.log(`${i + 1}. ${fileName}`);
    console.log(`   Lines: ${lines}, Size: ${size} KB`);
    console.log(`   Path: ${filePath}\n`);
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('Verification Query:');
  console.log('SELECT COUNT(*) as total, category, COUNT(*) as count');
  console.log('FROM demo_products');
  console.log('GROUP BY category');
  console.log('ORDER BY count DESC;');
}

main().catch(console.error);
