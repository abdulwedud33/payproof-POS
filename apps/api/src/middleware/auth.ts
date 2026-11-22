import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppApiError, ErrorCode, type UserRole } from '@payproof/shared-types';

export interface RequestUser {
  id: string;
  orgId: string;
  role: UserRole;
  branchIds: string[];
}

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: RequestUser;
    user: RequestUser;
  }
}

/**
 * Authentication middleware enforcing JWT token presence and active user status.
 */
export async function requireAuth(request: FastifyRequest, _reply: FastifyReply) {
  try {
    await request.jwtVerify();
  } catch {
    throw new AppApiError({
      code: ErrorCode.UNAUTHORIZED,
      message: 'Authentication required. Please sign in.',
      statusCode: 401,
    });
  }
}

/**
 * Authorization middleware enforcing required user role(s).
 */
export function requireRole(...allowedRoles: UserRole[]) {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new AppApiError({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Authentication required.',
        statusCode: 401,
      });
    }

    if (!allowedRoles.includes(request.user.role)) {
      throw new AppApiError({
        code: ErrorCode.FORBIDDEN,
        message: 'You do not have permission to access this resource.',
        statusCode: 403,
      });
    }
  };
}

/**
 * Cross-branch protection middleware: cashiers may access only their assigned branch.
 */
export function requireBranchScope(branchIdParam: string = 'id') {
  return async (request: FastifyRequest, _reply: FastifyReply) => {
    if (!request.user) {
      throw new AppApiError({
        code: ErrorCode.UNAUTHORIZED,
        message: 'Authentication required.',
        statusCode: 401,
      });
    }

    const targetBranchId = (request.params as Record<string, string>)[branchIdParam];
    if (request.user.role === 'cashier') {
      if (!targetBranchId || !request.user.branchIds.includes(targetBranchId)) {
        throw new AppApiError({
          code: ErrorCode.CROSS_BRANCH_FORBIDDEN,
          message: 'Cashiers may only access their assigned branch.',
          statusCode: 403,
        });
      }
    }
  };
}
