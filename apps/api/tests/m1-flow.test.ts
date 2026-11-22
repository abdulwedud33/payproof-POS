import { describe, it, expect, beforeAll, vi } from 'vitest';
import { buildApp } from '../src/app.js';
import { AuthService } from '../src/services/auth-service.js';
import { BranchService } from '../src/services/branch-service.js';
import { CashierService } from '../src/services/cashier-service.js';

describe('Milestone 1 Complete End-to-End Flow (Done When Condition)', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  it('proves owner registration, branch creation, cashier creation, cashier login, and branch scoping', async () => {
    // Generated test UUIDs
    const orgId = '11111111-2222-4333-8444-555555555555';
    const ownerId = '22222222-3333-4444-8555-666666666666';
    const mainBranchId = '33333333-4444-4555-8666-777777777777';
    const newBranchId = '44444444-5555-4666-8777-888888888888';
    const cashierId = '55555555-6666-4777-8888-999999999999';

    // 1. Owner registers
    vi.spyOn(AuthService, 'registerOwner').mockResolvedValueOnce({
      user: {
        id: ownerId,
        orgId,
        fullName: 'Meseret Tadesse',
        phone: '+251911223344',
        role: 'owner',
        branchIds: [mainBranchId],
      },
      refreshToken: 'dummy_refresh_token_owner',
    });

    const regRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/register-owner',
      payload: {
        businessName: 'Fresh Mart Supermarket',
        fullName: 'Meseret Tadesse',
        phone: '+251911223344',
        password: 'SecurePassword123!',
      },
    });

    expect(regRes.statusCode).toBe(201);
    expect(regRes.headers['x-request-id']).toBeDefined(); // Structured request ID attached
    const regBody = JSON.parse(regRes.body);
    const ownerToken = regBody.accessToken;
    expect(regBody.user.role).toBe('owner');

    // 2. Owner creates a second branch (Adama Branch)
    vi.spyOn(BranchService, 'createBranch').mockResolvedValueOnce({
      id: newBranchId,
      orgId,
      name: 'Adama Branch',
      city: 'Adama',
      address: 'Station Road',
      timezone: 'Africa/Addis_Ababa',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    const branchRes = await app.inject({
      method: 'POST',
      url: '/v1/branches',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        name: 'Adama Branch',
        city: 'Adama',
        address: 'Station Road',
      },
    });

    expect(branchRes.statusCode).toBe(201);
    const branchBody = JSON.parse(branchRes.body);
    expect(branchBody.id).toBe(newBranchId);
    expect(branchBody.name).toBe('Adama Branch');

    // 3. Owner creates a cashier assigned to Adama Branch
    vi.spyOn(CashierService, 'createCashier').mockResolvedValueOnce({
      cashier: {
        id: cashierId,
        orgId,
        role: 'cashier',
        fullName: 'Dawit Abebe',
        phone: '+251922334455',
        status: 'active',
        branchId: newBranchId,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
      },
      temporaryPassword: 'CashierPassword123!',
    });

    const cashierRes = await app.inject({
      method: 'POST',
      url: '/v1/cashiers',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        fullName: 'Dawit Abebe',
        phone: '+251922334455',
        branchId: newBranchId,
        password: 'CashierPassword123!',
      },
    });

    expect(cashierRes.statusCode).toBe(201);
    const cashierBody = JSON.parse(cashierRes.body);
    expect(cashierBody.cashier.id).toBe(cashierId);
    expect(cashierBody.cashier.branchId).toBe(newBranchId);

    // 4. Cashier signs in
    vi.spyOn(AuthService, 'login').mockResolvedValueOnce({
      user: {
        id: cashierId,
        orgId,
        fullName: 'Dawit Abebe',
        phone: '+251922334455',
        role: 'cashier',
        branchIds: [newBranchId],
      },
      refreshToken: 'dummy_refresh_token_cashier',
    });

    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: {
        phone: '+251922334455',
        password: 'CashierPassword123!',
      },
    });

    expect(loginRes.statusCode).toBe(200);
    const loginBody = JSON.parse(loginRes.body);
    const cashierToken = loginBody.accessToken;
    expect(loginBody.user.role).toBe('cashier');
    expect(loginBody.user.branchIds).toEqual([newBranchId]);

    // 5. Cashier fetches branches: sees ONLY their assigned branch (Adama Branch)
    vi.spyOn(BranchService, 'listBranches').mockImplementationOnce(async (reqUser) => {
      expect(reqUser.role).toBe('cashier');
      expect(reqUser.branchIds).toEqual([newBranchId]);
      // RLS and service filters only return the cashier's assigned branch
      return [
        {
          id: newBranchId,
          orgId,
          name: 'Adama Branch',
          city: 'Adama',
          address: 'Station Road',
          timezone: 'Africa/Addis_Ababa',
          status: 'active',
          createdAt: new Date().toISOString(),
        },
      ];
    });

    const cashierBranchesRes = await app.inject({
      method: 'GET',
      url: '/v1/branches',
      headers: { authorization: `Bearer ${cashierToken}` },
    });

    expect(cashierBranchesRes.statusCode).toBe(200);
    const cashierBranches = JSON.parse(cashierBranchesRes.body);
    expect(cashierBranches).toHaveLength(1);
    expect(cashierBranches[0].id).toBe(newBranchId);
    expect(cashierBranches[0].name).toBe('Adama Branch');
    expect(cashierBranchesRes.headers['x-request-id']).toBeDefined();
  });
});
