import { z } from 'zod';

export const AlertKindEnum = z.enum([
  'duplicate_claim',
  'wrong_receiver',
  'account_changed',
  'short_payment',
  'untrusted_link',
  'manual_override',
]);
export type AlertKind = z.infer<typeof AlertKindEnum>;

export const AlertSeverityEnum = z.enum(['info', 'warning', 'critical']);
export type AlertSeverity = z.infer<typeof AlertSeverityEnum>;

export const AlertResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  branchId: z.string().uuid().nullable(),
  branchName: z.string().optional(),
  cashierName: z.string().optional(),
  kind: AlertKindEnum,
  severity: AlertSeverityEnum,
  title: z.string(),
  message: z.string(),
  metadata: z.record(z.unknown()),
  resolved: z.boolean().default(false),
  resolvedNote: z.string().nullable().optional(),
  resolvedAt: z.string().datetime().nullable().optional(),
  createdAt: z.string().datetime(),
});
export type AlertResponse = z.infer<typeof AlertResponseSchema>;

export const ResolveAlertSchema = z.object({
  resolvedNote: z.string().min(3).max(500),
});
export type ResolveAlert = z.infer<typeof ResolveAlertSchema>;
