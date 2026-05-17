#!/usr/bin/env tsx
/**
 * Download product images from Digiflazz CDN and organize by brand
 * 
 * Usage:
 *   npm run download-images -- --output=../next-frontend/public/product-images
 *   npm run download-images -- --brands=TELKOMSEL,GOPAY --dry-run
 */

import { config } from 'dotenv';
import { createWriteStream, existsSync, mkdirSync, readFileSync } from 'fs';
import { join, basename } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';

// Load environment variables
config({ path: join(process.cwd(), '..', '.env') });

type DigiflazzProduct = {
  name: string;
  brand: string;
  category: string;
  image_url: string;
};

const REFERENCE_DIR = join(process.cwd(), '..', 'digiflazz-product-reference');
const DEFAULT_OUTPUT = join(process.cwd(), '..', 'next-frontend', 'public', 'product-images');

const CATEGORY_FILES = [
  'pulsa-telkomsel.json',
  'pulsa-xl.json',
  'pulsa-indosat.json',
  'pulsa-tri.json',
  'pulsa-smartfren.json',
  'pulsa-axis.json',
  'pulsa-byu.json',
  'data.json',
  'games.json',
  'voucher.json',
  'emoney.json',
  'pln.json'
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function downloadImage(url: string, outputPath: string): Promise<boolean> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const body = response.body;
    if (!body) {
      throw new Error('No response body');
    }

    await pipeline(
      Readable.fromWeb(body as any),
      createWriteStream(outputPath)
    );

    return true;
  } catch (error) {
    console.error(`   ❌ Failed to download ${url}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function collectUniqueImages(
  filterBrands?: string[]
): Promise<Map<string, { url: string; brand: string; category: string }>> {
  const imageMap = new Map<string, { url: string; brand: string; category: string }>();

  for (const file of CATEGORY_FILES) {
    const filePath = join(REFERENCE_DIR, file);
    if (!existsSync(filePath)) {
      continue;
    }

    const products = JSON.parse(readFileSync(filePath, 'utf-8')) as DigiflazzProduct[];
    
    for (const product of products) {
      if (filterBrands && !filterBrands.includes(product.brand.toUpperCase())) {
        continue;
      }

      if (!product.image_url || !product.image_url.startsWith('http')) {
        continue;
      }

      const key = product.image_url;
      if (!imageMap.has(key)) {
        imageMap.set(key, {
          url: product.image_url,
          brand: product.brand,
          category: product.category
        });
      }
    }
  }

  return imageMap;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const outputArg = args.find(arg => arg.startsWith('--output='));
  const brandsArg = args.find(arg => arg.startsWith('--brands='));

  const outputDir = outputArg ? outputArg.split('=')[1] : DEFAULT_OUTPUT;
  const filterBrands = brandsArg ? brandsArg.split('=')[1].split(',') : undefined;

  console.log('🖼️  Digiflazz Product Image Downloader');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'DOWNLOAD'}`);
  console.log(`Output: ${outputDir}`);
  if (filterBrands) {
    console.log(`Brands: ${filterBrands.join(', ')}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  console.log('📊 Collecting unique images...');
  const imageMap = await collectUniqueImages(filterBrands);
  console.log(`   Found ${imageMap.size.toLocaleString()} unique images\n`);

  if (!dryRun) {
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }
  }

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  const entries = Array.from(imageMap.entries());
  
  for (let i = 0; i < entries.length; i++) {
    const [url, info] = entries[i];
    const brandSlug = slugify(info.brand);
    const categorySlug = slugify(info.category);
    const filename = basename(url);
    const outputPath = join(outputDir, `${categorySlug}-${brandSlug}-${filename}`);

    const progress = `[${i + 1}/${entries.length}]`;
    
    if (!dryRun && existsSync(outputPath)) {
      process.stdout.write(`\r${progress} ⏭️  Skipped: ${brandSlug}/${filename}`);
      skipped++;
      continue;
    }

    if (dryRun) {
      console.log(`${progress} Would download: ${url} -> ${outputPath}`);
      downloaded++;
    } else {
      process.stdout.write(`\r${progress} ⬇️  Downloading: ${brandSlug}/${filename}...`);
      const success = await downloadImage(url, outputPath);
      if (success) {
        downloaded++;
      } else {
        failed++;
      }
    }
  }

  console.log('\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📊 Summary');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Downloaded: ${downloaded.toLocaleString()}`);
  if (skipped > 0) {
    console.log(`⏭️  Skipped (exists): ${skipped.toLocaleString()}`);
  }
  if (failed > 0) {
    console.log(`❌ Failed: ${failed.toLocaleString()}`);
  }
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  if (dryRun) {
    console.log('💡 Run without --dry-run to perform actual download');
  }
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
