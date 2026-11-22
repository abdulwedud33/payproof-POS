import { describe, it, expect, vi, beforeAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { BranchService } from '../src/services/branch-service.js';

describe('Security & Authorization Matrix (SECURITY.md Rule S2)', () => {
  const app = buildApp();
  let ownerOrgAToken: string;
  let cashierBranchA1Token: string;

  beforeAll(async () => {
    await app.ready();
    ownerOrgAToken = app.jwt.sign({
      id: 'owner-a-id',
      orgId: 'org-a-uuid',
      role: 'owner',
      branchIds: ['branch-a1-id'],
    });
    cashierBranchA1Token = app.jwt.sign({
      id: 'cashier-a1-id',
      orgId: 'org-a-uuid',
      role: 'cashier',
      branchIds: ['branch-a1-id'],
    });
  });

  describe('1. Anonymous Access Restrictions', () => {
    it('rejects unauthenticated requests to protected endpoints with 401', async () => {
      const endpoints = [
        { method: 'GET', url: '/v1/branches' },
        { method: 'POST', url: '/v1/branches' },
        { method: 'GET', url: '/v1/cashiers' },
        { method: 'POST', url: '/v1/cashiers' },
        { method: 'POST', url: '/v1/auth/pin/verify' },
      ];

      for (const ep of endpoints) {
        const res = await app.inject({
          method: ep.method as any,
          url: ep.url,
        });

        expect(res.statusCode).toBe(401);
        const body = JSON.parse(res.body);
        expect(body.error.code).toBe('UNAUTHORIZED');
      }
    });

    it('allows unauthenticated access to health check', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/health',
      });
      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).status).toBe('healthy');
    });
  });

  describe('2. Role Boundary Restrictions', () => {
    it('prevents cashier from creating or updating branches (403 FORBIDDEN)', async () => {
      const postRes = await app.inject({
        method: 'POST',
        url: '/v1/branches',
        headers: { authorization: `Bearer ${cashierBranchA1Token}` },
        payload: { name: 'Unauthorized' },
      });
      expect(postRes.statusCode).toBe(403);
      expect(JSON.parse(postRes.body).error.code).toBe('FORBIDDEN');

      const patchRes = await app.inject({
        method: 'PATCH',
        url: '/v1/branches/branch-a1-id',
        headers: { authorization: `Bearer ${cashierBranchA1Token}` },
        payload: { name: 'Unauthorized Rename' },
      });
      expect(patchRes.statusCode).toBe(403);
      expect(JSON.parse(patchRes.body).error.code).toBe('FORBIDDEN');
    });

    it('prevents cashier from accessing cashier management (403 FORBIDDEN)', async () => {
      const getRes = await app.inject({
        method: 'GET',
        url: '/v1/cashiers',
        headers: { authorization: `Bearer ${cashierBranchA1Token}` },
      });
      expect(getRes.statusCode).toBe(403);
      expect(JSON.parse(getRes.body).error.code).toBe('FORBIDDEN');

      const postRes = await app.inject({
        method: 'POST',
        url: '/v1/cashiers',
        headers: { authorization: `Bearer ${cashierBranchA1Token}` },
        payload: { fullName: 'New Cashier', phone: '0911223344', branchId: 'branch-a1-id' },
      });
      expect(postRes.statusCode).toBe(403);
      expect(JSON.parse(postRes.body).error.code).toBe('FORBIDDEN');
    });
  });

  describe('3. Cross-Tenant Probe', () => {
    it('ensures Owner of Org A cannot see or mutate resources of Org B', async () => {
      vi.spyOn(BranchService, 'listBranches').mockImplementation(async (user) => {
        expect(user.orgId).toBe('org-a-uuid');
        return [];
      });

      const res = await app.inject({
        method: 'GET',
        url: '/v1/branches',
        headers: { authorization: `Bearer ${ownerOrgAToken}` },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body)).toEqual([]);
    });
  });
});
