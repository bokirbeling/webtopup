#!/usr/bin/env python3
"""
Convert scraped JSON to TXT format
Usage: python json-to-txt.py <json-file> <category> <subcategory> <operator>
"""

import json
import sys
from pathlib import Path

if len(sys.argv) < 5:
    print("Usage: python json-to-txt.py <json-file> <category> <subcategory> <operator>")
    sys.exit(1)

json_file = sys.argv[1]
category = sys.argv[2]
subcategory = sys.argv[3]
operator = sys.argv[4]

# Read JSON
with open(json_file, 'r', encoding='utf-8') as f:
    products = json.load(f)

# Generate TXT
output_file = f"scraped-txt/{category}-{subcategory}-{operator}.txt"
Path("scraped-txt").mkdir(exist_ok=True)

with open(output_file, 'w', encoding='utf-8') as f:
    f.write(f"KATEGORI: {category}\n")
    f.write(f"SUB-KATEGORI: {subcategory}\n")
    f.write(f"OPERATOR: {operator}\n")
    f.write("=" * 80 + "\n\n")
    
    for i, product in enumerate(products, 1):
        f.write(f"{i}. {product['name']}\n")
        f.write(f"   Harga: {product['price']}\n")
        if product.get('image'):
            f.write(f"   Image: {product['image']}\n")
        f.write("\n")
    
    f.write("=" * 80 + "\n")
    f.write(f"TOTAL: {len(products)} products\n")

print(f"Converted {len(products)} products")
print(f"Output: {output_file}")
