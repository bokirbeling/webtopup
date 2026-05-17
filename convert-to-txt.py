#!/usr/bin/env python3
"""
Convert scraped JSON to TXT format
"""
import json
import sys

# Read JSON file
with open('pulsa-telkomsel.json', 'r', encoding='utf-8') as f:
    content = f.read()
    # Double parse because it's double-encoded
    data = json.loads(json.loads(content))

# Write to TXT
with open('scraped-txt/prabayar-pulsa-telkomsel.txt', 'w', encoding='utf-8') as f:
    f.write("KATEGORI: Prabayar\n")
    f.write("SUB-KATEGORI: Pulsa\n")
    f.write("OPERATOR: TELKOMSEL\n")
    f.write("=" * 80 + "\n\n")
    
    for i, product in enumerate(data, 1):
        f.write(f"{i}. {product['name']}\n")
        f.write(f"   Harga: {product['price']}\n")
        f.write(f"   Image: {product['image']}\n")
        f.write("\n")
    
    f.write("=" * 80 + "\n")
    f.write(f"TOTAL: {len(data)} products\n")

print(f"Saved {len(data)} products to scraped-txt/prabayar-pulsa-telkomsel.txt")
