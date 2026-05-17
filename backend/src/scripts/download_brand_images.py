#!/usr/bin/env python3
"""
Download all unique brand images from database and save to local assets
Usage: python download_brand_images.py
"""

import os
import sys
import json
import requests
from pathlib import Path
from urllib.parse import urlparse
import psycopg2

def get_unique_images(conn_string):
    """Get all unique brand images from database"""
    conn = psycopg2.connect(conn_string)
    cur = conn.cursor()
    
    query = """
    SELECT DISTINCT 
      provider,
      metadata->>'image_url' as image_url,
      COUNT(*) as product_count
    FROM demo_products 
    WHERE metadata->>'image_url' IS NOT NULL
    GROUP BY provider, metadata->>'image_url'
    ORDER BY product_count DESC;
    """
    
    cur.execute(query)
    results = cur.fetchall()
    
    cur.close()
    conn.close()
    
    return results

def sanitize_filename(provider):
    """Convert provider name to safe filename"""
    # Remove special characters, replace spaces with hyphens
    safe = provider.lower()
    safe = safe.replace(' ', '-')
    safe = safe.replace('.', '')
    safe = safe.replace('&', 'and')
    safe = ''.join(c for c in safe if c.isalnum() or c == '-')
    return safe

def download_image(url, output_path):
    """Download image from URL and save to output_path"""
    try:
        response = requests.get(url, timeout=10)
        response.raise_for_status()
        
        with open(output_path, 'wb') as f:
            f.write(response.content)
        
        return True
    except Exception as e:
        print(f"   ❌ Failed: {e}")
        return False

def main():
    if len(sys.argv) < 3:
        print("❌ Missing arguments")
        print("Usage: python download_brand_images.py <supabase-url> <service-role-key>")
        print("Example: python download_brand_images.py https://xxx.supabase.co eyJhbG...")
        sys.exit(1)
    
    supabase_url = sys.argv[1]
    service_role_key = sys.argv[2]
    
    # Extract project ref
    import re
    match = re.search(r'https://([^.]+)\.supabase\.co', supabase_url)
    if not match:
        print("❌ Invalid Supabase URL format")
        sys.exit(1)
    
    project_ref = match.group(1)
    conn_string = f"postgresql://postgres.{project_ref}:{service_role_key}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"
    
    # Create output directory
    output_dir = Path("frontend/public/product-assets/brands")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("📦 BRAND IMAGE DOWNLOADER")
    print("=" * 80)
    print(f"Output directory: {output_dir}\n")
    
    # Get unique images
    print("🔍 Fetching unique brand images from database...")
    images = get_unique_images(conn_string)
    print(f"✅ Found {len(images)} unique brand images\n")
    print("=" * 80)
    
    # Download each image
    success_count = 0
    fail_count = 0
    mapping = {}
    
    for i, (provider, image_url, product_count) in enumerate(images, 1):
        safe_name = sanitize_filename(provider)
        
        # Determine file extension from URL
        parsed = urlparse(image_url)
        ext = Path(parsed.path).suffix or '.jpg'
        
        output_file = output_dir / f"{safe_name}{ext}"
        
        print(f"\n[{i}/{len(images)}] {provider}")
        print(f"   Products: {product_count}")
        print(f"   URL: {image_url}")
        print(f"   Output: {output_file.name}")
        
        if output_file.exists():
            print(f"   ⏭️  Already exists, skipping")
            success_count += 1
            mapping[provider] = f"/product-assets/brands/{output_file.name}"
            continue
        
        if download_image(image_url, output_file):
            print(f"   ✅ Downloaded")
            success_count += 1
            mapping[provider] = f"/product-assets/brands/{output_file.name}"
        else:
            fail_count += 1
    
    # Save mapping to JSON
    mapping_file = output_dir / "brand-mapping.json"
    with open(mapping_file, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 80)
    print("\n📊 DOWNLOAD RESULTS:")
    print(f"   Success: {success_count}/{len(images)} images")
    print(f"   Failed: {fail_count}/{len(images)} images")
    print(f"   Mapping saved to: {mapping_file}")
    
    if success_count == len(images):
        print("\n✅ ALL IMAGES DOWNLOADED SUCCESSFULLY!")
    else:
        print(f"\n⚠️  {fail_count} images failed to download")
    
    print("\n📝 Next steps:")
    print("1. Update frontend code to use local images: /product-assets/brands/{brand}.jpg")
    print("2. Use brand-mapping.json for provider → image path mapping")

if __name__ == "__main__":
    main()
