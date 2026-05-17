#!/usr/bin/env tsx
/**
 * Scrape Digiflazz product catalog using Playwright
 * Source: https://id.digiflazz.com/daftar-harga
 * 
 * Usage:
 *   npm run scrape-products
 *   npm run scrape-products -- --categories=pulsa,games
 *   npm run scrape-products -- --headless=false
 */

import { chromium, type Browser, type Page } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const BASE_URL = 'https://id.digiflazz.com/daftar-harga';
const OUTPUT_DIR = join(process.cwd(), '..', 'digiflazz-product-reference');

type ScrapedProduct = {
  name: string;
  price: number;
  category: string;
  brand: string;
  type: string;
  desc: string;
  image_url: string;
};

type CategoryInfo = {
  name: string;
  slug: string;
  selector: string;
};

const CATEGORIES: CategoryInfo[] = [
  { name: 'Pulsa', slug: 'pulsa', selector: '[data-category="pulsa"]' },
  { name: 'Data', slug: 'data', selector: '[data-category="data"]' },
  { name: 'Games', slug: 'games', selector: '[data-category="games"]' },
  { name: 'Voucher', slug: 'voucher', selector: '[data-category="voucher"]' },
  { name: 'E-Money', slug: 'emoney', selector: '[data-category="emoney"]' },
  { name: 'PLN', slug: 'pln', selector: '[data-category="pln"]' }
];

async function scrapeCategory(
  page: Page,
  category: CategoryInfo
): Promise<ScrapedProduct[]> {
  console.log(`\n📂 Scraping: ${category.name}`);
  
  try {
    // Navigate to category
    await page.goto(`${BASE_URL}?category=${category.slug}`, {
      waitUntil: 'networkidle',
      timeout: 60000
    });

    // Wait for product list to load
    await page.waitForSelector('.product-item, .product-card, [data-product]', {
      timeout: 30000
    });

    // Extract products
    const products = await page.evaluate((cat) => {
      const items: ScrapedProduct[] = [];
      
      // Try multiple selectors for product cards
      const productCards = document.querySelectorAll(
        '.product-item, .product-card, [data-product], .card-product'
      );

      productCards.forEach((card) => {
        try {
          const nameEl = card.querySelector('.product-name, .name, h3, h4, [data-name]');
          const priceEl = card.querySelector('.price, .product-price, [data-price]');
          const brandEl = card.querySelector('.brand, .product-brand, [data-brand]');
          const typeEl = card.querySelector('.type, .product-type, [data-type]');
          const descEl = card.querySelector('.desc, .description, [data-desc]');
          const imgEl = card.querySelector('img');

          if (!nameEl || !priceEl) return;

          const priceText = priceEl.textContent?.trim() || '0';
          const priceNum = parseInt(priceText.replace(/[^0-9]/g, ''), 10);

          items.push({
            name: nameEl.textContent?.trim() || '',
            price: priceNum,
            category: cat,
            brand: brandEl?.textContent?.trim() || 'Unknown',
            type: typeEl?.textContent?.trim() || 'Umum',
            desc: descEl?.textContent?.trim() || '-',
            image_url: imgEl?.src || ''
          });
        } catch (err) {
          console.error('Error parsing product card:', err);
        }
      });

      return items;
    }, category.name);

    console.log(`   ✅ Found ${products.length} products`);
    return products;

  } catch (error) {
    console.error(`   ❌ Error scraping ${category.name}:`, error);
    return [];
  }
}

async function scrapeBrands(
  page: Page,
  category: CategoryInfo
): Promise<string[]> {
  try {
    await page.goto(`${BASE_URL}?category=${category.slug}`, {
      waitUntil: 'networkidle'
    });

    const brands = await page.evaluate(() => {
      const brandElements = document.querySelectorAll(
        '.brand-filter button, .brand-tab, [data-brand-filter]'
      );
      return Array.from(brandElements).map(el => el.textContent?.trim() || '');
    });

    return brands.filter(b => b.length > 0);
  } catch (error) {
    console.error(`Error getting brands for ${category.name}:`, error);
    return [];
  }
}

async function main() {
  const args = process.argv.slice(2);
  const headlessArg = args.find(arg => arg.startsWith('--headless='));
  const categoriesArg = args.find(arg => arg.startsWith('--categories='));

  const headless = headlessArg ? headlessArg.split('=')[1] === 'true' : true;
  const filterCategories = categoriesArg 
    ? categoriesArg.split('=')[1].split(',')
    : null;

  const categoriesToScrape = filterCategories
    ? CATEGORIES.filter(c => filterCategories.includes(c.slug))
    : CATEGORIES;

  console.log('🌐 Digiflazz Product Scraper');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Source: ${BASE_URL}`);
  console.log(`Headless: ${headless}`);
  console.log(`Categories: ${categoriesToScrape.map(c => c.name).join(', ')}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless });
  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  let totalProducts = 0;

  for (const category of categoriesToScrape) {
    const products = await scrapeCategory(page, category);
    
    if (products.length > 0) {
      const outputPath = join(OUTPUT_DIR, `${category.slug}.json`);
      writeFileSync(outputPath, JSON.stringify(products, null, 2), 'utf-8');
      console.log(`   💾 Saved to: ${category.slug}.json`);
      totalProducts += products.length;
    }

    // Delay between categories
    await page.waitForTimeout(2000);
  }

  await browser.close();

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Total products scraped: ${totalProducts.toLocaleString()}`);
  console.log(`📁 Files saved to: ${OUTPUT_DIR}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  console.log('💡 Next step: npm run import-products');
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
