#!/usr/bin/env python3
"""
Auto-scrape all operators for Data category
Uses Playwright MCP to scrape and immediately convert to TXT
"""

import time

# Data operators
operators = ['TELKOMSEL', 'XL', 'INDOSAT', 'TRI', 'SMARTFREN', 'AXIS', 'BY.U']

print("AUTO-SCRAPE DATA CATEGORY")
print("=" * 80)
print(f"Total operators: {len(operators)}")
print("\nSTEPS FOR EACH OPERATOR:")
print("1. Click operator link via Playwright")
print("2. Wait 2 seconds for page load")
print("3. Scroll to bottom")
print("4. Run scraping JavaScript")
print("5. Save to TXT immediately (skip JSON)")
print("6. Move to next operator")
print("\n" + "=" * 80)

# Since we can't automate Playwright MCP calls from Python,
# we'll generate the manual steps

for i, op in enumerate(operators, 1):
    print(f"\n{i}. {op}:")
    print(f"   - Click: browser_click on '{op}' link")
    print(f"   - Wait: 2 seconds")
    print(f"   - Scroll: browser_evaluate window.scrollTo(0, document.body.scrollHeight)")
    print(f"   - Scrape: browser_evaluate (scraping function)")
    print(f"   - Output: scraped-txt/Prabayar-Data-{op}.txt")

print("\n" + "=" * 80)
print("\nNOTE: Manual execution required via Playwright MCP")
print("Console log shows 3,450 products for TELKOMSEL")
print("Expected similar counts for other operators")
