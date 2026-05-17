# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: guest.spec.ts >> Wave 2 Guest features >> guest checkout, tracking, and invoice endpoints respond on demo
- Location: playwright-tests\guest.spec.ts:6:7

# Error details

```
Error: createTestOrder failed: 400 {"error":{"code":"VALIDATION_ERROR","message":"Invalid order payload.","details":[{"field":"amount_minor","message":"amount_minor is required and must be a positive integer."}]}}
```

# Page snapshot

```yaml
- generic [active] [ref=e1]:
  - main [ref=e2]:
    - navigation [ref=e3]:
      - generic [ref=e5]:
        - generic [ref=e8]: Adnanpay
        - generic [ref=e9]:
          - link "Dashboard" [ref=e10] [cursor=pointer]:
            - /url: /dashboard/
          - link "Admin" [ref=e11] [cursor=pointer]:
            - /url: /admin/
          - link "Lacak Order" [ref=e12] [cursor=pointer]:
            - /url: /lacak/
    - generic [ref=e15]:
      - generic [ref=e16]:
        - generic [ref=e17]:
          - generic [ref=e18]:
            - paragraph [ref=e19]: Katalog Produk Digiflazz
            - heading "Produk by kategori, mudah dicari." [level=2] [ref=e20]
            - paragraph [ref=e21]: Data utama dari backend/database. Jika kosong, UI tampilkan demo fallback tanpa menjadikan hardcode sebagai sumber truth.
          - generic [ref=e22]: Memuat katalog...
        - generic [ref=e23]:
          - generic [ref=e24]:
            - generic [ref=e25]: Cari produk
            - textbox "Cari produk" [ref=e26]:
              - /placeholder: Cari produk, SKU, provider...
          - generic [ref=e27]:
            - generic [ref=e28]: Kategori
            - combobox "Kategori" [ref=e29]:
              - option "Semua" [selected]
              - option "Game"
              - option "Listrik PLN"
              - option "Paket Data"
        - generic [ref=e30]:
          - button "Token PLN 20.000 Listrik PLN Token PLN 20.000 Demo fallback ketika database kosong Rp 21.500 DEMO-PLN-20K" [ref=e31]:
            - generic [ref=e32]:
              - img "Token PLN 20.000" [ref=e33]
              - generic [ref=e34]: Listrik PLN
            - generic [ref=e35]:
              - heading "Token PLN 20.000" [level=3] [ref=e36]
              - paragraph [ref=e37]: Demo fallback ketika database kosong
              - generic [ref=e38]:
                - generic [ref=e39]: Rp 21.500
                - generic [ref=e40]: DEMO-PLN-20K
          - button "Mobile Legends 86 Diamonds Game Mobile Legends 86 Diamonds Demo fallback ketika database kosong Rp 21.000 DEMO-ML-86" [ref=e41]:
            - generic [ref=e42]:
              - img "Mobile Legends 86 Diamonds" [ref=e43]
              - generic [ref=e44]: Game
            - generic [ref=e45]:
              - heading "Mobile Legends 86 Diamonds" [level=3] [ref=e46]
              - paragraph [ref=e47]: Demo fallback ketika database kosong
              - generic [ref=e48]:
                - generic [ref=e49]: Rp 21.000
                - generic [ref=e50]: DEMO-ML-86
          - button "Telkomsel Data 5GB Paket Data Telkomsel Data 5GB Demo fallback ketika database kosong Rp 51.000 DEMO-TSEL-DATA-5GB" [ref=e51]:
            - generic [ref=e52]:
              - img "Telkomsel Data 5GB" [ref=e53]
              - generic [ref=e54]: Paket Data
            - generic [ref=e55]:
              - heading "Telkomsel Data 5GB" [level=3] [ref=e56]
              - paragraph [ref=e57]: Demo fallback ketika database kosong
              - generic [ref=e58]:
                - generic [ref=e59]: Rp 51.000
                - generic [ref=e60]: DEMO-TSEL-DATA-5GB
      - generic [ref=e61]:
        - paragraph [ref=e62]: Checkout cepat
        - heading "Token PLN 20.000" [level=3] [ref=e63]
        - paragraph [ref=e64]: Listrik PLN · DEMO-PLN-20K
        - paragraph [ref=e65]: Rp 21.500
        - generic [ref=e66]:
          - textbox "Nomor Pelanggan PLN" [ref=e67]
          - textbox "Email invoice (opsional)" [ref=e68]
        - button "Buat order" [ref=e69]
  - alert [ref=e70]
```

# Test source

```ts
  1   | import fs from 'node:fs/promises';
  2   | import path from 'node:path';
  3   | 
  4   | import { expect, type APIRequestContext, type Page } from '@playwright/test';
  5   | 
  6   | import { buildGeneratedCredential, readOrdersFixture, readProductsFixture } from './fixtures';
  7   | 
  8   | export const demoApiBaseUrl = 'https://adnanpay.com/ppob-api';
  9   | const repoRootDir = path.resolve(process.cwd(), '..');
  10  | const evidenceDir = path.resolve(repoRootDir, '.sisyphus', 'evidence');
  11  | const bugsDir = path.join(evidenceDir, 'bugs');
  12  | const runtimeDir = path.resolve(process.cwd(), 'playwright-tests', '.runtime');
  13  | 
  14  | export type AuthSession = Readonly<{
  15  |   user: {
  16  |     id: string;
  17  |     email: string;
  18  |     role: 'admin' | 'seller' | 'pengguna';
  19  |     is_reseller_active: boolean;
  20  |     reseller_status: 'none' | 'requested' | 'approved' | 'rejected';
  21  |     email_verified: boolean;
  22  |   };
  23  |   token: string;
  24  |   expires_in: string;
  25  | }>;
  26  | 
  27  | export async function ensureEvidenceDirs() {
  28  |   await fs.mkdir(evidenceDir, { recursive: true });
  29  |   await fs.mkdir(bugsDir, { recursive: true });
  30  |   await fs.mkdir(runtimeDir, { recursive: true });
  31  | }
  32  | 
  33  | export async function appendEvidence(fileName: string, lines: string[]) {
  34  |   await ensureEvidenceDirs();
  35  |   await fs.appendFile(path.join(evidenceDir, fileName), lines.join('\n') + '\n', 'utf8');
  36  | }
  37  | 
  38  | export async function writeBugReport(fileName: string, body: string) {
  39  |   await ensureEvidenceDirs();
  40  |   await fs.writeFile(path.join(bugsDir, fileName), body, 'utf8');
  41  | }
  42  | 
  43  | export async function apiJson<T>(request: APIRequestContext, input: string, init?: Parameters<APIRequestContext['fetch']>[1]) {
  44  |   const response = await request.fetch(`${demoApiBaseUrl}${input}`, init);
  45  |   const text = await response.text();
  46  |   let data: unknown = null;
  47  | 
  48  |   try {
  49  |     data = text === '' ? null : JSON.parse(text);
  50  |   } catch {
  51  |     data = text;
  52  |   }
  53  | 
  54  |   return { response, data: data as T, text };
  55  | }
  56  | 
  57  | export async function createTestUser(request: APIRequestContext, role: 'reseller' | 'member' = 'reseller') {
  58  |   const generated = buildGeneratedCredential(role === 'reseller' ? 'reseller' : 'member');
  59  |   const register = await apiJson<AuthSession>(request, '/api/auth/register', {
  60  |     method: 'POST',
  61  |     headers: { 'content-type': 'application/json' },
  62  |     data: { email: generated.email, password: generated.password },
  63  |   });
  64  | 
  65  |   if (!register.response.ok()) {
  66  |     throw new Error(`createTestUser failed: ${register.response.status()} ${register.text}`);
  67  |   }
  68  | 
  69  |   await fs.writeFile(path.join(runtimeDir, `user-${generated.email.replace(/[^a-z0-9]/gi, '_')}.json`), JSON.stringify({ ...generated, session: register.data }, null, 2));
  70  |   return { ...generated, session: register.data };
  71  | }
  72  | 
  73  | export async function createTestOrder(request: APIRequestContext, overrides?: Partial<{ product_code: string; provider: string; customer_ref: string; buyer_email: string | null }>) {
  74  |   const baseOrder = readOrdersFixture()[0];
  75  |   const products = readProductsFixture();
  76  |   const product = products.find((entry) => entry.sku_digiflazz === (overrides?.product_code ?? baseOrder.product_code));
  77  | 
  78  |   expect(product).toBeDefined();
  79  | 
  80  |   const payload = {
  81  |     product_code: overrides?.product_code ?? baseOrder.product_code,
  82  |     provider: overrides?.provider ?? baseOrder.provider,
  83  |     customer_ref: overrides?.customer_ref ?? baseOrder.customer_ref,
  84  |     buyer_email: overrides?.buyer_email ?? baseOrder.buyer_email,
  85  |   };
  86  | 
  87  |   const order = await apiJson<{ order_id: string; invoice_code: string; status: string }>(request, '/api/orders', {
  88  |     method: 'POST',
  89  |     headers: { 'content-type': 'application/json' },
  90  |     data: payload,
  91  |   });
  92  | 
  93  |   if (!order.response.ok()) {
> 94  |     throw new Error(`createTestOrder failed: ${order.response.status()} ${order.text}`);
      |           ^ Error: createTestOrder failed: 400 {"error":{"code":"VALIDATION_ERROR","message":"Invalid order payload.","details":[{"field":"amount_minor","message":"amount_minor is required and must be a positive integer."}]}}
  95  |   }
  96  | 
  97  |   await fs.writeFile(path.join(runtimeDir, `order-${order.data.invoice_code}.json`), JSON.stringify({ payload, order: order.data }, null, 2));
  98  |   return order.data;
  99  | }
  100 | 
  101 | export async function cleanupTestData() {
  102 |   await ensureEvidenceDirs();
  103 |   await appendEvidence('feature-test-fixtures.txt', [
  104 |     `cleanupTestData invoked at ${new Date().toISOString()}`,
  105 |     'No destructive cleanup endpoint is available in demo mode, so generated test identities are recorded only and left isolated in demo_ tables.',
  106 |   ]);
  107 | }
  108 | 
  109 | export async function loginAsReseller(page: Page, email: string, password: string) {
  110 |   await page.goto('/dashboard');
  111 |   await page.getByLabel('Email').fill(email);
  112 |   await page.getByLabel('Password').fill(password);
  113 |   await page.getByRole('button', { name: /masuk ke dashboard/i }).click();
  114 | }
  115 | 
  116 | export async function loginAsAdmin(page: Page, email: string, password: string) {
  117 |   await page.goto('/admin');
  118 |   await page.getByLabel('Email').fill(email);
  119 |   await page.getByLabel('Password').fill(password);
  120 |   await page.getByRole('button', { name: /masuk admin/i }).click();
  121 | }
  122 | 
  123 | export async function selectProduct(page: Page, productCode: string) {
  124 |   const card = page.locator(`[data-product-code="${productCode}"]`).first();
  125 |   if (await card.count()) {
  126 |     await card.click();
  127 |     return;
  128 |   }
  129 | 
  130 |   await page.getByPlaceholder(/cari layanan, operator, atau nama game/i).fill(productCode);
  131 |   const productText = productCode.toLowerCase().includes('gopay') ? /gopay/i : /telkomsel/i;
  132 |   await page.getByText(productText).first().click();
  133 | }
  134 | 
```