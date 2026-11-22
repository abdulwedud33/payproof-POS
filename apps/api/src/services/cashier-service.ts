import crypto from 'crypto';
import {
  AppApiError,
  ErrorCode,
  type CreateCashierRequest,
  type UpdateCashierRequest,
  type CashierResponse,
} from '@payproof/shared-types';
import { withTenantTransaction } from '../plugins/db.js';
import { hashSecret } from './auth-service.js';
import type { RequestUser } from '../middleware/auth.js';

export class CashierService {
  static async listCashiers(user: RequestUser): Promise<CashierResponse[]> {
    return withTenantTransaction(user, async (client) => {
      const res = await client.query(
        `SELECT u.id, u.org_id AS "orgId", u.role, u.full_name AS "fullName",
                u.phone, u.status, ub.branch_id AS "branchId",
                u.last_login_at AS "lastLoginAt", u.created_at AS "createdAt"
         FROM users u
         LEFT JOIN user_branches ub ON ub.user_id = u.id
         WHERE u.role = 'cashier' AND u.status <> 'deleted'
         ORDER BY u.full_name ASC`
      );
      return res.rows;
    });
  }

  static async createCashier(
    user: RequestUser,
    req: CreateCashierRequest
  ): Promise<{ cashier: CashierResponse; temporaryPassword?: string }> {
    return withTenantTransaction(user, async (client) => {
      // 1. Verify branch exists in org
      const branchRes = await client.query(
        `SELECT id FROM branches WHERE id = $1 AND status = 'active'`,
        [req.branchId]
      );
      if (branchRes.rows.length === 0) {
        throw new AppApiError({
          code: ErrorCode.NOT_FOUND,
          message: 'Target active branch not found.',
          statusCode: 404,
        });
      }

      // 2. Check phone uniqueness
      const existing = await client.query(`SELECT id FROM users WHERE phone = $1`, [req.phone]);
      if (existing.rows.length > 0) {
        throw new AppApiError({
          code: ErrorCode.CONFLICT,
          message: 'A user with this phone number already exists.',
          statusCode: 409,
        });
      }

      // Generate or use password
      const tempPassword = req.password || `Pass_${crypto.randomBytes(4).toString('hex')}!`;
      const passwordHash = await hashSecret(tempPassword);
      const pinHash = req.pin ? await hashSecret(req.pin) : null;
      const cashierId = crypto.randomUUID();

      const res = await client.query(
        `INSERT INTO users (id, org_id, role, full_name, phone, password_hash, pin_hash, status)
         VALUES ($1, $2, 'cashier', $3, $4, $5, $6, 'active')
         RETURNING id, org_id AS "orgId", role, full_name AS "fullName", phone, status,
                   last_login_at AS "lastLoginAt", created_at AS "createdAt"`,
        [cashierId, user.orgId, req.fullName, req.phone, passwordHash, pinHash]
      );

      // Assign to branch
      await client.query(`INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2)`, [
        cashierId,
        req.branchId,
      ]);

      // Audit Log
      await client.query(
        `INSERT INTO audit_logs (org_id, actor_id, actor_role, action, entity_type, entity_id, meta)
         VALUES ($1, $2, $3, 'cashier.create', 'user', $4, $5)`,
        [
          user.orgId,
          user.id,
          user.role,
          cashierId,
          JSON.stringify({ fullName: req.fullName, branchId: req.branchId }),
        ]
      );

      const cashier: CashierResponse = {
        ...res.rows[0],
        branchId: req.branchId,
      };

      return {
        cashier,
        temporaryPassword: req.password ? undefined : tempPassword,
      };
    });
  }

  static async updateCashier(
    user: RequestUser,
    cashierId: string,
    req: UpdateCashierRequest
  ): Promise<CashierResponse> {
    return withTenantTransaction(user, async (client) => {
      const existing = await client.query(
        `SELECT u.id, u.full_name, u.status, ub.branch_id
         FROM users u
         LEFT JOIN user_branches ub ON ub.user_id = u.id
         WHERE u.id = $1 AND u.role = 'cashier' AND u.status <> 'deleted'`,
        [cashierId]
      );
      if (existing.rows.length === 0) {
        throw new AppApiError({
          code: ErrorCode.NOT_FOUND,
          message: 'Cashier not found.',
          statusCode: 404,
        });
      }

      const current = existing.rows[0];
      const fullName = req.fullName ?? current.full_name;
      const status = req.status ?? current.status;

      let passwordHashUpdate = '';
      const params: any[] = [fullName, status, cashierId];

      if (req.password) {
        const hash = await hashSecret(req.password);
        params.push(hash);
        passwordHashUpdate = `, password_hash = $${params.length}`;
      }

      if (req.pin) {
        const pHash = await hashSecret(req.pin);
        params.push(pHash);
        passwordHashUpdate += `, pin_hash = $${params.length}`;
      }

      const res = await client.query(
        `UPDATE users
         SET full_name = $1, status = $2 ${passwordHashUpdate}
         WHERE id = $3
         RETURNING id, org_id AS "orgId", role, full_name AS "fullName", phone, status,
                   last_login_at AS "lastLoginAt", created_at AS "createdAt"`,
        params
      );

      let targetBranchId = current.branch_id;
      if (req.branchId && req.branchId !== current.branch_id) {
        targetBranchId = req.branchId;
        await client.query(`DELETE FROM user_branches WHERE user_id = $1`, [cashierId]);
        await client.query(`INSERT INTO user_branches (user_id, branch_id) VALUES ($1, $2)`, [
          cashierId,
          req.branchId,
        ]);
      }

      await client.query(
        `INSERT INTO audit_logs (org_id, actor_id, actor_role, action, entity_type, entity_id, meta)
         VALUES ($1, $2, $3, 'cashier.update', 'user', $4, $5)`,
        [user.orgId, user.id, user.role, cashierId, JSON.stringify(req)]
      );

      return {
        ...res.rows[0],
        branchId: targetBranchId,
      };
    });
  }

  static async deleteCashier(user: RequestUser, cashierId: string): Promise<void> {
    return withTenantTransaction(user, async (client) => {
      const res = await client.query(
        `SELECT id, status FROM users WHERE id = $1 AND role = 'cashier' AND status <> 'deleted'`,
        [cashierId]
      );
      if (res.rows.length === 0) {
        throw new AppApiError({
          code: ErrorCode.NOT_FOUND,
          message: 'Cashier not found.',
          statusCode: 404,
        });
      }

      // Check if cashier has sales (FR-2: deleting cashier with sales deactivates and keeps history)
      // Note: in M1 sales table isn't populated yet, but we check if sales table exists
      const salesCheck = await client.query(
        `SELECT EXISTS (
           SELECT 1 FROM information_schema.tables WHERE table_name = 'sales'
         ) AS exists`
      );

      let hasSales = false;
      if (salesCheck.rows[0]?.exists) {
        const salesRes = await client.query('SELECT 1 FROM sales WHERE cashier_id = $1 LIMIT 1', [
          cashierId,
        ]);
        hasSales = salesRes.rows.length > 0;
      }

      if (hasSales) {
        await client.query(
          `UPDATE users SET status = 'suspended', deleted_at = now() WHERE id = $1`,
          [cashierId]
        );
      } else {
        await client.query(
          `UPDATE users SET status = 'deleted', deleted_at = now() WHERE id = $1`,
          [cashierId]
        );
      }

      await client.query(
        `INSERT INTO audit_logs (org_id, actor_id, actor_role, action, entity_type, entity_id, meta)
         VALUES ($1, $2, $3, 'cashier.delete', 'user', $4, $5)`,
        [user.orgId, user.id, user.role, cashierId, JSON.stringify({ deactivatedOnly: hasSales })]
      );
    });
  }
}
