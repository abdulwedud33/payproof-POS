import { describe, it, expect, vi, beforeAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { BranchService } from '../src/services/branch-service.js';

describe('Branch Endpoints & Authorization', () => {
  const app = buildApp();
  let ownerToken: string;
  let cashierToken: string;

  beforeAll(async () => {
    await app.ready();
    ownerToken = app.jwt.sign({
      id: 'owner-uuid-1',
      orgId: 'org-uuid-1',
      role: 'owner',
      branchIds: ['branch-1', 'branch-2'],
    });
    cashierToken = app.jwt.sign({
      id: 'cashier-uuid-1',
      orgId: 'org-uuid-1',
      role: 'cashier',
      branchIds: ['branch-1'],
    });
  });

  describe('GET /v1/branches', () => {
    it('allows owner to list all branches', async () => {
      vi.spyOn(BranchService, 'listBranches').mockResolvedValueOnce([
        {
          id: 'branch-1',
          orgId: 'org-uuid-1',
          name: 'Bole Branch',
          city: 'Addis Ababa',
          address: null,
          timezone: 'Africa/Addis_Ababa',
          status: 'active',
          createdAt: new Date().toISOString(),
        },
        {
          id: 'branch-2',
          orgId: 'org-uuid-1',
          name: 'Piassa Branch',
          city: 'Addis Ababa',
          address: null,
          timezone: 'Africa/Addis_Ababa',
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/branches',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body).toHaveLength(2);
    });
  });

  describe('POST /v1/branches', () => {
    it('allows owner to create a branch', async () => {
      vi.spyOn(BranchService, 'createBranch').mockResolvedValueOnce({
        id: 'branch-3',
        orgId: 'org-uuid-1',
        name: 'Adama Branch',
        city: 'Adama',
        address: null,
        timezone: 'Africa/Addis_Ababa',
        status: 'active',
        createdAt: new Date().toISOString(),
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/branches',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          name: 'Adama Branch',
          city: 'Adama',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.name).toBe('Adama Branch');
    });

    it('forbids cashier from creating a branch', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/branches',
        headers: { authorization: `Bearer ${cashierToken}` },
        payload: { name: 'Unauthorized Branch' },
      });

      expect(res.statusCode).toBe(403);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('FORBIDDEN');
    });
  });
});
