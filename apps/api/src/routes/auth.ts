import type { FastifyPluginAsync } from 'fastify';
import {
  RegisterOwnerRequestSchema,
  LoginRequestSchema,
  PinVerifyRequestSchema,
  type AuthTokenResponse,
} from '@payproof/shared-types';
import { AuthService } from '../services/auth-service.js';
import { rateLimiters, enforceRateLimit } from '../plugins/rate-limit.js';
import { requireAuth } from '../middleware/auth.js';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // POST /v1/auth/register-owner
  fastify.post('/register-owner', async (request, reply) => {
    await enforceRateLimit(rateLimiters.login, `reg_${request.ip}`, reply);
    const parsed = RegisterOwnerRequestSchema.parse(request.body);

    const { user, refreshToken } = await AuthService.registerOwner(parsed);
    const accessToken = fastify.jwt.sign(user, { expiresIn: '15m' });

    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/v1/auth',
      maxAge: 7 * 24 * 60 * 60,
    });

    const resp: AuthTokenResponse = {
      accessToken,
      user,
    };
    return reply.status(201).send(resp);
  });

  // POST /v1/auth/login
  fastify.post('/login', async (request, reply) => {
    const parsed = LoginRequestSchema.parse(request.body);
    await enforceRateLimit(rateLimiters.login, `login_ip_${request.ip}`, reply);
    await enforceRateLimit(rateLimiters.login, `login_phone_${parsed.phone}`, reply);

    const { user, refreshToken } = await AuthService.login(parsed);
    const accessToken = fastify.jwt.sign(user, { expiresIn: '15m' });

    reply.setCookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/v1/auth',
      maxAge: 7 * 24 * 60 * 60,
    });

    const resp: AuthTokenResponse = {
      accessToken,
      user,
    };
    return reply.status(200).send(resp);
  });

  // POST /v1/auth/pin/verify
  fastify.post('/pin/verify', { preHandler: [requireAuth] }, async (request, reply) => {
    const parsed = PinVerifyRequestSchema.parse(request.body);
    await enforceRateLimit(rateLimiters.pin, `pin_${request.user.id}`, reply);

    await AuthService.verifyPin(request.user.id, parsed.pin);
    return reply.status(200).send({ success: true });
  });

  // POST /v1/auth/logout
  fastify.post('/logout', { preHandler: [requireAuth] }, async (_request, reply) => {
    reply.clearCookie('refresh_token', { path: '/v1/auth' });
    return reply.status(200).send({ success: true });
  });
};
