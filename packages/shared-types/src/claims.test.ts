import { describe, it, expect } from 'vitest';
import {
  CreatePaymentAccountSchema,
  PaymentAccountResponseSchema,
  VerifySaleRequestSchema,
  VerificationDecisionSchema,
  ManualOverrideRequestSchema,
  AlertResponseSchema,
} from './index.js';

describe('Payment Accounts, Claims & Verification Contracts', () => {
  it('validates CreatePaymentAccountSchema with 4-6 digit owner PIN', () => {
    const valid = CreatePaymentAccountSchema.safeParse({
      branchId: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b',
      provider: 'telebirr',
      displayLabel: 'Bole Branch Main Account',
      holderName: 'Addis Mart PLC',
      accountRef: '1000123456789',
      ownerPin: '1234',
    });
    expect(valid.success).toBe(true);

    const invalidPin = CreatePaymentAccountSchema.safeParse({
      branchId: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b',
      provider: 'cbe',
      displayLabel: 'Test',
      holderName: 'Test',
      accountRef: '1000',
      ownerPin: 'abcd',
    });
    expect(invalidPin.success).toBe(false);
  });

  it('validates VerificationDecisionSchema and shortfall conversion to bigint', () => {
    const valid = VerificationDecisionSchema.safeParse({
      verdict: 'rejected',
      rejectReason: 'short_payment',
      reasons: ['Amount paid 50.00 ETB does not cover total 150.00 ETB'],
      shortfallMinor: 10000,
      matchedAccountId: null,
      transactionId: 'TXN123',
      provider: 'telebirr',
      alertRaised: true,
    });
    expect(valid.success).toBe(true);
    if (valid.success) {
      expect(valid.data.shortfallMinor).toBe(10000n);
      expect(valid.data.alertRaised).toBe(true);
    }
  });

  it('validates ManualOverrideRequestSchema', () => {
    const valid = ManualOverrideRequestSchema.safeParse({
      ownerPin: '9999',
      reason: 'Customer bank app confirmed SMS arrived and manager approved',
    });
    expect(valid.success).toBe(true);

    const tooShortReason = ManualOverrideRequestSchema.safeParse({
      ownerPin: '9999',
      reason: 'ok',
    });
    expect(tooShortReason.success).toBe(false);
  });

  it('validates AlertResponseSchema', () => {
    const valid = AlertResponseSchema.safeParse({
      id: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b',
      orgId: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b',
      branchId: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b',
      kind: 'duplicate_claim',
      severity: 'critical',
      title: 'Double spend attempt detected',
      message: 'Transaction TXN9988 was already claimed by another sale',
      metadata: { transactionId: 'TXN9988' },
      createdAt: new Date().toISOString(),
    });
    expect(valid.success).toBe(true);
  });
});
