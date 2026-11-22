import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../src/app.js';

describe('Reports & Alerts Endpoints (Milestone 6 Done-When)', () => {
  let app: FastifyInstance;
  const orgId = '11111111-1111-1111-1111-111111111111';
  const ownerId = 'owner-001';
  const cashierId = 'cashier-001';
  const boleBranchId = '22222222-2222-2222-2222-222222222221';

  let ownerToken: string;
  let cashierToken: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    ownerToken = app.jwt.sign({
      id: ownerId,
      orgId,
      role: 'owner',
      branchIds: [boleBranchId],
    });

    cashierToken = app.jwt.sign({
      id: cashierId,
      orgId,
      role: 'cashier',
      branchIds: [boleBranchId],
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /v1/reports/summary returns multi-branch aggregated metrics', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/reports/summary',
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.salesCount).toBe(214);
    expect(body.itemsSoldCount).toBe(1102);
    expect(body.totalIncomeMinor).toBe(4823000);
    expect(body.protectedAmountMinor).toBe(482000);
  });

  it('GET /v1/reports/summary filters metrics by branch', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/reports/summary?branch_id=${boleBranchId}`,
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.salesCount).toBe(110);
    expect(body.totalIncomeMinor).toBe(2140000);
  });

  it('GET /v1/reports/breakdown returns dimensional metrics by branch', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/reports/breakdown?dimension=branch',
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.dimension).toBe('branch');
    expect(body.items.length).toBe(3);
    expect(body.items[0].label).toBe('Bole Branch');
    expect(body.items[1].label).toBe('Piassa Branch');
    expect(body.items[2].label).toBe('Adama Branch');
  });

  it('GET /v1/reports/export downloads formula-sanitized CSV', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/reports/export',
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/csv');
    expect(res.body).toContain('PAYPROOF POS - MULTI-BRANCH FINANCIAL REPORT');
    expect(res.body).toContain('Total Sales Count,214');
    expect(res.body).toContain('Bole Branch');
  });

  it('GET /v1/alerts returns real-time fraud alerts', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/alerts',
      headers: { authorization: `Bearer ${ownerToken}` },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.length).toBeGreaterThanOrEqual(3);
    expect(body[0].kind).toBe('duplicate_claim');
    expect(body[0].severity).toBe('critical');
  });

  it('PATCH /v1/alerts/:id/resolve resolves an alert with owner note', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: '/v1/alerts/88888888-8888-8888-8888-888888888801/resolve',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        resolvedNote: 'Customer acknowledged receipt reuse was accidental and paid with another account.',
      },
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.resolved).toBe(true);
    expect(body.resolvedNote).toContain('accidental');
  });

  it('rejects cashier attempting to export reports or resolve alerts (Role authorization)', async () => {
    // 1. Export CSV
    const exportRes = await app.inject({
      method: 'GET',
      url: '/v1/reports/export',
      headers: { authorization: `Bearer ${cashierToken}` },
    });
    expect(exportRes.statusCode).toBe(403);

    // 2. Resolve alert
    const resolveRes = await app.inject({
      method: 'PATCH',
      url: '/v1/alerts/88888888-8888-8888-8888-888888888801/resolve',
      headers: { authorization: `Bearer ${cashierToken}` },
      payload: { resolvedNote: 'Testing unauthorized cashier' },
    });
    expect(resolveRes.statusCode).toBe(403);
  });
});
