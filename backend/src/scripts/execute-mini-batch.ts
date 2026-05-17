#!/usr/bin/env tsx
/**
 * Execute a single mini-batch SQL file to Supabase
 * Usage: npx tsx execute-mini-batch.ts <batch-number> <supabase-url> <service-role-key>
 * Example: npx tsx execute-mini-batch.ts 1 https://xxx.supabase.co eyJhbG...
 */

import { readFileSync } from 'fs';
import { join } from 'path';

const batchNum = process.argv[2];
const supabaseUrl = process.argv[3];
const serviceRoleKey = process.argv[4];

if (!batchNum || !supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing arguments');
  console.error('Usage: npx tsx execute-mini-batch.ts <batch-number> <supabase-url> <service-role-key>');
  console.error('Example: npx tsx execute-mini-batch.ts 1 https://xxx.supabase.co eyJhbG...');
  process.exit(1);
}

const batchFile = `mini-batch-${batchNum.padStart(3, '0')}.sql`;
const batchPath = join(process.cwd(), '..', 'digiflazz-product-reference', 'mini-batches', batchFile);

console.log(`📦 Executing ${batchFile}...`);
console.log(`📍 Path: ${batchPath}`);

let sql: string;
try {
  sql = readFileSync(batchPath, 'utf-8');
  console.log(`✅ Loaded SQL (${sql.length} chars)`);
} catch (err) {
  console.error(`❌ Failed to read file: ${err}`);
  process.exit(1);
}

// Execute via Supabase REST API
const executeSQL = async () => {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': serviceRoleKey,
      'Authorization': `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`HTTP ${response.status}: ${error}`);
  }

  return response.json();
};

// Alternative: Direct postgres connection
const executeSQLDirect = async () => {
  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, serviceRoleKey);
  
  const { data, error } = await supabase.rpc('exec_sql', { query: sql });
  
  if (error) throw error;
  return data;
};

// Try direct SQL execution via postgres wire protocol
const executeSQLPostgres = async () => {
  // Extract project ref from URL
  const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  if (!projectRef) throw new Error('Invalid Supabase URL format');

  const connectionString = `postgresql://postgres.${projectRef}:${serviceRoleKey}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
  
  const { Client } = await import('pg');
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('✅ Connected to Postgres');
    
    const result = await client.query(sql);
    console.log(`✅ Executed successfully`);
    console.log(`   Rows affected: ${result.rowCount}`);
    
    return result;
  } finally {
    await client.end();
  }
};

// Execute
(async () => {
  try {
    console.log('🚀 Executing SQL...');
    const result = await executeSQLPostgres();
    console.log('✅ Success!');
    
    // Verify count
    const { Client } = await import('pg');
    const projectRef = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
    const connectionString = `postgresql://postgres.${projectRef}:${serviceRoleKey}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`;
    const client = new Client({ connectionString });
    
    await client.connect();
    const countResult = await client.query('SELECT COUNT(*) as count FROM demo_products');
    await client.end();
    
    console.log(`📊 Current product count: ${countResult.rows[0].count}`);
    
  } catch (err) {
    console.error('❌ Execution failed:', err);
    process.exit(1);
  }
})();
