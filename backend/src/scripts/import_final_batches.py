#!/usr/bin/env python3
"""
Import all SQL batches to Supabase database
Usage: python import_final_batches.py <supabase-url> <service-role-key>
"""

import sys
import os
import time
import re
from pathlib import Path
import psycopg2

def main():
    if len(sys.argv) < 3:
        print("❌ Missing arguments")
        print("Usage: python import_final_batches.py <supabase-url> <service-role-key>")
        sys.exit(1)
    
    supabase_url = sys.argv[1]
    service_role_key = sys.argv[2]
    
    # Extract project ref
    match = re.search(r'https://([^.]+)\.supabase\.co', supabase_url)
    if not match:
        print("❌ Invalid Supabase URL")
        sys.exit(1)
    
    project_ref = match.group(1)
    conn_string = f"postgresql://postgres.{project_ref}:{service_role_key}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
    
    # Find SQL batches
    script_dir = Path(__file__).parent
    sql_dir = script_dir.parent.parent / "digiflazz-product-reference" / "sql-batches-final"
    
    if not sql_dir.exists():
        print(f"❌ Directory not found: {sql_dir}")
        sys.exit(1)
    
    batch_files = sorted([f for f in sql_dir.glob("batch-*.sql")])
    
    print("📦 FINAL BATCH IMPORT")
    print("=" * 80)
    print(f"Total batches: {len(batch_files)}")
    print(f"Expected products: 11,229\n")
    
    # Connect
    print("🔌 Connecting to Postgres...")
    try:
        conn = psycopg2.connect(conn_string)
        cur = conn.cursor()
        print("✅ Connected\n")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        sys.exit(1)
    
    # Get initial count
    cur.execute("SELECT COUNT(*) FROM demo_products")
    initial_count = cur.fetchone()[0]
    print(f"📊 Initial count: {initial_count} products\n")
    print("=" * 80)
    
    success = 0
    failed = 0
    
    # Execute each batch
    for i, batch_file in enumerate(batch_files, 1):
        print(f"\n[{i}/{len(batch_files)}] {batch_file.name}")
        
        sql = batch_file.read_text(encoding='utf-8')
        size_kb = len(sql) / 1024
        print(f"   Size: {size_kb:.1f} KB")
        
        try:
            start = time.time()
            cur.execute(sql)
            conn.commit()
            duration = int((time.time() - start) * 1000)
            
            print(f"   ✅ Success ({duration}ms)")
            success += 1
            
            # Progress every 5 batches
            if i % 5 == 0:
                cur.execute("SELECT COUNT(*) FROM demo_products")
                current = cur.fetchone()[0]
                print(f"\n   📊 Progress: {current} products (+{current - initial_count})")
            
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            failed += 1
            conn.rollback()
        
        time.sleep(0.05)
    
    # Final results
    print("\n" + "=" * 80)
    print("\n📊 FINAL RESULTS:")
    print(f"   Success: {success}/{len(batch_files)} batches")
    print(f"   Failed: {failed}/{len(batch_files)} batches")
    
    cur.execute("SELECT COUNT(*) FROM demo_products")
    final_count = cur.fetchone()[0]
    
    print(f"   Final count: {final_count} products")
    print(f"   Added: {final_count - initial_count} products")
    
    # Category breakdown
    cur.execute("""
        SELECT main_category, COUNT(*) as count 
        FROM demo_products 
        GROUP BY main_category 
        ORDER BY count DESC
    """)
    
    print("\n📊 CATEGORY BREAKDOWN:")
    for row in cur.fetchall():
        print(f"   {row[0]}: {row[1]} products")
    
    if final_count >= 11229:
        print("\n✅ IMPORT COMPLETE! All products imported.")
    else:
        print(f"\n⚠️  Expected 11,229 products, got {final_count}")
    
    cur.close()
    conn.close()
    print("\n🔌 Disconnected")

if __name__ == "__main__":
    main()
