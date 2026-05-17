#!/usr/bin/env node
/**
 * Execute mini-batch via Node.js script that calls MCP
 * This is a workaround since MCP parameter size is limited
 */

const fs = require('fs');
const path = require('path');

const batchNum = process.argv[2] || '001';
const batchFile = `mini-batch-${batchNum}.sql`;
const batchPath = path.join(__dirname, '..', '..', 'digiflazz-product-reference', 'mini-batches', batchFile);

console.log(`📦 Reading ${batchFile}...`);
const sql = fs.readFileSync(batchPath, 'utf-8');
console.log(`✅ Loaded ${sql.length} characters`);

console.log('\n📋 SQL CONTENT (for MCP execution):');
console.log('='.repeat(80));
console.log(sql);
console.log('='.repeat(80));
console.log('\n✅ Copy the SQL above and execute via adnanpay-supabase_execute_sql');
