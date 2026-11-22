import { describe, it, expect, vi, beforeAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { AuthService } from '../src/services/auth-service.js';

describe('Auth Endpoints & Service', () => {
  const app = buildApp();

  beforeAll(async () => {
    await app.ready();
  });

  describe('POST /v1/auth/register-owner', () => {
    it('validates request schema and rejects invalid input', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register-owner',
        payload: {
          businessName: 'F', // too short
          fullName: 'M',
          phone: '12345', // invalid phone
          password: 'short',
        },
      });

      expect(res.statusCode).toBe(400);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('VALIDATION_ERROR');
      expect(body.error.ref).toBeDefined();
    });

    it('successfully registers owner and returns tokens when valid', async () => {
      const mockUser = {
        id: '11111111-1111-4111-a111-111111111111',
        orgId: '22222222-2222-4222-a222-222222222222',
        fullName: 'Meseret Tadesse',
        phone: '+251911223344',
        role: 'owner' as const,
        branchIds: ['33333333-3333-4333-a333-333333333333'],
      };

      vi.spyOn(AuthService, 'registerOwner').mockResolvedValueOnce({
        user: mockUser,
        refreshToken: 'dummy_refresh_token_string',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/register-owner',
        payload: {
          businessName: 'Fresh Mart Supermarket',
          fullName: 'Meseret Tadesse',
          phone: '+251911223344',
          password: 'SecurePassword123!',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.accessToken).toBeDefined();
      expect(body.user.role).toBe('owner');
      expect(body.user.fullName).toBe('Meseret Tadesse');
      expect(res.headers['set-cookie']).toBeDefined();
    });
  });

  describe('POST /v1/auth/login', () => {
    it('rejects with safe message on invalid credentials', async () => {
      vi.spyOn(AuthService, 'login').mockRejectedValueOnce(
        new (await import('@payproof/shared-types')).AppApiError({
          code: 'INVALID_CREDENTIALS',
          message: 'Phone number or password was incorrect.',
          statusCode: 401,
        })
      );

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/login',
        payload: {
          phone: '0911223344',
          password: 'WrongPassword!',
        },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('INVALID_CREDENTIALS');
      expect(body.error.message).toBe('Phone number or password was incorrect.');
      expect(body.error.ref).toBeDefined();
    });
  });

  describe('POST /v1/auth/pin/verify', () => {
    it('requires authentication token', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/pin/verify',
        payload: { pin: '1234' },
      });

      expect(res.statusCode).toBe(401);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('UNAUTHORIZED');
    });

    it('verifies PIN when authenticated', async () => {
      const token = app.jwt.sign({
        id: '11111111-1111-4111-a111-111111111111',
        orgId: '22222222-2222-4222-a222-222222222222',
        role: 'cashier',
        branchIds: ['33333333-3333-4333-a333-333333333333'],
      });

      vi.spyOn(AuthService, 'verifyPin').mockResolvedValueOnce(true);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/auth/pin/verify',
        headers: {
          authorization: `Bearer ${token}`,
        },
        payload: { pin: '1234' },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.body).success).toBe(true);
    });
  });
});
