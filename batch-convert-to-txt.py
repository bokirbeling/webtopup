#!/usr/bin/env python3
"""
Scrape all Digiflazz products by category and operator
Save to TXT files in scraped-txt/
"""
import json
import os
from pathlib import Path

def convert_json_to_txt(json_file, category, subcategory, operator):
    """Convert JSON to TXT format"""
    
    # Read JSON
    with open(json_file, 'r', encoding='utf-8') as f:
        content = f.read()
        try:
            # Try double parse (double-encoded)
            data = json.loads(json.loads(content))
        except:
            # Single parse
            data = json.loads(content)
    
    # Create output filename
    output_file = f"scraped-txt/{category}-{subcategory}-{operator}.txt"
    
    # Write to TXT
    with open(output_file, 'w', encoding='utf-8') as f:
        f.write(f"KATEGORI: {category}\n")
        f.write(f"SUB-KATEGORI: {subcategory}\n")
        f.write(f"OPERATOR: {operator}\n")
        f.write("=" * 80 + "\n\n")
        
        for i, product in enumerate(data, 1):
            f.write(f"{i}. {product['name']}\n")
            f.write(f"   Harga: {product['price']}\n")
            if product.get('image'):
                f.write(f"   Image: {product['image']}\n")
            f.write("\n")
        
        f.write("=" * 80 + "\n")
        f.write(f"TOTAL: {len(data)} products\n")
    
    print(f"Saved {len(data)} products to {output_file}")
    return len(data)

# Process existing files
files_to_process = [
    ('pulsa-telkomsel.json', 'Prabayar', 'Pulsa', 'TELKOMSEL'),
    ('pulsa-xl.json', 'Prabayar', 'Pulsa', 'XL'),
    ('pulsa-indosat.json', 'Prabayar', 'Pulsa', 'INDOSAT'),
    ('pulsa-tri.json', 'Prabayar', 'Pulsa', 'TRI'),
    ('pulsa-smartfren.json', 'Prabayar', 'Pulsa', 'SMARTFREN'),
    ('pulsa-byu.json', 'Prabayar', 'Pulsa', 'BY.U'),
    ('pulsa-axis.json', 'Prabayar', 'Pulsa', 'AXIS'),
]

total = 0
for json_file, cat, subcat, op in files_to_process:
    if os.path.exists(json_file):
        count = convert_json_to_txt(json_file, cat, subcat, op)
        total += count

print(f"\nTotal products processed: {total}")
