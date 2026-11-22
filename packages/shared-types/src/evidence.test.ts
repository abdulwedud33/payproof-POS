import { describe, it, expect } from 'vitest';
import {
  ProviderEvidenceSchema,
  FetchEvidenceRequestSchema,
  SafeFetchResultSchema,
  sanitizeLinkUrl,
  computeRawHash,
} from './evidence.js';

describe('Evidence Contract & Safe Fetch Schemas', () => {
  it('validates a complete ProviderEvidence payload', () => {
    const rawEvidence = {
      provider: 'telebirr',
      transactionId: 'TXN123456789',
      amountMinor: 15000,
      currency: 'ETB',
      paymentTimestamp: '2026-11-22T10:00:00.000Z',
      status: 'success',
      receiverName: 'Addis Mart Supermarket',
      receiverAccountMasked: '1000****789',
      payerNameMasked: 'Abebe B***',
      linkHost: 'mock-provider.payproof.internal',
      linkPath: '/receipt/telebirr/TXN123456789',
      rawHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      httpStatus: 200,
      parserVersion: 'v0.1.0-mock',
      fetchDurationMs: 42.5,
    };

    const parsed = ProviderEvidenceSchema.safeParse(rawEvidence);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.amountMinor).toBe(15000n);
      expect(parsed.data.provider).toBe('telebirr');
    }
  });

  it('rejects invalid hashes or amounts in ProviderEvidence', () => {
    const invalidEvidence = {
      provider: 'unknown_provider',
      transactionId: 'TXN123',
      amountMinor: -50,
      currency: 'USD',
      paymentTimestamp: 'not-a-date',
      status: 'invalid_status',
      rawHash: 'short-hash',
    };

    const parsed = ProviderEvidenceSchema.safeParse(invalidEvidence);
    expect(parsed.success).toBe(false);
  });

  it('validates FetchEvidenceRequest with UUID saleId and length bounds', () => {
    const valid = FetchEvidenceRequestSchema.safeParse({
      qrText: 'https://mock-provider.payproof.internal/receipt/cbe/TXN_001',
      saleId: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b',
      providerHint: 'cbe',
    });
    expect(valid.success).toBe(true);

    const invalid = FetchEvidenceRequestSchema.safeParse({
      qrText: 'bad',
      saleId: 'not-a-uuid',
    });
    expect(invalid.success).toBe(false);
  });

  it('discriminated union SafeFetchResult works for both success and error branches', () => {
    const successResult = {
      ok: true,
      evidence: {
        provider: 'mock',
        transactionId: 'MOCK_001',
        amountMinor: 5000,
        currency: 'ETB',
        paymentTimestamp: '2026-11-22T10:00:00.000Z',
        status: 'pending',
        receiverName: null,
        receiverAccountMasked: null,
        payerNameMasked: null,
        linkHost: 'mock-provider.payproof.internal',
        linkPath: '/receipt/mock/MOCK_001',
        rawHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        httpStatus: 200,
        parserVersion: 'v0.1.0-mock',
        fetchDurationMs: 15,
      },
    };
    expect(SafeFetchResultSchema.safeParse(successResult).success).toBe(true);

    const errorResult = {
      ok: false,
      error: {
        code: 'SSRF_BLOCKED',
        message: 'Destination IP resolved to private network',
        details: { target: '127.0.0.1' },
      },
    };
    expect(SafeFetchResultSchema.safeParse(errorResult).success).toBe(true);
  });

  it('redacts URL query parameter values to protect personal data and secrets', () => {
    const raw = 'https://telebirr.et/receipt?token=secret123&payer=Dawit&account=0911223344';
    const sanitized = sanitizeLinkUrl(raw);

    expect(sanitized.host).toBe('telebirr.et');
    expect(sanitized.path).toBe('/receipt');
    expect(sanitized.sanitizedUrl).toContain('token=%5BREDACTED%5D');
    expect(sanitized.sanitizedUrl).toContain('payer=%5BREDACTED%5D');
    expect(sanitized.sanitizedUrl).not.toContain('secret123');
    expect(sanitized.sanitizedUrl).not.toContain('Dawit');
  });

  it('computes deterministic SHA-256 hash', () => {
    const hash1 = computeRawHash('<html>Receipt Data</html>');
    const hash2 = computeRawHash('<html>Receipt Data</html>');
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64);
  });
});
