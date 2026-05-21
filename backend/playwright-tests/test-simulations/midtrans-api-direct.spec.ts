import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';

/**
 * Direct Midtrans API Test
 * Tests the Midtrans Payment API directly without going through the checkout flow
 * 
 * Sandbox Environment: https://api.sandbox.midtrans.com
 * Server Key: SB-Mid-server-qJvT62BTwM7X169rmYTew6dK
 */

const MIDTRANS_CONFIG = {
  serverKey: 'SB-Mid-server-qJvT62BTwM7X169rmYTew6dK',
  baseUrl: 'https://api.sandbox.midtrans.com'
};

function generateAuthHeader(serverKey: string): string {
  return 'Basic ' + Buffer.from(serverKey + ':').toString('base64');
}

function generateOrderId(): string {
  return `TEST-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

test.describe('Midtrans Direct API Tests', () => {
  
  test('1. Create Snap Token', async ({ request }) => {
    const orderId = generateOrderId();
    
    const payload = {
      transaction_details: {
        order_id: orderId,
        gross_amount: 10000
      },
      credit_card: {
        secure: true
      },
      customer_details: {
        first_name: 'Test',
        last_name: 'User',
        email: 'test@example.com',
        phone: '081234567890'
      },
      item_details: [
        {
          id: 'xld10',
          price: 10000,
          quantity: 1,
          name: 'XL 10.000 Sandbox Test'
        }
      ]
    };

    const response = await request.post(`${MIDTRANS_CONFIG.baseUrl}/snap/v1/transactions`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': generateAuthHeader(MIDTRANS_CONFIG.serverKey)
      },
      data: payload
    });

    const data = await response.json();
    console.log('[Snap Token Response]', JSON.stringify(data, null, 2));

    expect(response.ok()).toBe(true);
    expect(data.token).toBeDefined();
    expect(data.redirect_url).toBeDefined();
  });

  test('2. Charge - Bank Transfer BCA', async ({ request }) => {
    const orderId = generateOrderId();
    
    const payload = {
      payment_type: 'bank_transfer',
      transaction_details: {
        order_id: orderId,
        gross_amount: 10000
      },
      bank_transfer: {
        bank: 'bca'
      }
    };

    const response = await request.post(`${MIDTRANS_CONFIG.baseUrl}/v2/charge`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': generateAuthHeader(MIDTRANS_CONFIG.serverKey)
      },
      data: payload
    });

    const data = await response.json();
    console.log('[BCA Transfer Response]', JSON.stringify(data, null, 2));

    expect(response.ok()).toBe(true);
    expect(data.status_code).toBe('201');
    expect(data.transaction_status).toBe('pending');
    expect(data.va_numbers).toBeDefined();
    expect(data.va_numbers[0].bank).toBe('bca');
  });

  test('3. Charge - Bank Transfer BRI', async ({ request }) => {
    const orderId = generateOrderId();
    
    const payload = {
      payment_type: 'bank_transfer',
      transaction_details: {
        order_id: orderId,
        gross_amount: 10000
      },
      bank_transfer: {
        bank: 'bri'
      }
    };

    const response = await request.post(`${MIDTRANS_CONFIG.baseUrl}/v2/charge`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': generateAuthHeader(MIDTRANS_CONFIG.serverKey)
      },
      data: payload
    });

    const data = await response.json();
    console.log('[BRI Transfer Response]', JSON.stringify(data, null, 2));

    expect(response.ok()).toBe(true);
    expect(data.status_code).toBe('201');
    expect(data.va_numbers[0].bank).toBe('bri');
  });

  test('4. Charge - Bank Transfer BNI', async ({ request }) => {
    const orderId = generateOrderId();
    
    const payload = {
      payment_type: 'bank_transfer',
      transaction_details: {
        order_id: orderId,
        gross_amount: 10000
      },
      bank_transfer: {
        bank: 'bni'
      }
    };

    const response = await request.post(`${MIDTRANS_CONFIG.baseUrl}/v2/charge`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': generateAuthHeader(MIDTRANS_CONFIG.serverKey)
      },
      data: payload
    });

    const data = await response.json();
    console.log('[BNI Transfer Response]', JSON.stringify(data, null, 2));

    expect(response.ok()).toBe(true);
    expect(data.status_code).toBe('201');
    expect(data.va_numbers[0].bank).toBe('bni');
  });

  test('5. Charge - GoPay', async ({ request }) => {
    const orderId = generateOrderId();
    
    const payload = {
      payment_type: 'gopay',
      transaction_details: {
        order_id: orderId,
        gross_amount: 10000
      },
      gopay: {
        enable_callback: true
      }
    };

    const response = await request.post(`${MIDTRANS_CONFIG.baseUrl}/v2/charge`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': generateAuthHeader(MIDTRANS_CONFIG.serverKey)
      },
      data: payload
    });

    const data = await response.json();
    console.log('[GoPay Response]', JSON.stringify(data, null, 2));

    expect(response.ok()).toBe(true);
    expect(data.status_code).toBe('201');
    expect(data.transaction_status).toBe('pending');
    expect(data.actions).toBeDefined();
  });

  test('6. Charge - Credit Card (Accept Transaction)', async ({ request }) => {
    const orderId = generateOrderId();
    
    // Test card numbers from Midtrans documentation:
    // Accept Transaction: 4811 1111 1111 1114 (Visa), 5810 1111 1111 1112 (Master)
    const payload = {
      payment_type: 'credit_card',
      transaction_details: {
        order_id: orderId,
        gross_amount: 10000
      },
      credit_card: {
        token_id: '4811111111111114', // Test Visa card
        authentication: true
      }
    };

    const response = await request.post(`${MIDTRANS_CONFIG.baseUrl}/v2/charge`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': generateAuthHeader(MIDTRANS_CONFIG.serverKey)
      },
      data: payload
    });

    const data = await response.json();
    console.log('[Credit Card Accept Response]', JSON.stringify(data, null, 2));

    // 201 = success with 3DS, 200 = success without 3DS, 402 = not activated
    expect([200, 201, 402]).toContain(response.status());
  });

  test('7. Get Transaction Status', async ({ request }) => {
    // First create a transaction
    const orderId = generateOrderId();
    
    const chargePayload = {
      payment_type: 'bank_transfer',
      transaction_details: {
        order_id: orderId,
        gross_amount: 10000
      },
      bank_transfer: {
        bank: 'bca'
      }
    };

    const chargeResponse = await request.post(`${MIDTRANS_CONFIG.baseUrl}/v2/charge`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': generateAuthHeader(MIDTRANS_CONFIG.serverKey)
      },
      data: chargePayload
    });

    const chargeData = await chargeResponse.json();
    console.log('[Created Order ID]', orderId);

    // Now get the status
    const statusResponse = await request.get(
      `${MIDTRANS_CONFIG.baseUrl}/v2/${orderId}/status`,
      {
        headers: {
          'Authorization': generateAuthHeader(MIDTRANS_CONFIG.serverKey)
        }
      }
    );

    const statusData = await statusResponse.json();
    console.log('[Transaction Status Response]', JSON.stringify(statusData, null, 2));

    expect(statusResponse.ok()).toBe(true);
    expect(statusData.order_id).toBe(orderId);
    expect(statusData.transaction_status).toBe('pending');
  });

  test('8. Invalid Server Key (should fail)', async ({ request }) => {
    const orderId = generateOrderId();
    
    const payload = {
      payment_type: 'bank_transfer',
      transaction_details: {
        order_id: orderId,
        gross_amount: 10000
      },
      bank_transfer: {
        bank: 'bca'
      }
    };

    const response = await request.post(`${MIDTRANS_CONFIG.baseUrl}/v2/charge`, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': 'Basic InvalidServerKey123:'
      },
      data: payload
    });

    const data = await response.json();
    console.log('[Invalid Key Response]', JSON.stringify(data, null, 2));

    expect(response.status()).toBe(401);
    expect(data.status_code).toBe('401');
  });
});