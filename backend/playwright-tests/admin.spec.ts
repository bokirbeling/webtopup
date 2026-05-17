import { test } from '@playwright/test';

import { appendEvidence, ensureEvidenceDirs, loginAsAdmin, writeBugReport } from './helpers/api';

const adminEmail = process.env.DEMO_ADMIN_EMAIL ?? '';
const adminPassword = process.env.DEMO_ADMIN_PASSWORD ?? '';

test.describe('Wave 4 Admin features', () => {
  test('admin portal smoke test', async ({ page }) => {
    await ensureEvidenceDirs();

    if (adminEmail === '' || adminPassword === '') {
      await appendEvidence('feature-test-admin.txt', [
        `wave=admin timestamp=${new Date().toISOString()}`,
        'skipped missing DEMO_ADMIN_EMAIL or DEMO_ADMIN_PASSWORD',
      ]);
      test.skip(true, 'Admin credentials not provided in environment.');
    }

    await loginAsAdmin(page, adminEmail, adminPassword);
    const text = await page.locator('body').textContent();
    await appendEvidence('feature-test-admin.txt', [
      `wave=admin timestamp=${new Date().toISOString()}`,
      `admin_url ${page.url()}`,
      `contains_products ${String(text?.toLowerCase().includes('produk'))}`,
      `contains_reseller ${String(text?.toLowerCase().includes('reseller'))}`,
      `contains_monitoring ${String(text?.toLowerCase().includes('monitor'))}`,
    ]);

    if (!text?.toLowerCase().includes('admin')) {
      await writeBugReport('admin-portal-load.md', `# Admin portal did not render expected content\n\nURL: ${page.url()}`);
    }
  });
});
