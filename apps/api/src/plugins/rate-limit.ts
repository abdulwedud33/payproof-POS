import type { FastifyReply } from 'fastify';
import { RateLimiterMemory, RateLimiterRedis, type RateLimiterRes } from 'rate-limiter-flexible';
import { Redis } from 'ioredis';
import { AppApiError, ErrorCode } from '@payproof/shared-types';
import { config } from '../config.js';

let redisClient: Redis | null = null;
if (process.env.NODE_ENV !== 'test' && !process.env.VITEST) {
  try {
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      lazyConnect: true,
    });
    redisClient.on('error', () => {
      // Suppress unhandled redis error events
    });
    redisClient.connect().catch(() => {
      redisClient = null;
    });
  } catch {
    redisClient = null;
  }
}

function createLimiter(points: number, durationSeconds: number, keyPrefix: string) {
  if (redisClient && redisClient.status === 'ready') {
    return new RateLimiterRedis({
      storeClient: redisClient,
      points,
      duration: durationSeconds,
      keyPrefix,
    });
  }
  return new RateLimiterMemory({
    points,
    duration: durationSeconds,
    keyPrefix,
  });
}

// Rate limiter definitions per SECURITY.md S6
export const rateLimiters = {
  login: createLimiter(5, 900, 'rl_login'),
  pin: createLimiter(5, 600, 'rl_pin'),
  authenticated: createLimiter(120, 60, 'rl_auth'),
  unauthenticated: createLimiter(30, 60, 'rl_unauth'),
};

export async function enforceRateLimit(
  limiter: RateLimiterMemory | RateLimiterRedis,
  key: string,
  reply: FastifyReply
): Promise<void> {
  try {
    const res = await limiter.consume(key);
    reply.header('X-RateLimit-Limit', limiter.points);
    reply.header('X-RateLimit-Remaining', res.remainingPoints);
    reply.header('X-RateLimit-Reset', new Date(Date.now() + res.msBeforeNext).toISOString());
  } catch (rej) {
    const res = rej as RateLimiterRes;
    const retrySec = Math.ceil(res.msBeforeNext / 1000);
    reply.header('Retry-After', retrySec);
    throw new AppApiError({
      code: ErrorCode.RATE_LIMITED,
      message: `Too many tries. Wait ${retrySec} seconds and try again.`,
      statusCode: 429,
    });
  }
}
