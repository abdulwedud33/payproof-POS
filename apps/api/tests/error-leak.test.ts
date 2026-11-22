import { describe, it, expect } from 'vitest';
import { buildApp } from '../src/app.js';

describe('Error Masking (SECURITY.md Rule S7)', () => {
  const app = buildApp();

  // Route that simulates an internal database exception
  app.get('/test/forced-db-error', async () => {
    const dbErr = new Error('syntax error at or near "SELECT FROM users WHERE org_id = 123"');
    (dbErr as any).code = '42601';
    (dbErr as any).table = 'users';
    throw dbErr;
  });

  it('sanitizes unexpected database errors and exposes zero internal details', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/test/forced-db-error',
    });

    expect(res.statusCode).toBe(500);
    const body = JSON.parse(res.body);

    expect(body.error).toBeDefined();
    expect(body.error.code).toBe('INTERNAL_ERROR');
    expect(body.error.ref).toBeDefined();
    expect(body.error.ref.length).toBe(4); // Short code e.g. 7F3K

    // Critical assertion: raw SQL, table names, and stack traces must never appear
    const rawPayload = res.body;
    expect(rawPayload).not.toContain('syntax error');
    expect(rawPayload).not.toContain('SELECT');
    expect(rawPayload).not.toContain('users');
    expect(rawPayload).not.toContain('42601');
    expect(rawPayload).not.toContain('stack');
  });
});
