#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Execute all 23 SQL batches via adnanpay-supabase MCP
This script reads each batch and prints SQL for manual MCP execution
"""

import os
import sys
from pathlib import Path

# Set UTF-8 encoding for Windows console
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')

# Find batch directory
script_dir = Path(__file__).parent
batch_dir = script_dir.parent.parent / "digiflazz-product-reference" / "sql-batches-final"

if not batch_dir.exists():
    print(f"ERROR: Directory not found: {batch_dir}")
    exit(1)

# Get all batch files
batch_files = sorted([f for f in batch_dir.glob("batch-*.sql")])

print("SQL BATCHES FOR MCP EXECUTION")
print("=" * 80)
print(f"Total batches: {len(batch_files)}")
print(f"Location: {batch_dir}\n")

# Print only batch 1 in full
batch_file = batch_files[0]
sql = batch_file.read_text(encoding='utf-8')
size_kb = len(sql) / 1024

print(f"BATCH 1/{len(batch_files)}: {batch_file.name}")
print(f"Size: {size_kb:.1f} KB")
print("=" * 80)
print(sql)
print("=" * 80)
print("\nCopy the SQL above and execute via adnanpay-supabase_execute_sql MCP")
