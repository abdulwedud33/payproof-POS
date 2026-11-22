import { FetchEvidenceRequest, SafeFetchResult, ProviderEvidence } from '@payproof/shared-types';
import { safeFetch, SafeFetchException, SafeFetchOptions } from './safe-fetch.js';

export interface VerificationClientConfig {
  verificationServiceUrl?: string;
  allowlistHosts: string[];
  allowHttpForDev?: boolean;
  allowLoopbackForDev?: boolean;
}

export class VerificationClient {
  constructor(private readonly config: VerificationClientConfig) {}

  /**
   * Fetches provider evidence for a scanned QR text link using strict safe fetching and extraction.
   * If an external verification microservice is running, delegates to it over HTTP.
   * Otherwise, executes safe fetching locally with the exact same security boundaries.
   */
  async fetchEvidence(request: FetchEvidenceRequest): Promise<SafeFetchResult> {
    const serviceUrl = this.config.verificationServiceUrl;

    if (serviceUrl) {
      try {
        const res = await fetch(`${serviceUrl}/v1/evidence/fetch`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(request),
        });

        if (res.ok) {
          const data = (await res.json()) as SafeFetchResult;
          return data;
        }
      } catch {
        // Fall back to local safe fetching
      }
    }

    // Direct local safe fetching
    const fetchOptions: SafeFetchOptions = {
      allowlistHosts: this.config.allowlistHosts,
      allowHttpForDev: this.config.allowHttpForDev,
      allowLoopbackForDev: this.config.allowLoopbackForDev,
      maxRedirects: 3,
      connectTimeoutMs: 3000,
      readTimeoutMs: 5000,
      maxBytes: 512000,
    };

    try {
      const fetchRes = await safeFetch(request.qrText, fetchOptions);

      // Parse synthetic mock receipt fields (Milestone 3 mock format)
      const evidence = this.parseMockReceipt(fetchRes, request);
      return { ok: true, evidence };
    } catch (err: any) {
      if (err instanceof SafeFetchException) {
        return {
          ok: false,
          error: {
            code: err.code,
            message: err.message,
            details: err.details,
          },
        };
      }
      return {
        ok: false,
        error: {
          code: 'FETCH_FAILED',
          message: err.message || 'Unknown fetch error',
        },
      };
    }
  }

  private parseMockReceipt(fetchRes: any, request: FetchEvidenceRequest): ProviderEvidence {
    const html: string = fetchRes.body;
    const amountMatch = html.match(/id="receipt-amount">([^<]+)</);
    const txnidMatch = html.match(/id="receipt-txnid">([^<]+)</);
    const dateMatch = html.match(/id="receipt-date">([^<]+)</);
    const statusMatch = html.match(/id="status-badge">([^<]+)</);
    const receiverNameMatch = html.match(/id="receipt-receiver-name">([^<]+)</);
    const receiverAccMatch = html.match(/id="receipt-receiver-account">([^<]+)</);
    const payerNameMatch = html.match(/id="receipt-payer-name">([^<]+)</);

    if (!amountMatch || !txnidMatch || !statusMatch) {
      throw new SafeFetchException(
        'MALFORMED_PAGE',
        'Provider page missing mandatory receipt fields (amount, transaction ID, or status)'
      );
    }

    const rawAmount = amountMatch[1]!.trim().replace(/,/g, '');
    let amountMinor: bigint;
    if (rawAmount.includes('.')) {
      const [birr, santimStr = ''] = rawAmount.split('.');
      const santim = (santimStr + '00').slice(0, 2);
      amountMinor = BigInt(birr!) * 100n + BigInt(santim);
    } else {
      amountMinor = BigInt(rawAmount) * 100n;
    }

    const rawStatus = statusMatch[1]!.trim().toUpperCase();
    let status: 'success' | 'pending' | 'failed' | 'reversed' = 'success';
    if (rawStatus === 'PENDING') status = 'pending';
    else if (rawStatus === 'FAILED') status = 'failed';
    else if (rawStatus === 'REVERSED') status = 'reversed';

    let provider: 'telebirr' | 'cbe' | 'mock' = request.providerHint || 'mock';
    if (request.qrText.toLowerCase().includes('cbe')) provider = 'cbe';
    else if (request.qrText.toLowerCase().includes('telebirr')) provider = 'telebirr';

    return {
      provider,
      transactionId: txnidMatch[1]!.trim(),
      amountMinor,
      currency: 'ETB',
      paymentTimestamp: dateMatch?.[1]?.trim() || new Date().toISOString(),
      status,
      receiverName: receiverNameMatch?.[1]?.trim() || null,
      receiverAccountMasked: receiverAccMatch?.[1]?.trim() || null,
      payerNameMasked: payerNameMatch?.[1]?.trim() || null,
      linkHost: fetchRes.host,
      linkPath: fetchRes.path,
      rawHash: fetchRes.rawHash,
      httpStatus: fetchRes.httpStatus,
      parserVersion: 'v0.1.0-mock',
      fetchDurationMs: Math.round(fetchRes.durationMs),
    };
  }
}
