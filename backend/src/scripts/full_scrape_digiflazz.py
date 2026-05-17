#!/usr/bin/env python3
"""
Full scraping Digiflazz - All Prabayar & Pascabayar categories
Output: CSV file ready for Supabase import
"""

from playwright.sync_api import sync_playwright
import json
import csv
import time
import hashlib
from pathlib import Path

# Kategori Prabayar
PRABAYAR_CATEGORIES = [
    "Pulsa", "Data", "Games", "Voucher", "E-Money", "PLN",
    "China TOPUP", "Malaysia TOPUP", "Philippines TOPUP", 
    "Singapore TOPUP", "Thailand TOPUP", "Paket SMS & Telpon",
    "Vietnam Topup", "Streaming", "TV", "Aktivasi Voucher",
    "Masa Aktif", "Bundling", "Aktivasi Perdana", "Gas", 
    "eSIM", "Media Sosial"
]

# Kategori Pascabayar
PASCABAYAR_CATEGORIES = [
    "PLN PASCABAYAR", "PDAM", "HP PASCABAYAR", "INTERNET PASCABAYAR",
    "BPJS KESEHATAN", "MULTIFINANCE", "PBB", "GAS NEGARA",
    "TV PASCABAYAR", "SAMSAT", "BPJS KETENAGAKERJAAN", "PLN NONTAGLIS",
    "E-MONEY", "Telkomsel Omni", "Indosat Only4u", "Tri CuanMax",
    "XL Axis Cuanku", "by.U"
]

def generate_sku(category, name):
    """Generate unique SKU from category and name"""
    text = f"{category}-{name}".lower()
    hash_obj = hashlib.md5(text.encode())
    return f"{category.lower().replace(' ', '-')}-{hash_obj.hexdigest()[:8]}"

def extract_brand_from_name(name, category):
    """Extract brand/operator from product name"""
    name_lower = name.lower()
    
    # Pulsa/Data brands
    if 'telkomsel' in name_lower:
        return 'TELKOMSEL'
    elif 'xl' in name_lower or 'axis' in name_lower:
        return 'XL' if 'xl' in name_lower else 'AXIS'
    elif 'indosat' in name_lower or 'im3' in name_lower:
        return 'INDOSAT'
    elif 'tri' in name_lower or '3' in name_lower:
        return 'TRI'
    elif 'smartfren' in name_lower:
        return 'SMARTFREN'
    elif 'by.u' in name_lower or 'byu' in name_lower:
        return 'BY.U'
    
    # E-Money brands
    elif 'gopay' in name_lower or 'go pay' in name_lower:
        return 'GO PAY'
    elif 'dana' in name_lower:
        return 'DANA'
    elif 'ovo' in name_lower:
        return 'OVO'
    elif 'shopee' in name_lower:
        return 'SHOPEE PAY'
    elif 'linkaja' in name_lower:
        return 'LINKAJA'
    
    # Games brands
    elif 'mobile legends' in name_lower or 'ml' in name_lower:
        return 'MOBILE LEGENDS'
    elif 'free fire' in name_lower or 'ff' in name_lower:
        return 'FREE FIRE'
    elif 'pubg' in name_lower:
        return 'PUBG MOBILE'
    elif 'genshin' in name_lower:
        return 'GENSHIN IMPACT'
    elif 'valorant' in name_lower:
        return 'VALORANT'
    
    # Default: use category as brand
    return category.upper()

def parse_price(price_str):
    """Convert price string to minor units (cents)"""
    # Remove "Rp.", spaces, dots
    clean = price_str.replace('Rp.', '').replace(' ', '').replace('.', '').strip()
    try:
        return int(clean) * 100  # Convert to cents
    except:
        return 0

def scrape_category(page, category_name, main_category_type):
    """Scrape products from a category"""
    print(f"\n📦 Scraping: {category_name}")
    
    try:
        # Click category tab
        page.click(f"text={category_name}", timeout=10000)
        time.sleep(2)
        
        # Scrape products
        products = page.evaluate("""
            () => {
                const products = [];
                const tables = document.querySelectorAll('table');
                
                tables.forEach(table => {
                    const rows = table.querySelectorAll('tbody tr');
                    rows.forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length >= 2) {
                            const nameCell = cells[0];
                            const priceCell = cells[1];
                            const img = nameCell.querySelector('img');
                            const name = nameCell.textContent.trim();
                            const price = priceCell.textContent.trim();
                            
                            if (name && price && price !== '-') {
                                products.push({
                                    name: name,
                                    price: price,
                                    image: img ? img.src : ''
                                });
                            }
                        }
                    });
                });
                
                return products;
            }
        """)
        
        print(f"   ✅ Found {len(products)} products")
        
        # Process products
        processed = []
        for p in products:
            brand = extract_brand_from_name(p['name'], category_name)
            sku = generate_sku(category_name, p['name'])
            
            processed.append({
                'sku_digiflazz': sku,
                'name': p['name'],
                'category': category_name,
                'provider': brand,
                'base_price_minor': parse_price(p['price']),
                'is_active': True,
                'metadata': json.dumps({
                    'type': 'Umum',
                    'description': p['name'],
                    'image_url': p['image']
                }),
                'main_category': category_name,
                'sub_category': brand,
                'product_type': 'Umum'
            })
        
        return processed
        
    except Exception as e:
        print(f"   ❌ Error: {e}")
        return []

def main():
    print("🚀 FULL DIGIFLAZZ SCRAPING")
    print("=" * 80)
    
    all_products = []
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        page = browser.new_page()
        
        # Navigate to page
        print("\n🌐 Opening https://id.digiflazz.com/daftar-harga")
        page.goto("https://id.digiflazz.com/daftar-harga")
        time.sleep(3)
        
        # Scrape Prabayar
        print("\n" + "=" * 80)
        print("📋 PRABAYAR CATEGORIES")
        print("=" * 80)
        
        for category in PRABAYAR_CATEGORIES:
            products = scrape_category(page, category, "Prabayar")
            all_products.extend(products)
            time.sleep(1)
        
        # Scrape Pascabayar
        print("\n" + "=" * 80)
        print("📋 PASCABAYAR CATEGORIES")
        print("=" * 80)
        
        for category in PASCABAYAR_CATEGORIES:
            products = scrape_category(page, category, "Pascabayar")
            all_products.extend(products)
            time.sleep(1)
        
        browser.close()
    
    # Generate CSV
    print("\n" + "=" * 80)
    print("📝 GENERATING CSV")
    print("=" * 80)
    
    output_file = Path("digiflazz-full-products.csv")
    
    with open(output_file, 'w', newline='', encoding='utf-8') as f:
        if all_products:
            writer = csv.DictWriter(f, fieldnames=all_products[0].keys())
            writer.writeheader()
            writer.writerows(all_products)
    
    print(f"\n✅ CSV generated: {output_file}")
    print(f"📊 Total products: {len(all_products)}")
    
    # Category breakdown
    categories = {}
    for p in all_products:
        cat = p['main_category']
        categories[cat] = categories.get(cat, 0) + 1
    
    print("\n📊 CATEGORY BREAKDOWN:")
    for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        print(f"   {cat}: {count} products")
    
    print("\n✅ SCRAPING COMPLETE!")
    print(f"📁 Output: {output_file.absolute()}")

if __name__ == "__main__":
    main()
