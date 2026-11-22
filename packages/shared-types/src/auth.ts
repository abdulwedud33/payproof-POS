import { z } from 'zod';

export const UserRoleSchema = z.enum(['owner', 'manager', 'cashier']);
export type UserRole = z.infer<typeof UserRoleSchema>;

export const UserStatusSchema = z.enum(['active', 'suspended', 'deleted']);
export type UserStatus = z.infer<typeof UserStatusSchema>;

export const PhoneSchema = z
  .string()
  .trim()
  .regex(/^(\+251|0)[97]\d{8}$/, 'Must be a valid Ethiopian phone number (e.g., +251911223344 or 0911223344)');

export const RegisterOwnerRequestSchema = z.object({
  businessName: z.string().trim().min(2).max(100),
  fullName: z.string().trim().min(2).max(100),
  phone: PhoneSchema,
  email: z.string().email().optional(),
  password: z.string().min(8).max(128),
  firstBranchName: z.string().trim().min(2).max(100).default('Main Branch'),
  city: z.string().trim().max(100).default('Addis Ababa'),
});
export type RegisterOwnerRequest = z.infer<typeof RegisterOwnerRequestSchema>;

export const LoginRequestSchema = z.object({
  phone: PhoneSchema,
  password: z.string().min(1).max(128),
});
export type LoginRequest = z.infer<typeof LoginRequestSchema>;

export const PinVerifyRequestSchema = z.object({
  pin: z.string().regex(/^\d{4,6}$/, 'PIN must be 4 to 6 numeric digits'),
});
export type PinVerifyRequest = z.infer<typeof PinVerifyRequestSchema>;

export const AuthTokenResponseSchema = z.object({
  accessToken: z.string(),
  user: z.object({
    id: z.string().uuid(),
    orgId: z.string().uuid(),
    fullName: z.string(),
    phone: z.string(),
    role: UserRoleSchema,
    branchIds: z.array(z.string().uuid()),
  }),
});
export type AuthTokenResponse = z.infer<typeof AuthTokenResponseSchema>;
