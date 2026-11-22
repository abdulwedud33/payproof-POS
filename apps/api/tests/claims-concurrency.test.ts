import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildMockProviderApp } from '../../services/mock-provider/src/server.js';
import { VerificationService } from '../src/services/verification-service.js';
import { buildApp } from '../src/app.js';
import { config } from '../src/config.js';

describe('Payment Claims Concurrency & Double-Spend Defense (Milestone 4 Done-When)', () => {
  let mockServer: FastifyInstance;
  let mockServerPort: number;
  let app: FastifyInstance;

  const orgId = '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b';
  const branchId = '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6c';
  const ownerId = '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6d';
  const cashierId = '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6e';

  let ownerToken: string;
  let cashierToken: string;

  beforeAll(async () => {
    mockServer = buildMockProviderApp();
    const address = await mockServer.listen({ port: 0, host: '127.0.0.1' });
    const url = new URL(address);
    mockServerPort = Number(url.port);

    app = buildApp();
    await app.ready();

    ownerToken = app.jwt.sign({
      id: ownerId,
      orgId,
      role: 'owner',
      branchIds: [branchId],
    });

    cashierToken = app.jwt.sign({
      id: cashierId,
      orgId,
      role: 'cashier',
      branchIds: [branchId],
    });
  });

  afterAll(async () => {
    mockServer.server.closeAllConnections?.();
    await mockServer.close();
    await app.close();
  });

  beforeEach(() => {
    VerificationService.resetClaims();
  });

  it('proves that under 100 simultaneous concurrent claims, exactly 1 succeeds and 99 are rejected as already_used', async () => {
    const qrUrl = `http://127.0.0.1:${mockServerPort}/receipt/telebirr/TXN_CONCURRENCY_STRESS`;

    // Dispatch 100 simultaneous verification attempts for 100 different sale IDs
    const concurrentAttempts = Array.from({ length: 100 }, (_, i) => {
      const saleId = `018f3a2b-4c5d-7e8f-9a0b-${String(i).padStart(12, '0')}`;
      return VerificationService.verifyMobileMoney(
        orgId,
        cashierId,
        [branchId],
        saleId,
        { qrText: qrUrl },
        {
          mockSale: { totalMinor: 15000n, branchId },
        }
      );
    });

    const results = await Promise.all(concurrentAttempts);

    const verifiedCount = results.filter((r) => r.verdict === 'verified').length;
    const alreadyUsedCount = results.filter(
      (r) => r.verdict === 'rejected' && r.rejectReason === 'already_used'
    ).length;

    // Strict non-negotiable invariant: exactly 1 claim succeeds, 99 fail with already_used
    expect(verifiedCount).toBe(1);
    expect(alreadyUsedCount).toBe(99);

    // Assert fraud alert was raised on rejected attempts
    const rejectedAlerts = results.filter((r) => r.alertRaised).length;
    expect(rejectedAlerts).toBe(99);
  });

  it('rejects sequential re-use of the same payment transaction ID', async () => {
    const qrUrl = `http://127.0.0.1:${mockServerPort}/receipt/telebirr/TXN_SEQUENTIAL_REUSE`;

    // 1. First sale verifies payment
    const firstResult = await VerificationService.verifyMobileMoney(
      orgId,
      cashierId,
      [branchId],
      'sale-001',
      { qrText: qrUrl },
      { mockSale: { totalMinor: 15000n, branchId } }
    );
    expect(firstResult.verdict).toBe('verified');

    // 2. Second sale attempts to claim the same transaction ID
    const secondResult = await VerificationService.verifyMobileMoney(
      orgId,
      cashierId,
      [branchId],
      'sale-002',
      { qrText: qrUrl },
      { mockSale: { totalMinor: 15000n, branchId } }
    );
    expect(secondResult.verdict).toBe('rejected');
    expect(secondResult.rejectReason).toBe('already_used');
    expect(secondResult.alertRaised).toBe(true);
  });

  it('allows owner to add payment account with valid PIN and rejects invalid PIN', async () => {
    // 1. Invalid owner PIN -> 403 Forbidden
    const badPinRes = await app.inject({
      method: 'POST',
      url: '/v1/payment-accounts',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        branchId,
        provider: 'telebirr',
        displayLabel: 'Bole Main Account',
        holderName: 'Addis Mart PLC',
        accountRef: '1000123456789',
        ownerPin: '0000', // incorrect PIN
      },
    });
    expect(badPinRes.statusCode).toBe(403);

    // 2. Valid owner PIN -> 201 Created with masked last 4
    const goodPinRes = await app.inject({
      method: 'POST',
      url: '/v1/payment-accounts',
      headers: { authorization: `Bearer ${ownerToken}` },
      payload: {
        branchId,
        provider: 'telebirr',
        displayLabel: 'Bole Main Account',
        holderName: 'Addis Mart PLC',
        accountRef: '1000123456789',
        ownerPin: '1234',
      },
    });
    expect(goodPinRes.statusCode).toBe(201);
    const body = JSON.parse(goodPinRes.body);
    expect(body.accountRefLast4).toBe('6789');
    expect(body.holderNameNormalized).toBe('addis mart');
  });

  it('rejects cashier attempting to create payment accounts (Role restriction)', async () => {
    const cashierRes = await app.inject({
      method: 'POST',
      url: '/v1/payment-accounts',
      headers: { authorization: `Bearer ${cashierToken}` },
      payload: {
        branchId,
        provider: 'telebirr',
        displayLabel: 'Fake',
        holderName: 'Fake',
        accountRef: '10001234',
        ownerPin: '1234',
      },
    });
    expect(cashierRes.statusCode).toBe(403);
  });

  it('allows manual override with valid owner PIN and rejects invalid PIN', async () => {
    // 1. Invalid PIN -> 403
    const badRes = await app.inject({
      method: 'POST',
      url: '/v1/sales/sale-override-test/override',
      headers: { authorization: `Bearer ${cashierToken}` },
      payload: {
        ownerPin: '0000',
        reason: 'Customer bank app showed debit and owner approved verbally',
      },
    });
    expect(badRes.statusCode).toBe(403);

    // 2. Valid PIN -> 200 OK
    const goodRes = await app.inject({
      method: 'POST',
      url: '/v1/sales/sale-override-test/override',
      headers: { authorization: `Bearer ${cashierToken}` },
      payload: {
        ownerPin: '1234',
        reason: 'Customer bank app showed debit and owner approved verbally',
      },
    });
    expect(goodRes.statusCode).toBe(200);
    const body = JSON.parse(goodRes.body);
    expect(body.status).toBe('paid');
  });
});
