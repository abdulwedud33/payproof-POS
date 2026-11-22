import { z } from 'zod';

/**
 * Standard PayProof error response contract.
 * SECURITY.md Rule S7: Users never see backend errors.
 * Every error returns a stable code, a safe message, and a reference ID.
 */
export const ErrorCode = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  RATE_LIMITED: 'RATE_LIMITED',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONFLICT: 'CONFLICT',
  ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
  USER_SUSPENDED: 'USER_SUSPENDED',
  BRANCH_CLOSED: 'BRANCH_CLOSED',
  CROSS_BRANCH_FORBIDDEN: 'CROSS_BRANCH_FORBIDDEN',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  BAD_REQUEST: 'BAD_REQUEST',
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    ref: z.string().optional(),
    details: z.record(z.unknown()).optional(),
  }),
});

export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;

export class AppApiError extends Error {
  public readonly code: ErrorCodeType;
  public readonly statusCode: number;
  public readonly ref?: string;
  public readonly details?: Record<string, unknown>;

  constructor(opts: {
    code: ErrorCodeType;
    message: string;
    statusCode: number;
    ref?: string;
    details?: Record<string, unknown>;
  }) {
    super(opts.message);
    this.name = 'AppApiError';
    this.code = opts.code;
    this.statusCode = opts.statusCode;
    this.ref = opts.ref;
    this.details = opts.details;
  }
}
