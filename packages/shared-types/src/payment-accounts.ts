import { z } from 'zod';
import { ProviderKindSchema } from './evidence.js';

export const CreatePaymentAccountSchema = z.object({
  branchId: z.string().uuid(),
  provider: ProviderKindSchema,
  displayLabel: z.string().min(1).max(100),
  holderName: z.string().min(1).max(150),
  accountRef: z.string().min(4).max(50),
  ownerPin: z.string().regex(/^\d{4,6}$/, 'Owner PIN must be 4 to 6 digits'),
});
export type CreatePaymentAccount = z.infer<typeof CreatePaymentAccountSchema>;

export const PaymentAccountResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  branchId: z.string().uuid(),
  provider: ProviderKindSchema,
  displayLabel: z.string(),
  holderName: z.string(),
  holderNameNormalized: z.string(),
  accountRefLast4: z.string().length(4),
  active: z.boolean(),
  createdAt: z.string().datetime(),
});
export type PaymentAccountResponse = z.infer<typeof PaymentAccountResponseSchema>;

export const DeactivatePaymentAccountSchema = z.object({
  ownerPin: z.string().regex(/^\d{4,6}$/, 'Owner PIN must be 4 to 6 digits'),
});
export type DeactivatePaymentAccount = z.infer<typeof DeactivatePaymentAccountSchema>;
