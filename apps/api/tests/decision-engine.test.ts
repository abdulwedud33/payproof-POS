import { describe, it, expect } from 'vitest';
import { evaluatePaymentDecision, DecisionSaleContext } from '../src/services/decision-engine.js';
import { SavedPaymentAccount } from '../src/services/receiver-matcher.js';
import { ProviderEvidence } from '@payproof/shared-types';

describe('Pure Decision Engine (TRD 4.4 Rules 1 to 9)', () => {
  const now = new Date('2026-11-22T12:00:00.000Z');

  const sale: DecisionSaleContext = {
    id: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b',
    totalMinor: 15000n, // 150.00 ETB
    branchId: 'branch-1',
    clientCreatedAt: new Date('2026-11-22T11:55:00.000Z'),
  };

  const branchAccounts: SavedPaymentAccount[] = [
    {
      id: 'acc-1',
      branchId: 'branch-1',
      provider: 'telebirr',
      displayLabel: 'Bole Branch Account',
      holderName: 'Addis Mart PLC',
      holderNameNormalized: 'addis mart',
      accountRefLast4: '0789',
      active: true,
    },
  ];

  const validEvidence: ProviderEvidence = {
    provider: 'telebirr',
    transactionId: 'TXN_TEST_12345',
    amountMinor: 15000n,
    currency: 'ETB',
    paymentTimestamp: '2026-11-22T11:50:00.000Z', // 10 minutes ago
    status: 'success',
    receiverName: 'Addis Mart PLC',
    receiverAccountMasked: '1000****0789',
    payerNameMasked: 'Customer A',
    linkHost: 'mock-provider.payproof.internal',
    linkPath: '/receipt',
    rawHash: 'a'.repeat(64),
    httpStatus: 200,
    parserVersion: 'v0.1.0-mock',
    fetchDurationMs: 12,
  };

  it('Rule 1: Rejects untrusted links or SSRF blocked requests', () => {
    const decision = evaluatePaymentDecision(
      null,
      { code: 'UNTRUSTED_LINK', message: 'Host not on allowlist' },
      sale,
      branchAccounts,
      false,
      now
    );
    expect(decision.verdict).toBe('rejected');
    expect(decision.rejectReason).toBe('untrusted_link');
    expect(decision.alertRaised).toBe(true);
  });

  it('Rule 2: Enters WAITING state when fetch or parsing fails', () => {
    const decision = evaluatePaymentDecision(
      null,
      { code: 'TIMEOUT', message: 'Read timed out' },
      sale,
      branchAccounts,
      false,
      now
    );
    expect(decision.verdict).toBe('waiting');
    expect(decision.rejectReason).toBe('fetch_failed');
  });

  it('Rule 3: Enters WAITING state when provider reports pending status', () => {
    const pendingEvidence = { ...validEvidence, status: 'pending' as const };
    const decision = evaluatePaymentDecision(
      pendingEvidence,
      null,
      sale,
      branchAccounts,
      false,
      now
    );
    expect(decision.verdict).toBe('waiting');
    expect(decision.rejectReason).toBeNull();
  });

  it('Rule 4: Rejects when provider reports status as failed or reversed', () => {
    const failedEvidence = { ...validEvidence, status: 'failed' as const };
    const decision = evaluatePaymentDecision(
      failedEvidence,
      null,
      sale,
      branchAccounts,
      false,
      now
    );
    expect(decision.verdict).toBe('rejected');
    expect(decision.rejectReason).toBe('not_successful');
  });

  it('Rule 5: Rejects and raises alert when receiver does not match branch account', () => {
    const wrongReceiverEvidence = {
      ...validEvidence,
      receiverName: 'Different Supermarket PLC',
      receiverAccountMasked: '1000****9999',
    };
    const decision = evaluatePaymentDecision(
      wrongReceiverEvidence,
      null,
      sale,
      branchAccounts,
      false,
      now
    );
    expect(decision.verdict).toBe('rejected');
    expect(decision.rejectReason).toBe('wrong_receiver');
    expect(decision.alertRaised).toBe(true);
  });

  it('Rule 6: Rejects when payment time is older than allowed window (>60 min)', () => {
    const oldEvidence = {
      ...validEvidence,
      paymentTimestamp: '2026-11-22T10:00:00.000Z', // 2 hours ago
    };
    const decision = evaluatePaymentDecision(oldEvidence, null, sale, branchAccounts, false, now);
    expect(decision.verdict).toBe('rejected');
    expect(decision.rejectReason).toBe('too_old');
  });

  it('Rule 7: Rejects when payment amount is less than sale total, returning shortfall', () => {
    const shortEvidence = {
      ...validEvidence,
      amountMinor: 10000n, // Paid 100.00 ETB for 150.00 ETB total
    };
    const decision = evaluatePaymentDecision(shortEvidence, null, sale, branchAccounts, false, now);
    expect(decision.verdict).toBe('rejected');
    expect(decision.rejectReason).toBe('short_payment');
    expect(decision.shortfallMinor).toBe(5000n); // 50.00 ETB shortfall
    expect(decision.alertRaised).toBe(true);
  });

  it('Rule 8: Rejects and raises fraud alert when transaction ID was already consumed', () => {
    const decision = evaluatePaymentDecision(
      validEvidence,
      null,
      sale,
      branchAccounts,
      true, // already consumed
      now
    );
    expect(decision.verdict).toBe('rejected');
    expect(decision.rejectReason).toBe('already_used');
    expect(decision.alertRaised).toBe(true);
  });

  it('Rule 9: Verdict VERIFIED when all rules pass', () => {
    const decision = evaluatePaymentDecision(
      validEvidence,
      null,
      sale,
      branchAccounts,
      false, // unclaimed
      now
    );
    expect(decision.verdict).toBe('verified');
    expect(decision.rejectReason).toBeNull();
    expect(decision.matchedAccountId).toBe('acc-1');
    expect(decision.transactionId).toBe('TXN_TEST_12345');
    expect(decision.provider).toBe('telebirr');
  });

  it('Accepts overpayment and sets verdict to VERIFIED (TRD 4.4)', () => {
    const overpaidEvidence = {
      ...validEvidence,
      amountMinor: 20000n, // Paid 200.00 ETB for 150.00 ETB total
    };
    const decision = evaluatePaymentDecision(
      overpaidEvidence,
      null,
      sale,
      branchAccounts,
      false,
      now
    );
    expect(decision.verdict).toBe('verified');
    expect(decision.shortfallMinor).toBeNull();
  });
});
