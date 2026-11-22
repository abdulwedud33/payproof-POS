import { describe, it, expect } from 'vitest';
import {
  normalizeAccountHolderName,
  matchReceiver,
  SavedPaymentAccount,
} from '../src/services/receiver-matcher.js';
import { ProviderEvidence } from '@payproof/shared-types';

describe('Account Holder Normalization & Receiver Matcher (TRD 4.5)', () => {
  it('normalizes corporate suffixes, honorifics, punctuation and spacing', () => {
    expect(normalizeAccountHolderName('Addis Mart P.L.C.')).toBe('addis mart');
    expect(normalizeAccountHolderName('  Addis   Mart   PLC  ')).toBe('addis mart');
    expect(normalizeAccountHolderName('Ato Abebe Bikila')).toBe('abebe bikila');
    expect(normalizeAccountHolderName('W/ro Almaz Wolde')).toBe('almaz wolde');
    expect(normalizeAccountHolderName('Awash Bank Share Company')).toBe('awash bank');
    expect(normalizeAccountHolderName('Bole Supermarket S.C.')).toBe('bole supermarket');
  });

  const branchAccounts: SavedPaymentAccount[] = [
    {
      id: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b',
      branchId: 'branch-1',
      provider: 'telebirr',
      displayLabel: 'Bole Main Account',
      holderName: 'Addis Mart PLC',
      holderNameNormalized: 'addis mart',
      accountRefLast4: '0789',
      active: true,
    },
    {
      id: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6c',
      branchId: 'branch-1',
      provider: 'cbe',
      displayLabel: 'CBE Account',
      holderName: 'Addis Mart Supermarket',
      holderNameNormalized: 'addis mart supermarket',
      accountRefLast4: '4321',
      active: true,
    },
  ];

  const baseEvidence: ProviderEvidence = {
    provider: 'telebirr',
    transactionId: 'TXN100',
    amountMinor: 15000n,
    currency: 'ETB',
    paymentTimestamp: new Date().toISOString(),
    status: 'success',
    receiverName: 'Addis Mart P.L.C.',
    receiverAccountMasked: '1000****0789',
    payerNameMasked: 'Customer A',
    linkHost: 'mock-provider.payproof.internal',
    linkPath: '/receipt',
    rawHash: 'a'.repeat(64),
    httpStatus: 200,
    parserVersion: 'v0.1.0-mock',
    fetchDurationMs: 15,
  };

  it('matches when both normalized name and masked last 4 agree', () => {
    const res = matchReceiver(baseEvidence, branchAccounts);
    expect(res.matches).toBe(true);
    expect(res.matchedAccount?.id).toBe(branchAccounts[0]!.id);
  });

  it('rejects when account number matches but name is different', () => {
    const fraudEvidence: ProviderEvidence = {
      ...baseEvidence,
      receiverName: 'Different Merchant Enterprise',
    };
    const res = matchReceiver(fraudEvidence, branchAccounts);
    expect(res.matches).toBe(false);
    expect(res.reason).toContain('does not match');
  });

  it('rejects when name matches but last 4 is different', () => {
    const fraudEvidence: ProviderEvidence = {
      ...baseEvidence,
      receiverAccountMasked: '1000****9999',
    };
    const res = matchReceiver(fraudEvidence, branchAccounts);
    expect(res.matches).toBe(false);
  });

  it('flags near-match warning for lookalike names (TRD 4.5)', () => {
    // "addis mart" vs "adis mart" (1 letter typo)
    const typoEvidence: ProviderEvidence = {
      ...baseEvidence,
      receiverName: 'Adis Mart PLC',
      receiverAccountMasked: null, // Only name available
    };
    const res = matchReceiver(typoEvidence, branchAccounts);
    expect(res.matches).toBe(false);
    expect(res.nearMatchWarning).toBeDefined();
    expect(res.nearMatchWarning).toContain('Near-match detected');
  });

  it('rejects when branch has no active accounts for that provider', () => {
    const mockEvidence: ProviderEvidence = {
      ...baseEvidence,
      provider: 'mock',
    };
    const res = matchReceiver(mockEvidence, branchAccounts);
    expect(res.matches).toBe(false);
    expect(res.reason).toContain('No active saved mock payment accounts found');
  });
});
