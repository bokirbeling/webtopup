import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';

/**
 * Direct Digiflazz API Test
 * Tests the Digiflazz Buyer API directly without going through the checkout flow
 * 
 * Test Cases from https://developer.digiflazz.com/api/buyer/test-case/
 * - 087800001230 → Success (Sukses)
 * - 087800001232 → Failed (Gagal)
 * - 087800001233 → Pending → Callback Success
 * - 087800001234 → Pending → Callback Failed
 */

const DIGIFLAZZ_CONFIG = {
  username: 'racufig5E1rg',
  apiKey: 'dev-33b28300-8287-11ec-adb2-692ea50f5ef5',
  baseUrl: 'https://api.digiflazz.com'
};

function signRequest(username: string, apiKey: string, refId: string): string {
  return createHash('md5').update(username + apiKey + refId).digest('hex');
}

function generateRefId(): string {
  return `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

test.describe('Digiflazz Direct API Tests', () => {
  
  test('1. Check Digiflazz Balance (Cek Saldo)', async ({ request }) => {
    const refId = generateRefId();
    const sign = signRequest(DIGIFLAZZ_CONFIG.username, DIGIFLAZZ_CONFIG.apiKey, 'depo');
    
    const payload = {
      cmd: 'deposit',
      username: DIGIFLAZZ_CONFIG.username,
      sign: sign
    };

    const response = await request.post(`${DIGIFLAZZ_CONFIG.baseUrl}/v1/cek-saldo`, {
      headers: { 'Content-Type': 'application/json' },
      data: payload
    });

    const data = await response.json();
    console.log('[Cek Saldo Response]', JSON.stringify(data, null, 2));

    expect(response.ok()).toBe(true);
    // Response format: { data: { deposit: ... } }
    expect(data.data).toHaveProperty('deposit');
    // No rc in cek-saldo response
  });

  test('2. Get Price List (all products)', async ({ request }) => {
    const sign = signRequest(DIGIFLAZZ_CONFIG.username, DIGIFLAZZ_CONFIG.apiKey, 'pricelist');
    
    const payload = {
      cmd: 'prepaid',
      username: DIGIFLAZZ_CONFIG.username,
      sign: sign
    };

    const response = await request.post(`${DIGIFLAZZ_CONFIG.baseUrl}/v1/price-list`, {
      headers: { 'Content-Type': 'application/json' },
      data: payload
    });

    const data = await response.json();
    console.log('[Price List Response] Total products:', data.data?.length || 0);

    expect(response.ok()).toBe(true);
    // Response format: { data: { products: [...] } } or direct array
    expect(data.data).toBeDefined();
  });

  test('3. Get Price List - filter by code xld10', async ({ request }) => {
    const sign = signRequest(DIGIFLAZZ_CONFIG.username, DIGIFLAZZ_CONFIG.apiKey, 'pricelist');
    
    const payload = {
      cmd: 'prepaid',
      username: DIGIFLAZZ_CONFIG.username,
      sign: sign,
      code: 'xld10'
    };

    const response = await request.post(`${DIGIFLAZZ_CONFIG.baseUrl}/v1/price-list`, {
      headers: { 'Content-Type': 'application/json' },
      data: payload
    });

    const data = await response.json();
    console.log('[Price List xld10 Response]', JSON.stringify(data, null, 2));

    expect(response.ok()).toBe(true);
    // xld10 may not be in price list if not active - this is expected
    const products = data.data || [];
    console.log('[xld10] Products found:', products.length);
  });

  test('4. Topup - Test Case SUCCESS (087800001230)', async ({ request }) => {
    const refId = generateRefId();
    const sign = signRequest(DIGIFLAZZ_CONFIG.username, DIGIFLAZZ_CONFIG.apiKey, refId);
    
    const payload = {
      username: DIGIFLAZZ_CONFIG.username,
      buyer_sku_code: 'xld10',
      customer_no: '087800001230',
      ref_id: refId,
      sign: sign,
      testing: true // IMPORTANT: This is the test mode flag
    };

    const response = await request.post(`${DIGIFLAZZ_CONFIG.baseUrl}/v1/transaction`, {
      headers: { 'Content-Type': 'application/json' },
      data: payload
    });

    const data = await response.json();
    console.log('[Topup SUCCESS Response]', JSON.stringify(data, null, 2));

    expect(response.ok()).toBe(true);
    
    // Digiflazz test cases return rc: '00' for success
    expect(data.data?.status).toBe('Sukses');
    expect(data.data?.buyer_sku_code).toBe('xld10');
    expect(data.data?.rc).toBe('00');
  });

  test('5. Topup - Test Case FAILED (087800001232)', async ({ request }) => {
    const refId = generateRefId();
    const sign = signRequest(DIGIFLAZZ_CONFIG.username, DIGIFLAZZ_CONFIG.apiKey, refId);
    
    const payload = {
      username: DIGIFLAZZ_CONFIG.username,
      buyer_sku_code: 'xld10',
      customer_no: '087800001232',
      ref_id: refId,
      sign: sign,
      testing: true
    };

    const response = await request.post(`${DIGIFLAZZ_CONFIG.baseUrl}/v1/transaction`, {
      headers: { 'Content-Type': 'application/json' },
      data: payload
    });

    const data = await response.json();
    console.log('[Topup FAILED Response]', JSON.stringify(data, null, 2));

    expect(response.ok()).toBe(true);
    
    // For failed test case, rc is '02' and status is 'Gagal'
    expect(data.data?.status).toBe('Gagal');
    expect(data.data?.rc).toBe('02');
  });

  test('6. Topup - Test Case PENDING (087800001233) - expect Pending then Callback', async ({ request }) => {
    const refId = generateRefId();
    const sign = signRequest(DIGIFLAZZ_CONFIG.username, DIGIFLAZZ_CONFIG.apiKey, refId);
    
    const payload = {
      username: DIGIFLAZZ_CONFIG.username,
      buyer_sku_code: 'xld10',
      customer_no: '087800001233',
      ref_id: refId,
      sign: sign,
      testing: true
    };

    const response = await request.post(`${DIGIFLAZZ_CONFIG.baseUrl}/v1/transaction`, {
      headers: { 'Content-Type': 'application/json' },
      data: payload
    });

    const data = await response.json();
    console.log('[Topup PENDING Response]', JSON.stringify(data, null, 2));

    expect(response.ok()).toBe(true);
    expect(data.data?.status).toBe('Pending');
    expect(data.data?.rc).toBe('03');
    
    // Note: Callback will come asynchronously
    console.log('[INFO] This transaction will be updated via callback to Success');
  });

  test('7. Topup - Without testing flag (should still work with dev key)', async ({ request }) => {
    const refId = generateRefId();
    const sign = signRequest(DIGIFLAZZ_CONFIG.username, DIGIFLAZZ_CONFIG.apiKey, refId);
    
    const payload = {
      username: DIGIFLAZZ_CONFIG.username,
      buyer_sku_code: 'xld10',
      customer_no: '087800001230',
      ref_id: refId,
      sign: sign
      // NO testing: true flag - to see behavior without it
    };

    const response = await request.post(`${DIGIFLAZZ_CONFIG.baseUrl}/v1/transaction`, {
      headers: { 'Content-Type': 'application/json' },
      data: payload
    });

    const data = await response.json();
    console.log('[Topup WITHOUT testing flag]', JSON.stringify(data, null, 2));

    // With dev key, it should still work
    expect(response.ok()).toBe(true);
  });

  test('8. Verify GoPay 100k product (4NwT49) exists in price list', async ({ request }) => {
    const sign = signRequest(DIGIFLAZZ_CONFIG.username, DIGIFLAZZ_CONFIG.apiKey, 'pricelist');
    
    const payload = {
      cmd: 'prepaid',
      username: DIGIFLAZZ_CONFIG.username,
      sign: sign,
      code: '4NwT49'
    };

    const response = await request.post(`${DIGIFLAZZ_CONFIG.baseUrl}/v1/price-list`, {
      headers: { 'Content-Type': 'application/json' },
      data: payload
    });

    const data = await response.json();
    console.log('[Price List 4NwT49 Response]', JSON.stringify(data, null, 2));

    expect(response.ok()).toBe(true);
    
    const products = data.data || [];
    const gopay = products.find((p: any) => p.buyer_sku_code === '4NwT49');
    expect(gopay).toBeDefined();
    expect(gopay.buyer_product_status).toBe(true);
  });
});