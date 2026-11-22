import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { ZodError } from 'zod';
import crypto from 'crypto';
import { AppApiError, ErrorCode, type ApiErrorResponse } from '@payproof/shared-types';

export { AppApiError, ErrorCode };

export function generateReferenceId(): string {
  return crypto.randomBytes(3).toString('hex').toUpperCase().slice(0, 4);
}

export function globalErrorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  const ref = generateReferenceId();

  // 1. Zod Validation Errors
  if (error instanceof ZodError || error.name === 'ZodError' || 'issues' in error) {
    const formattedErrors: Record<string, string[]> = {};
    const issues = (error as ZodError).issues || [];
    for (const issue of issues) {
      const key = issue.path.join('.') || 'body';
      if (!formattedErrors[key]) formattedErrors[key] = [];
      formattedErrors[key].push(issue.message);
    }

    const payload: ApiErrorResponse = {
      error: {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid input. Please check the provided values.',
        ref,
        details: formattedErrors,
      },
    };
    return reply.status(400).send(payload);
  }

  // 2. Known AppApiError / AppError instances
  if (
    error instanceof AppApiError ||
    error.name === 'AppApiError' ||
    error.name === 'AppError' ||
    ('statusCode' in error && typeof (error as any).statusCode === 'number')
  ) {
    const apiErr = error as any;
    const statusCode = apiErr.statusCode || 400;
    const payload: ApiErrorResponse = {
      error: {
        code: apiErr.code || ErrorCode.BAD_REQUEST,
        message: apiErr.message,
        ref: apiErr.ref || ref,
        details: apiErr.details,
      },
    };
    return reply.status(statusCode).send(payload);
  }

  // 3. Fastify HTTP Errors (e.g. 404, 400 schema error, 415)
  if ('statusCode' in error && typeof error.statusCode === 'number' && error.statusCode < 500) {
    const code = error.statusCode === 404 ? ErrorCode.NOT_FOUND : ErrorCode.BAD_REQUEST;
    const payload: ApiErrorResponse = {
      error: {
        code,
        message: error.message || 'Request failed.',
        ref,
      },
    };
    return reply.status(error.statusCode).send(payload);
  }

  // 4. Unexpected / 500 Server Errors: Log server-side only with ref, sanitize response completely
  request.log.error({
    ref,
    err: error,
    method: request.method,
    url: request.url,
    ip: request.ip,
  }, 'Unhandled internal exception');

  const safePayload: ApiErrorResponse = {
    error: {
      code: ErrorCode.INTERNAL_ERROR,
      message: `Something went wrong on our side. Reference: ${ref}`,
      ref,
    },
  };
  return reply.status(500).send(safePayload);
}
