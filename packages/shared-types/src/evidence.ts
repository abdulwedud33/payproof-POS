import { z } from 'zod';
import crypto from 'node:crypto';

export const ProviderKindSchema = z.enum(['telebirr', 'cbe', 'mock']);
export type ProviderKind = z.infer<typeof ProviderKindSchema>;

export const ProviderPaymentStatusSchema = z.enum(['success', 'pending', 'failed', 'reversed']);
export type ProviderPaymentStatus = z.infer<typeof ProviderPaymentStatusSchema>;

export const SafeFetchErrorCodeSchema = z.enum([
  'UNTRUSTED_LINK',
  'SSRF_BLOCKED',
  'TIMEOUT',
  'SIZE_EXCEEDED',
  'FETCH_FAILED',
  'MALFORMED_PAGE',
]);
export type SafeFetchErrorCode = z.infer<typeof SafeFetchErrorCodeSchema>;

export const ProviderEvidenceSchema = z.object({
  provider: ProviderKindSchema,
  transactionId: z.string().min(1).max(64),
  amountMinor: z
    .union([z.bigint(), z.number().int().nonnegative()])
    .transform((val) => BigInt(val)),
  currency: z.literal('ETB').default('ETB'),
  paymentTimestamp: z.string().datetime(),
  status: ProviderPaymentStatusSchema,
  receiverName: z.string().nullable(),
  receiverAccountMasked: z.string().nullable(),
  payerNameMasked: z.string().nullable(),
  linkHost: z.string().min(1),
  linkPath: z.string(),
  rawHash: z
    .string()
    .length(64)
    .regex(/^[a-f0-9]{64}$/i),
  httpStatus: z.number().int().min(100).max(599),
  parserVersion: z.string().min(1),
  fetchDurationMs: z.number().nonnegative(),
});
export type ProviderEvidence = z.infer<typeof ProviderEvidenceSchema>;

export const FetchEvidenceRequestSchema = z.object({
  qrText: z.string().min(5).max(2048),
  saleId: z.string().uuid(),
  providerHint: ProviderKindSchema.optional(),
});
export type FetchEvidenceRequest = z.infer<typeof FetchEvidenceRequestSchema>;

export const SafeFetchErrorSchema = z.object({
  code: SafeFetchErrorCodeSchema,
  message: z.string(),
  details: z.record(z.unknown()).optional(),
});
export type SafeFetchError = z.infer<typeof SafeFetchErrorSchema>;

export const SafeFetchResultSchema = z.discriminatedUnion('ok', [
  z.object({
    ok: z.literal(true),
    evidence: ProviderEvidenceSchema,
  }),
  z.object({
    ok: z.literal(false),
    error: SafeFetchErrorSchema,
  }),
]);
export type SafeFetchResult = z.infer<typeof SafeFetchResultSchema>;

/**
 * Redacts query parameter values from URLs before storage, preserving parameter names for auditing.
 * Prevents accidental logging or retention of session tokens or personal data embedded in query strings.
 */
export function sanitizeLinkUrl(rawUrl: string): {
  host: string;
  path: string;
  sanitizedUrl: string;
} {
  try {
    const parsed = new URL(rawUrl);
    const host = parsed.hostname;
    const path = parsed.pathname;

    const sanitizedParams = new URLSearchParams();
    for (const [key] of parsed.searchParams.entries()) {
      sanitizedParams.set(key, '[REDACTED]');
    }

    const searchString = sanitizedParams.toString() ? `?${sanitizedParams.toString()}` : '';
    const sanitizedUrl = `${parsed.protocol}//${parsed.host}${parsed.pathname}${searchString}`;

    return {
      host,
      path,
      sanitizedUrl,
    };
  } catch {
    return {
      host: 'invalid-url',
      path: rawUrl.slice(0, 64),
      sanitizedUrl: '[INVALID_URL]',
    };
  }
}

/**
 * Computes deterministic SHA-256 hash of raw page contents.
 */
export function computeRawHash(content: string | Uint8Array): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}
