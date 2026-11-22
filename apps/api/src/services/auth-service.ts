import argon2 from 'argon2';
import crypto from 'crypto';
import {
  AppApiError,
  ErrorCode,
  type RegisterOwnerRequest,
  type LoginRequest,
  type AuthTokenResponse,
  type UserRole,
} from '@payproof/shared-types';
import { withTenantTransaction, dbPool } from '../plugins/db.js';

export async function hashSecret(secret: string): Promise<string> {
  return argon2.hash(secret, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifySecret(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class AuthService {
  /**
   * Registers a new organization, owner account, and default branch in one atomic transaction.
   */
  static async registerOwner(req: RegisterOwnerRequest): Promise<{
    user: AuthTokenResponse['user'];
    refreshToken: string;
  }> {
    // Check if phone already registered
    const existing = await dbPool.query('SELECT id FROM users WHERE phone = $1', [req.phone]);
    if (existing.rows.length > 0) {
      throw new AppApiError({
        code: ErrorCode.CONFLICT,
        message: 'A user with this phone number already exists.',
        statusCode: 409,
      });
    }

    const passwordHash = await hashSecret(req.password);
    const orgId = crypto.randomUUID();
    const userId = crypto.randomUUID();
    const branchId = crypto.randomUUID();

    // Context for RLS during initial setup
    const ctx = { orgId, userId, role: 'owner' as UserRole, branchIds: [branchId] };

    await withTenantTransaction(ctx, async (client) => {
      // 1. Create Organization
      await client.query(
        `INSERT INTO organizations (id, name, void_pin_limit_minor, receipt_retention_days)
         VALUES ($1, $2, 0, 30)`,
        [orgId, req.businessName]
      );

      // 2. Create Owner User
      await client.query(
        `INSERT INTO users (id, org_id, role, full_name, phone, email, password_hash, status)
         VALUES ($1, $2, 'owner', $3, $4, $5, $6, 'active')`,
        [userId, orgId, req.fullName, req.phone, req.email ?? null, passwordHash]
      );

      // 3. Create Default Branch
      await client.query(
        `INSERT INTO branches (id, org_id, name, city, timezone, status)
         VALUES ($1, $2, $3, $4, 'Africa/Addis_Ababa', 'active')`,
        [branchId, orgId, req.firstBranchName || 'Main Branch', req.city || 'Addis Ababa']
      );

      // 4. Assign Owner to Branch
      await client.query(
        `INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2)`,
        [userId, branchId]
      );

      // 5. Audit Log
      await client.query(
        `INSERT INTO audit_logs (org_id, actor_id, actor_role, action, entity_type, entity_id, meta)
         VALUES ($1, $2, 'owner', 'owner.register', 'organization', $1, $3)`,
        [orgId, userId, JSON.stringify({ businessName: req.businessName, branchName: req.firstBranchName })]
      );
    });

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    await withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [userId, tokenHash, expiresAt]
      );
    });

    return {
      user: {
        id: userId,
        orgId,
        fullName: req.fullName,
        phone: req.phone,
        role: 'owner',
        branchIds: [branchId],
      },
      refreshToken,
    };
  }

  /**
   * Authenticates a user (owner or cashier) by phone + password.
   */
  static async login(req: LoginRequest): Promise<{
    user: AuthTokenResponse['user'];
    refreshToken: string;
  }> {
    // Lookup user by phone
    const res = await dbPool.query(
      `SELECT u.id, u.org_id, u.role, u.full_name, u.phone, u.password_hash, u.status,
              u.failed_logins, u.locked_until,
              COALESCE(array_agg(ub.branch_id) FILTER (WHERE ub.branch_id IS NOT NULL), '{}') AS branch_ids
       FROM users u
       LEFT JOIN user_branches ub ON ub.user_id = u.id
       WHERE u.phone = $1 AND u.status <> 'deleted'
       GROUP BY u.id`,
      [req.phone]
    );

    if (res.rows.length === 0) {
      throw new AppApiError({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: 'Phone number or password was incorrect.',
        statusCode: 401,
      });
    }

    const row = res.rows[0];

    // Check account lockout
    if (row.locked_until && new Date(row.locked_until) > new Date()) {
      throw new AppApiError({
        code: ErrorCode.ACCOUNT_LOCKED,
        message: 'Account is temporarily locked due to repeated failed logins. Please try again later.',
        statusCode: 403,
      });
    }

    // Check account status
    if (row.status === 'suspended') {
      throw new AppApiError({
        code: ErrorCode.USER_SUSPENDED,
        message: 'This account has been suspended. Please contact your manager or owner.',
        statusCode: 403,
      });
    }

    // Verify password with Argon2id
    const isValid = await verifySecret(row.password_hash, req.password);
    if (!isValid) {
      const failed = row.failed_logins + 1;
      const lockedUntil = failed >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null;

      await dbPool.query(
        `UPDATE users SET failed_logins = $1, locked_until = $2 WHERE id = $3`,
        [failed, lockedUntil, row.id]
      );

      throw new AppApiError({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: 'Phone number or password was incorrect.',
        statusCode: 401,
      });
    }

    // Reset failed logins on success
    await dbPool.query(
      `UPDATE users SET failed_logins = 0, locked_until = NULL, last_login_at = now() WHERE id = $1`,
      [row.id]
    );

    const refreshToken = crypto.randomBytes(40).toString('hex');
    const tokenHash = hashToken(refreshToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const ctx = {
      orgId: row.org_id,
      userId: row.id,
      role: row.role as UserRole,
      branchIds: row.branch_ids,
    };

    await withTenantTransaction(ctx, async (client) => {
      await client.query(
        `INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)`,
        [row.id, tokenHash, expiresAt]
      );

      await client.query(
        `INSERT INTO audit_logs (org_id, actor_id, actor_role, action, entity_type, entity_id)
         VALUES ($1, $2, $3, 'user.login', 'user', $2)`,
        [row.org_id, row.id, row.role]
      );
    });

    return {
      user: {
        id: row.id,
        orgId: row.org_id,
        fullName: row.full_name,
        phone: row.phone,
        role: row.role as UserRole,
        branchIds: row.branch_ids,
      },
      refreshToken,
    };
  }

  /**
   * Verifies a 4-6 digit unlock PIN.
   */
  static async verifyPin(userId: string, pin: string): Promise<boolean> {
    const res = await dbPool.query('SELECT pin_hash, status FROM users WHERE id = $1', [userId]);
    if (res.rows.length === 0 || res.rows[0].status !== 'active') {
      throw new AppApiError({
        code: ErrorCode.UNAUTHORIZED,
        message: 'User session invalid.',
        statusCode: 401,
      });
    }

    const pinHash = res.rows[0].pin_hash;
    if (!pinHash) {
      throw new AppApiError({
        code: ErrorCode.BAD_REQUEST,
        message: 'No PIN is configured for this account.',
        statusCode: 400,
      });
    }

    const isValid = await verifySecret(pinHash, pin);
    if (!isValid) {
      throw new AppApiError({
        code: ErrorCode.INVALID_CREDENTIALS,
        message: 'Incorrect PIN.',
        statusCode: 401,
      });
    }

    return true;
  }
}
