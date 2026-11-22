import { describe, it, expect, vi, beforeAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { CashierService } from '../src/services/cashier-service.js';

describe('Cashier Endpoints & Authorization', () => {
  const app = buildApp();
  let ownerToken: string;
  let cashierToken: string;

  beforeAll(async () => {
    await app.ready();
    ownerToken = app.jwt.sign({
      id: 'owner-uuid-1',
      orgId: 'org-uuid-1',
      role: 'owner',
      branchIds: ['branch-1'],
    });
    cashierToken = app.jwt.sign({
      id: 'cashier-uuid-1',
      orgId: 'org-uuid-1',
      role: 'cashier',
      branchIds: ['branch-1'],
    });
  });

  describe('GET /v1/cashiers', () => {
    it('allows owner to list cashiers', async () => {
      vi.spyOn(CashierService, 'listCashiers').mockResolvedValueOnce([
        {
          id: 'cashier-1',
          orgId: 'org-uuid-1',
          role: 'cashier',
          fullName: 'Dawit Abebe',
          phone: '+251922334455',
          status: 'active',
          branchId: 'branch-1',
          lastLoginAt: null,
          createdAt: new Date().toISOString(),
        },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/cashiers',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(1);
      expect(body[0].fullName).toBe('Dawit Abebe');
    });

    it('forbids cashier from listing cashiers', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/v1/cashiers',
        headers: { authorization: `Bearer ${cashierToken}` },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });

  describe('POST /v1/cashiers', () => {
    it('creates cashier and returns temporary password if omitted', async () => {
      vi.spyOn(CashierService, 'createCashier').mockResolvedValueOnce({
        cashier: {
          id: 'new-cashier-id',
          orgId: 'org-uuid-1',
          role: 'cashier',
          fullName: 'Helen Berhe',
          phone: '+251933445566',
          status: 'active',
          branchId: 'branch-1',
          lastLoginAt: null,
          createdAt: new Date().toISOString(),
        },
        temporaryPassword: 'Pass_temp123!',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/cashiers',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          fullName: 'Helen Berhe',
          phone: '+251933445566',
          branchId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.cashier.fullName).toBe('Helen Berhe');
      expect(body.temporaryPassword).toBe('Pass_temp123!');
    });
  });
});
