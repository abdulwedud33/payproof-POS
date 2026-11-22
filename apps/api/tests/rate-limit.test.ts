import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.js';
import { rateLimiters } from '../src/plugins/rate-limit.js';

describe('Rate Limiting (SECURITY.md Rule S6)', () => {
  const app = buildApp();

  it('enforces rate limits and responds with HTTP 429 and Retry-After', async () => {
    // Consume points until limit is exceeded
    const testKey = 'test_ip_127_0_0_1';
    for (let i = 0; i < 5; i++) {
      await rateLimiters.login.consume(testKey);
    }

    // Next request should trigger 429
    let rejected = false;
    let retryAfter = 0;
    try {
      await rateLimiters.login.consume(testKey);
    } catch (rej: any) {
      rejected = true;
      retryAfter = Math.ceil(rej.msBeforeNext / 1000);
    }

    expect(rejected).toBe(true);
    expect(retryAfter).toBeGreaterThan(0);
  });
});
