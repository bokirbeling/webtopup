import fs from 'node:fs';
import path from 'node:path';

const fixturesDir = path.resolve(process.cwd(), 'test-fixtures');

export type FixtureProduct = Readonly<{
  sku_digiflazz: string;
  name: string;
  category: string;
  provider: string;
}>;

export type FixtureOrder = Readonly<{
  label: string;
  product_code: string;
  provider: string;
  customer_ref: string;
  buyer_email: string | null;
  notes: string;
}>;

export function readFixtureFile<T>(fileName: string): T {
  return JSON.parse(fs.readFileSync(path.join(fixturesDir, fileName), 'utf8')) as T;
}

export function readProductsFixture() {
  return readFixtureFile<FixtureProduct[]>('products.json');
}

export function readOrdersFixture() {
  return readFixtureFile<FixtureOrder[]>('orders.json');
}

export function buildGeneratedCredential(prefix: string) {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
  return {
    email: `${prefix}+${stamp}@example.test`,
    password: `Test${stamp}!`,
  };
}
