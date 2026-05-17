#!/usr/bin/env python3
"""
Alternative: Download images directly from MCP query results
No database connection needed - uses hardcoded image URLs from query
"""

import os
import requests
from pathlib import Path
from urllib.parse import urlparse

# Top 50 brands from database query
BRAND_IMAGES = [
    ("TELKOMSEL", "https://cdn.mobilepulsa.net/img/logo/pulsa/small/telkomsel.png", 1740),
    ("INDOSAT", "https://cdn.mobilepulsa.net/img/logo/pulsa/small/indosat.png", 999),
    ("MOBILE LEGENDS", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-a269a45b28813e40483aa8458426e160.jpg", 909),
    ("TRI", "https://cdn.mobilepulsa.net/img/logo/pulsa/small/three.png", 871),
    ("AXIS", "https://cdn.mobilepulsa.net/img/logo/pulsa/small/axis.png", 675),
    ("GO PAY", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-87970d5d27181cd7309e1d622bca7d34.jpg", 576),
    ("XL", "https://cdn.mobilepulsa.net/img/logo/pulsa/small/xl.png", 558),
    ("SMARTFREN", "https://cdn.mobilepulsa.net/img/logo/pulsa/small/smart.png", 396),
    ("FREE FIRE", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-62a3c629509b39288b2e33ddb2429543.jpg", 389),
    ("by.U", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-ff9ca5877c7b6a00afb1b0b8d36356a1.jpg", 257),
    ("PUBG MOBILE", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-1a22904770406f40e44b278ceb52e7e1.jpg", 229),
    ("DANA", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-1ef1e382d32bcbf66adbe985eba27cc0.jpg", 182),
    ("OVO", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-34548a3f5e29638972fd71121c27bd6f.jpg", 125),
    ("SHOPEE PAY", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-08370da2ac80e3c4e7699d643c9051c1.jpg", 124),
    ("MAXIM", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-78a7a83ed57c978a6edb4d7f395f3149.jpg", 116),
    ("Magic Chess", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-616b62e3a7c20cac82f935fdb1559ed8.jpg", 104),
    ("Genshin Impact", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-d6100f745fbd27167a0c43867ca625f6.jpg", 89),
    ("Free Fire Max", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-2c1349dac504881ef1ed2e658f775b07.jpg", 78),
    ("LinkAja", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-8387147fbac7d847721cda344c6d10d6.jpg", 70),
    ("Rainbow Six Mobile", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-f157fe1b7bd918de44044fa99f07a5a9.jpg", 60),
    ("Valorant", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-766b1cdbcd34cae77e002314533a0d1f.jpg", 55),
    ("Zenless Zone Zero", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-ae2c639b2cadaeb729b7c3e62b6b7f31.jpg", 52),
    ("Call of Duty MOBILE", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-1af2bb2bd26b60a87de61675a6faa434.jpg", 51),
    ("GRAB", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-917cc3717e0ba611fa8475daf98d0b52.jpg", 50),
    ("Honkai Star Rail", "https://digiflazz.s3.ap-southeast-1.amazonaws.com/brand/brand-74c40da8c4f9312306390136abef79d3.jpg", 47),
]

def sanitize_filename(provider):
    """Convert provider name to safe filename"""
    safe = provider.lower()
    safe = safe.replace(' ', '-')
    safe = safe.replace('.', '')
    safe = safe.replace('&', 'and')
    safe = ''.join(c for c in safe if c.isalnum() or c == '-')
    return safe

def download_image(url, output_path):
    """Download image from URL"""
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
    output_dir = Path("frontend/public/product-assets/brands")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print("BRAND IMAGE DOWNLOADER (TOP 25 BRANDS)")
    print("=" * 80)
    print(f"Output directory: {output_dir}\n")
    
    success_count = 0
    fail_count = 0
    mapping = {}
    
    for i, (provider, image_url, product_count) in enumerate(BRAND_IMAGES, 1):
        safe_name = sanitize_filename(provider)
        
        # Determine extension
        parsed = urlparse(image_url)
        ext = Path(parsed.path).suffix or '.jpg'
        
        output_file = output_dir / f"{safe_name}{ext}"
        
        print(f"\n[{i}/{len(BRAND_IMAGES)}] {provider}")
        print(f"   Products: {product_count}")
        print(f"   Output: {output_file.name}")
        
        if output_file.exists():
            print(f"   [SKIP] Already exists")
            success_count += 1
            mapping[provider] = f"/product-assets/brands/{output_file.name}"
            continue
        
        if download_image(image_url, output_file):
            print(f"   [OK] Downloaded")
            success_count += 1
            mapping[provider] = f"/product-assets/brands/{output_file.name}"
        else:
            fail_count += 1
    
    # Save mapping
    import json
    mapping_file = output_dir / "brand-mapping.json"
    with open(mapping_file, 'w', encoding='utf-8') as f:
        json.dump(mapping, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 80)
    print(f"\nRESULTS: {success_count} success, {fail_count} failed")
    print(f"Mapping: {mapping_file}")
    
    if success_count == len(BRAND_IMAGES):
        print("\n[SUCCESS] ALL TOP 25 BRANDS DOWNLOADED!")

if __name__ == "__main__":
    main()
