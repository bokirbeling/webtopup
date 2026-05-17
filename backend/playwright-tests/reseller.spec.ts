import { test, expect } from '@playwright/test';

import { appendEvidence, createTestUser, ensureEvidenceDirs, loginAsReseller, writeBugReport } from './helpers/api';

test.describe('Wave 3 Reseller features', () => {
  test('registration and dashboard access work without email verification', async ({ page, request }) => {
    await ensureEvidenceDirs();
    const user = await createTestUser(request, 'reseller');

    await loginAsReseller(page, user.email, user.password);
    const bodyText = await page.locator('body').textContent();

    await appendEvidence('feature-test-reseller.txt', [
      `wave=reseller timestamp=${new Date().toISOString()}`,
      `registered_email ${user.email}`,
      `dashboard_url ${page.url()}`,
      `dashboard_has_transaksi ${String(bodyText?.toLowerCase().includes('transaksi'))}`,
      `dashboard_has_komisi ${String(bodyText?.toLowerCase().includes('komisi'))}`,
    ]);

    if (!bodyText?.toLowerCase().includes('dashboard')) {
      await writeBugReport('reseller-dashboard-access.md', `# Reseller dashboard did not load\n\nUser: ${user.email}\nURL: ${page.url()}`);
    }

    await expect(page).toHaveURL(/dashboard/);
  });
});
