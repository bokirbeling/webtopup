#!/usr/bin/env python3
"""
Execute all 23 SQL batches via adnanpay-supabase MCP
This script reads each batch and prints SQL for manual MCP execution
"""

import os
from pathlib import Path

# Find batch directory
script_dir = Path(__file__).parent
batch_dir = script_dir.parent.parent / "digiflazz-product-reference" / "sql-batches-final"

if not batch_dir.exists():
    print(f"❌ Directory not found: {batch_dir}")
    exit(1)

# Get all batch files
batch_files = sorted([f for f in batch_dir.glob("batch-*.sql")])

print("📦 SQL BATCHES FOR MCP EXECUTION")
print("=" * 80)
print(f"Total batches: {len(batch_files)}")
print(f"Location: {batch_dir}\n")

print("INSTRUCTIONS:")
print("For each batch below, execute via adnanpay-supabase_execute_sql MCP tool")
print("Copy the SQL content and pass as 'query' parameter\n")
print("=" * 80)

for i, batch_file in enumerate(batch_files, 1):
    sql = batch_file.read_text(encoding='utf-8')
    size_kb = len(sql) / 1024
    
    print(f"\n{'='*80}")
    print(f"BATCH {i}/{len(batch_files)}: {batch_file.name}")
    print(f"Size: {size_kb:.1f} KB")
    print(f"Path: {batch_file}")
    print('='*80)
    
    # Print first 1000 chars as preview
    print("\nPREVIEW (first 1000 chars):")
    print(sql[:1000])
    print("\n... (truncated)")
    
    if i == 1:
        print("\n⚠️  FULL SQL FOR BATCH 1:")
        print("="*80)
        print(sql)
        print("="*80)
        print("\n✅ Copy the SQL above and execute via MCP")
        print("After success, continue with batch 2-23\n")
        break  # Only print first batch in full

print("\n" + "="*80)
print("📝 NEXT STEPS:")
print("1. Copy SQL from BATCH 1 above")
print("2. Execute via: adnanpay-supabase_execute_sql(query=<sql>)")
print("3. Verify count: SELECT COUNT(*) FROM demo_products; (should be 500)")
print("4. Continue with batches 2-23")
print("5. Final count should be 11,229 products")
