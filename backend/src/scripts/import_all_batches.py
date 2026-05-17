#!/usr/bin/env python3
"""
Execute all 50 mini-batches to Supabase via psycopg2
Usage: python import_all_batches.py <supabase-url> <service-role-key>
Example: python import_all_batches.py https://xxx.supabase.co eyJhbG...
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
        print("Usage: python import_all_batches.py <supabase-url> <service-role-key>")
        print("Example: python import_all_batches.py https://xxx.supabase.co eyJhbG...")
        sys.exit(1)
    
    supabase_url = sys.argv[1]
    service_role_key = sys.argv[2]
    
    # Extract project ref from URL
    match = re.search(r'https://([^.]+)\.supabase\.co', supabase_url)
    if not match:
        print("❌ Invalid Supabase URL format")
        sys.exit(1)
    
    project_ref = match.group(1)
    
    # Build connection string
    conn_string = f"postgresql://postgres.{project_ref}:{service_role_key}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
    
    # Find mini-batch directory
    script_dir = Path(__file__).parent
    mini_dir = script_dir.parent.parent / "digiflazz-product-reference" / "mini-batches"
    
    if not mini_dir.exists():
        print(f"❌ Directory not found: {mini_dir}")
        sys.exit(1)
    
    # Get all batch files
    batch_files = sorted([f for f in mini_dir.glob("mini-batch-*.sql")])
    
    print("📦 BATCH IMPORT EXECUTION")
    print("=" * 80)
    print(f"Total batches: {len(batch_files)}")
    print(f"Target: 11,247 products\n")
    
    # Connect to database
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
    
    success_count = 0
    fail_count = 0
    
    # Execute each batch
    for i, batch_file in enumerate(batch_files, 1):
        print(f"\n[{i}/{len(batch_files)}] {batch_file.name}")
        
        # Read SQL file
        sql = batch_file.read_text(encoding='utf-8')
        size_kb = len(sql) / 1024
        print(f"   Size: {size_kb:.1f} KB")
        
        try:
            start_time = time.time()
            cur.execute(sql)
            conn.commit()
            duration_ms = int((time.time() - start_time) * 1000)
            
            print(f"   ✅ Success ({duration_ms}ms)")
            success_count += 1
            
            # Show progress every 10 batches
            if i % 10 == 0:
                cur.execute("SELECT COUNT(*) FROM demo_products")
                current_count = cur.fetchone()[0]
                added = current_count - initial_count
                print(f"\n   📊 Progress: {current_count} products (+{added})")
            
        except Exception as e:
            print(f"   ❌ Failed: {e}")
            fail_count += 1
            conn.rollback()
        
        # Small delay to avoid overwhelming the server
        time.sleep(0.1)
    
    # Final results
    print("\n" + "=" * 80)
    print("\n📊 FINAL RESULTS:")
    print(f"   Success: {success_count}/{len(batch_files)} batches")
    print(f"   Failed: {fail_count}/{len(batch_files)} batches")
    
    cur.execute("SELECT COUNT(*) FROM demo_products")
    final_count = cur.fetchone()[0]
    added = final_count - initial_count
    
    print(f"   Final count: {final_count} products")
    print(f"   Added: {added} products")
    
    if final_count >= 11247:
        print("\n✅ IMPORT COMPLETE! All products imported.")
    else:
        print(f"\n⚠️  Expected 11,247 products, got {final_count}")
    
    # Cleanup
    cur.close()
    conn.close()
    print("\n🔌 Disconnected")

if __name__ == "__main__":
    main()
