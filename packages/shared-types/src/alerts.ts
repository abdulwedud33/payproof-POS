import { z } from 'zod';

export const AlertKindEnum = z.enum([
  'duplicate_claim',
  'wrong_receiver',
  'account_changed',
  'short_payment',
  'untrusted_link',
]);
export type AlertKind = z.infer<typeof AlertKindEnum>;

export const AlertSeverityEnum = z.enum(['info', 'warning', 'critical']);
export type AlertSeverity = z.infer<typeof AlertSeverityEnum>;

export const AlertResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  branchId: z.string().uuid().nullable(),
  kind: AlertKindEnum,
  severity: AlertSeverityEnum,
  title: z.string(),
  message: z.string(),
  metadata: z.record(z.unknown()),
  createdAt: z.string().datetime(),
});
export type AlertResponse = z.infer<typeof AlertResponseSchema>;
