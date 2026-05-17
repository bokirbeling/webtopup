import { existsSync, readFileSync } from 'node:fs';

const checks = [
  ['app/page.tsx', ['ProductCatalog', 'Adnanpay Next.js']],
  ['components/ProductCatalog.tsx', ['catalog-category-select', '/api/catalog/products', 'product_id', 'next/image']],
  ['components/AuthDashboard.tsx', ['auth-panel', '/api/auth/login', '/api/account/reseller-request', 'transaction-history']],
  ['components/AdminDashboard.tsx', ['admin-forbidden', '/api/admin/digiflazz/operations', 'admin-category-image-form', '/api/admin/catalog/digiflazz/price-list/sync']],
  ['components/InvoiceStatus.tsx', ['/api/invoices/', 'status-badge', 'Pantau pembayaran Midtrans']],
  ['app/invoice/[code]/page.tsx', ['InvoiceStatus']],
  ['app/lacak/page.tsx', ['/invoice/']],
  ['.env.example', ['NEXT_PUBLIC_API_BASE_URL', 'https://adnanpay.com/ppob-api']],
];

let failures = 0;

for (const [file, expectedSnippets] of checks) {
  if (!existsSync(file)) {
    console.error(`Missing file: ${file}`);
    failures += 1;
    continue;
  }

  const content = readFileSync(file, 'utf8');
  for (const snippet of expectedSnippets) {
    if (!content.includes(snippet)) {
      console.error(`Missing snippet in ${file}: ${snippet}`);
      failures += 1;
    }
  }
}

if (failures > 0) {
  process.exitCode = 1;
} else {
  process.stdout.write('Next.js scaffold smoke checks passed.\n');
}
