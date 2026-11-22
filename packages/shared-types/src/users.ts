import { z } from 'zod';
import { UserRoleSchema, UserStatusSchema, PhoneSchema } from './auth.js';

export const CreateCashierRequestSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  phone: PhoneSchema,
  branchId: z.string().uuid('branchId must be a valid UUID'),
  password: z.string().min(8).max(128).optional(), // Optional on creation; temporary password generated if omitted
  pin: z
    .string()
    .regex(/^\d{4,6}$/, 'PIN must be 4 to 6 numeric digits')
    .optional(),
});
export type CreateCashierRequest = z.infer<typeof CreateCashierRequestSchema>;

export const UpdateCashierRequestSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  branchId: z.string().uuid().optional(),
  status: UserStatusSchema.optional(),
  password: z.string().min(8).max(128).optional(),
  pin: z
    .string()
    .regex(/^\d{4,6}$/)
    .optional(),
});
export type UpdateCashierRequest = z.infer<typeof UpdateCashierRequestSchema>;

export const CashierResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  role: UserRoleSchema,
  fullName: z.string(),
  phone: z.string(),
  status: UserStatusSchema,
  branchId: z.string().uuid().nullable(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});
export type CashierResponse = z.infer<typeof CashierResponseSchema>;
