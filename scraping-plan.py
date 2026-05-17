#!/usr/bin/env python3
"""
Auto-scrape script generator for Playwright
Generates JavaScript code to scrape all categories
"""

# Categories to scrape
categories = {
    'Prabayar': {
        'Data': ['TELKOMSEL', 'XL', 'INDOSAT', 'TRI', 'SMARTFREN', 'AXIS', 'BY.U'],
        'Games': [],  # Will be scraped separately
        'Voucher': [],
        'E-Money': [],
        'PLN': [],
    },
    'Pascabayar': {
        'PLN': [],
        'PDAM': [],
        'HP': [],
        'Internet': [],
        'BPJS': [],
    }
}

print("Scraping plan:")
print("=" * 80)

total_operators = 0
for main_cat, subcats in categories.items():
    print(f"\n{main_cat}:")
    for subcat, operators in subcats.items():
        if operators:
            print(f"  {subcat}: {len(operators)} operators - {', '.join(operators)}")
            total_operators += len(operators)
        else:
            print(f"  {subcat}: (scrape all brands)")

print(f"\nTotal operators to scrape: {total_operators}")
print("=" * 80)
