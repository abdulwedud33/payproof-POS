import { z } from 'zod';

export const BranchStatusSchema = z.enum(['active', 'closed']);
export type BranchStatus = z.infer<typeof BranchStatusSchema>;

export const CreateBranchRequestSchema = z.object({
  name: z.string().trim().min(2).max(100),
  city: z.string().trim().max(100).optional(),
  address: z.string().trim().max(255).optional(),
  timezone: z.string().trim().default('Africa/Addis_Ababa'),
});
export type CreateBranchRequest = z.infer<typeof CreateBranchRequestSchema>;

export const UpdateBranchRequestSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  city: z.string().trim().max(100).optional(),
  address: z.string().trim().max(255).optional(),
  timezone: z.string().trim().optional(),
  status: BranchStatusSchema.optional(),
});
export type UpdateBranchRequest = z.infer<typeof UpdateBranchRequestSchema>;

export const BranchResponseSchema = z.object({
  id: z.string().uuid(),
  orgId: z.string().uuid(),
  name: z.string(),
  city: z.string().nullable(),
  address: z.string().nullable(),
  timezone: z.string(),
  status: BranchStatusSchema,
  createdAt: z.string(),
});
export type BranchResponse = z.infer<typeof BranchResponseSchema>;
