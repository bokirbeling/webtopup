import { describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../app';
import { InMemoryAuthRepository } from '../auth/auth.repository';
import { InMemoryCatalogRepository } from '../catalog/catalog.repository';
import { InMemoryOrderRepository } from '../order/order.repository';
import { InMemoryCommissionRepository } from './commission.repository';
import { InMemoryProviderAuditRepository } from '../audit/provider-audit.repository';

describe('Commission Router', () => {
  const authRepository = new InMemoryAuthRepository();
  const commissionRepository = new InMemoryCommissionRepository();

  const app = createApp({
    authRepository,
    commissionRepository,
    orderRepository: new InMemoryOrderRepository(),
    catalogRepository: new InMemoryCatalogRepository(),
    providerAuditRepository: new InMemoryProviderAuditRepository(),
  });

  it('returns member performance curves', async () => {
    // 1. Register and login
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'reseller-perf@example.com', password: 'password123' });
    const token = regRes.body.token;
    const userId = regRes.body.user.id;

    // 2. Seed some commissions
    await commissionRepository.createCommission({
      orderId: 'order-1',
      resellerId: userId,
      referralCodeId: null,
      discountCodeId: null,
      grossSaleMinor: 100000,
      discountAmountMinor: 0,
      netSaleMinor: 100000,
      commissionPercentage: 5,
      commissionAmountMinor: 5000,
      status: 'payable'
    });

    // 3. Fetch curves
    const res = await request(app)
      .get('/api/account/commission/performance')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.curves).toBeDefined();
    expect(res.body.curves.length).toBeGreaterThan(0);
  });

  it('restricts admin performance curves to admin only', async () => {
    // 1. Register member
    const memRes = await request(app)
      .post('/api/auth/register')
      .send({ email: 'member-perf@example.com', password: 'password123' });
    
    // 2. Try admin route as member
    const res = await request(app)
      .get('/api/admin/commission/performance')
      .set('Authorization', `Bearer ${memRes.body.token}`);
    
    expect(res.status).toBe(403);
  });
});
