import { z } from 'zod';
import { ProviderKindSchema } from './evidence.js';

export const VerdictEnum = z.enum(['verified', 'waiting', 'rejected']);
export type Verdict = z.infer<typeof VerdictEnum>;

export const RejectReasonEnum = z.enum([
  'untrusted_link',
  'fetch_failed',
  'not_successful',
  'wrong_receiver',
  'too_old',
  'short_payment',
  'already_used',
]);
export type RejectReason = z.infer<typeof RejectReasonEnum>;

export const VerifySaleRequestSchema = z.object({
  qrText: z.string().min(5).max(2048),
});
export type VerifySaleRequest = z.infer<typeof VerifySaleRequestSchema>;

export const VerificationDecisionSchema = z.object({
  verdict: VerdictEnum,
  rejectReason: RejectReasonEnum.nullable(),
  reasons: z.array(z.string()),
  shortfallMinor: z
    .union([z.bigint(), z.number().int().nonnegative()])
    .nullable()
    .transform((val) => (val !== null ? BigInt(val) : null)),
  matchedAccountId: z.string().uuid().nullable(),
  transactionId: z.string().nullable(),
  provider: ProviderKindSchema.nullable(),
  alertRaised: z.boolean().default(false),
});
export type VerificationDecision = z.infer<typeof VerificationDecisionSchema>;

export const ManualOverrideRequestSchema = z.object({
  ownerPin: z.string().regex(/^\d{4,6}$/, 'Owner PIN must be 4 to 6 digits'),
  reason: z.string().min(5).max(500),
});
export type ManualOverrideRequest = z.infer<typeof ManualOverrideRequestSchema>;
