#!/usr/bin/env python3
"""
Auto-scrape all Data operators and save to TXT
Runs via Playwright MCP
"""

import json
import os

# Data operators to scrape
operators = ['TELKOMSEL', 'XL', 'INDOSAT', 'TRI', 'SMARTFREN', 'AXIS', 'BY.U']

print("📦 DATA CATEGORY SCRAPING PLAN")
print("=" * 80)
print(f"Category: Prabayar > Data")
print(f"Operators: {len(operators)}")
print(f"Output: scraped-txt/Prabayar-Data-[OPERATOR].txt\n")

for i, op in enumerate(operators, 1):
    print(f"{i}. {op}")

print("\n" + "=" * 80)
print("\nMANUAL STEPS (via Playwright MCP):")
print("1. Click operator link (e.g., TELKOMSEL)")
print("2. Run browser_evaluate to scrape products")
print("3. Save to JSON")
print("4. Convert JSON to TXT using convert-to-txt.py")
print("5. Repeat for next operator")
print("\nOR use automated loop script (if available)")
