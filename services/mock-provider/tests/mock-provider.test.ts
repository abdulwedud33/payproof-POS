import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildMockProviderApp } from '../src/server.js';

describe('Mock Provider Server Scenarios', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildMockProviderApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns healthy status', async () => {
    const res = await app.inject({ method: 'GET', url: '/health' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.service).toBe('mock-provider');
  });

  it('serves successful Telebirr receipt (TXN_SUCCESS)', async () => {
    const res = await app.inject({ method: 'GET', url: '/receipt/telebirr/TXN_SUCCESS' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.body).toContain('150.00');
    expect(res.body).toContain('ETB');
    expect(res.body).toContain('SUCCESS');
    expect(res.body).toContain('Addis Mart - Bole Branch');
    expect(res.body).toContain('Ethio Telecom Telebirr');
  });

  it('serves successful CBE receipt with bank branding', async () => {
    const res = await app.inject({ method: 'GET', url: '/receipt/cbe/TXN_SUCCESS' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Commercial Bank of Ethiopia');
    expect(res.body).toContain('150.00');
  });

  it('serves pending scenario (TXN_PENDING)', async () => {
    const res = await app.inject({ method: 'GET', url: '/receipt/telebirr/TXN_PENDING' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('PENDING');
  });

  it('serves failed scenario (TXN_FAILED)', async () => {
    const res = await app.inject({ method: 'GET', url: '/receipt/telebirr/TXN_FAILED' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('FAILED');
  });

  it('serves wrong receiver scenario (TXN_WRONG_RECEIVER)', async () => {
    const res = await app.inject({ method: 'GET', url: '/receipt/telebirr/TXN_WRONG_RECEIVER' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('Unknown Electronics PLC');
  });

  it('serves short payment scenario (TXN_SHORT)', async () => {
    const res = await app.inject({ method: 'GET', url: '/receipt/telebirr/TXN_SHORT' });
    expect(res.statusCode).toBe(200);
    expect(res.body).toContain('50.00');
  });

  it('serves malformed page (TXN_MALFORMED)', async () => {
    const res = await app.inject({ method: 'GET', url: '/receipt/telebirr/TXN_MALFORMED' });
    expect(res.statusCode).toBe(200);
    expect(res.body).not.toContain('receipt-amount');
  });

  it('serves huge response (>500 KB) for testing response size limits (TXN_HUGE)', async () => {
    const res = await app.inject({ method: 'GET', url: '/receipt/telebirr/TXN_HUGE' });
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBeGreaterThan(512000);
  });

  it('redirects to AWS metadata for internal SSRF redirect test', async () => {
    const res = await app.inject({ method: 'GET', url: '/receipt/telebirr/TXN_REDIRECT_INTERNAL' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('http://169.254.169.254/latest/meta-data');
  });

  it('redirects to untrusted external host for external redirect test', async () => {
    const res = await app.inject({ method: 'GET', url: '/receipt/telebirr/TXN_REDIRECT_EXTERNAL' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('https://evil-phishing.com/receipt');
  });

  it('redirects to another allowlisted mock endpoint for benign redirect test', async () => {
    const res = await app.inject({ method: 'GET', url: '/receipt/telebirr/TXN_REDIRECT_OK' });
    expect(res.statusCode).toBe(302);
    expect(res.headers.location).toBe('/receipt/telebirr/TXN_SUCCESS');
  });
});
