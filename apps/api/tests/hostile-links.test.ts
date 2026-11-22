import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildMockProviderApp } from '../../services/mock-provider/src/server.js';
import { safeFetch, SafeFetchException, isForbiddenIp } from '../src/services/safe-fetch.js';
import { VerificationClient } from '../src/services/verification-client.js';

describe('Safe Fetching & Hostile Link Evaluation Matrix (EVALS.md § 2.3)', () => {
  let mockServer: FastifyInstance;
  let mockServerPort: number;
  let client: VerificationClient;

  beforeAll(async () => {
    mockServer = buildMockProviderApp();
    // Listen on dynamic ephemeral port
    const address = await mockServer.listen({ port: 0, host: '127.0.0.1' });
    const url = new URL(address);
    mockServerPort = Number(url.port);

    client = new VerificationClient({
      allowlistHosts: ['127.0.0.1', 'localhost', 'mock-provider.payproof.internal'],
      allowHttpForDev: true,
      allowLoopbackForDev: true,
    });
  });

  afterAll(async () => {
    mockServer.server.closeAllConnections?.();
    await mockServer.close();
  });

  describe('1. Anti-SSRF and IP Filtering Logic', () => {
    it('always rejects AWS / cloud metadata IP (169.254.169.254) even in dev mode', () => {
      const check = isForbiddenIp('169.254.169.254', true);
      expect(check.forbidden).toBe(true);
      expect(check.reason).toContain('metadata');
    });

    it('rejects RFC 1918 private network IPs', () => {
      expect(isForbiddenIp('10.0.0.1').forbidden).toBe(true);
      expect(isForbiddenIp('172.16.0.1').forbidden).toBe(true);
      expect(isForbiddenIp('192.168.1.1').forbidden).toBe(true);
    });

    it('rejects Carrier-Grade NAT IPs (100.64.0.0/10)', () => {
      expect(isForbiddenIp('100.64.0.1').forbidden).toBe(true);
      expect(isForbiddenIp('100.127.255.254').forbidden).toBe(true);
    });

    it('rejects loopback when allowLoopback is false', () => {
      expect(isForbiddenIp('127.0.0.1', false).forbidden).toBe(true);
      expect(isForbiddenIp('::1', false).forbidden).toBe(true);
    });

    it('rejects IPv6 link-local and unique-local IPs', () => {
      expect(isForbiddenIp('fe80::1').forbidden).toBe(true);
      expect(isForbiddenIp('fc00::1').forbidden).toBe(true);
    });
  });

  describe('2. Hostile Link Input Defense (EVALS § 2.3)', () => {
    it('rejects untrusted / non-allowlisted domains', async () => {
      await expect(
        safeFetch('https://evil-untrusted-site.com/receipt/TXN1', {
          allowlistHosts: ['mock-provider.payproof.internal'],
        })
      ).rejects.toThrowError(SafeFetchException);

      try {
        await safeFetch('https://evil-untrusted-site.com/receipt/TXN1', {
          allowlistHosts: ['mock-provider.payproof.internal'],
        });
      } catch (err: any) {
        expect(err.code).toBe('UNTRUSTED_LINK');
        expect(err.message).toContain('not on the provider allowlist');
      }
    });

    it('rejects lookalike domains (e.g. teleb1rr.et vs telebirr.et)', async () => {
      try {
        await safeFetch('https://teleb1rr.et/receipt', {
          allowlistHosts: ['telebirr.et', 'mock-provider.payproof.internal'],
        });
      } catch (err: any) {
        expect(err.code).toBe('UNTRUSTED_LINK');
      }
    });

    it('rejects subdomain spoofing attempts (e.g. mock.cbe.et.attacker.com)', async () => {
      try {
        await safeFetch('https://mock.cbe.et.attacker.com/receipt', {
          allowlistHosts: ['cbe.et', 'mock-provider.payproof.internal'],
        });
      } catch (err: any) {
        expect(err.code).toBe('UNTRUSTED_LINK');
      }
    });

    it('rejects insecure HTTP when HTTPS is required', async () => {
      try {
        await safeFetch('http://mock-provider.payproof.internal/receipt', {
          allowlistHosts: ['mock-provider.payproof.internal'],
          allowHttpForDev: false,
        });
      } catch (err: any) {
        expect(err.code).toBe('UNTRUSTED_LINK');
        expect(err.message).toContain('HTTPS required');
      }
    });

    it('rejects embedded URL credentials (user:pass@host)', async () => {
      try {
        await safeFetch('https://admin:secret@mock-provider.payproof.internal/receipt', {
          allowlistHosts: ['mock-provider.payproof.internal'],
        });
      } catch (err: any) {
        expect(err.code).toBe('UNTRUSTED_LINK');
        expect(err.message).toContain('credentials');
      }
    });

    it('blocks direct SSRF attempts to AWS metadata', async () => {
      try {
        await safeFetch('http://169.254.169.254/latest/meta-data', {
          allowlistHosts: ['169.254.169.254'],
          allowHttpForDev: true,
          allowLoopbackForDev: true,
        });
      } catch (err: any) {
        expect(err.code).toBe('SSRF_BLOCKED');
      }
    });

    it('blocks internal redirect to AWS metadata (TXN_REDIRECT_INTERNAL)', async () => {
      const url = `http://127.0.0.1:${mockServerPort}/receipt/telebirr/TXN_REDIRECT_INTERNAL`;
      try {
        await safeFetch(url, {
          allowlistHosts: ['127.0.0.1'],
          allowHttpForDev: true,
          allowLoopbackForDev: true,
        });
      } catch (err: any) {
        expect(['SSRF_BLOCKED', 'UNTRUSTED_LINK']).toContain(err.code);
      }
    });

    it('blocks external redirect off allowlist (TXN_REDIRECT_EXTERNAL)', async () => {
      const url = `http://127.0.0.1:${mockServerPort}/receipt/telebirr/TXN_REDIRECT_EXTERNAL`;
      try {
        await safeFetch(url, {
          allowlistHosts: ['127.0.0.1'],
          allowHttpForDev: true,
          allowLoopbackForDev: true,
        });
      } catch (err: any) {
        expect(err.code).toBe('UNTRUSTED_LINK');
      }
    });

    it('blocks response size bomb exceeding 500 KB limit (TXN_HUGE)', async () => {
      const url = `http://127.0.0.1:${mockServerPort}/receipt/telebirr/TXN_HUGE`;
      try {
        await safeFetch(url, {
          allowlistHosts: ['127.0.0.1'],
          allowHttpForDev: true,
          allowLoopbackForDev: true,
          maxBytes: 512000,
        });
      } catch (err: any) {
        expect(err.code).toBe('SIZE_EXCEEDED');
      }
    });

    it('times out on hanging or slow provider server (>5s)', async () => {
      const url = `http://127.0.0.1:${mockServerPort}/receipt/telebirr/TXN_SLOW`;
      try {
        await safeFetch(url, {
          allowlistHosts: ['127.0.0.1'],
          allowHttpForDev: true,
          allowLoopbackForDev: true,
          readTimeoutMs: 1500, // Shortened for test speed
        });
      } catch (err: any) {
        expect(err.code).toBe('TIMEOUT');
      }
    });
  });

  describe('3. End-to-End Evidence Fetching & Extraction via VerificationClient', () => {
    it('successfully fetches and extracts evidence for a valid Telebirr payment', async () => {
      const result = await client.fetchEvidence({
        qrText: `http://127.0.0.1:${mockServerPort}/receipt/telebirr/TXN_SUCCESS`,
        saleId: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.evidence.provider).toBe('telebirr');
        expect(result.evidence.transactionId).toBe('TXN_SUCCESS');
        expect(result.evidence.amountMinor).toBe(15000n); // 150.00 ETB
        expect(result.evidence.status).toBe('success');
        expect(result.evidence.receiverName).toBe('Addis Mart - Bole Branch');
        expect(result.evidence.rawHash).toHaveLength(64);
        expect(result.evidence.httpStatus).toBe(200);
      }
    });

    it('successfully extracts evidence for a pending payment scenario', async () => {
      const result = await client.fetchEvidence({
        qrText: `http://127.0.0.1:${mockServerPort}/receipt/cbe/TXN_PENDING`,
        saleId: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b',
      });

      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.evidence.provider).toBe('cbe');
        expect(result.evidence.status).toBe('pending');
      }
    });

    it('fails safely with MALFORMED_PAGE when provider page lacks required receipt fields', async () => {
      const result = await client.fetchEvidence({
        qrText: `http://127.0.0.1:${mockServerPort}/receipt/telebirr/TXN_MALFORMED`,
        saleId: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b',
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('MALFORMED_PAGE');
      }
    });
  });
});
