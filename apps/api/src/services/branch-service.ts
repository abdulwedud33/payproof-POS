import crypto from 'crypto';
import {
  AppApiError,
  ErrorCode,
  type CreateBranchRequest,
  type UpdateBranchRequest,
  type BranchResponse,
} from '@payproof/shared-types';
import { withTenantTransaction } from '../plugins/db.js';
import type { RequestUser } from '../middleware/auth.js';

export class BranchService {
  static async listBranches(user: RequestUser): Promise<BranchResponse[]> {
    return withTenantTransaction(user, async (client) => {
      // RLS filters automatically: owners see all branches in org, staff see assigned branches
      const res = await client.query(
        `SELECT id, org_id AS "orgId", name, city, address, timezone, status, created_at AS "createdAt"
         FROM branches
         ORDER BY name ASC`
      );
      return res.rows;
    });
  }

  static async createBranch(user: RequestUser, req: CreateBranchRequest): Promise<BranchResponse> {
    const branchId = crypto.randomUUID();

    return withTenantTransaction(user, async (client) => {
      // Verify name uniqueness within org
      const existing = await client.query(
        `SELECT id FROM branches WHERE org_id = $1 AND name = $2`,
        [user.orgId, req.name]
      );
      if (existing.rows.length > 0) {
        throw new AppApiError({
          code: ErrorCode.CONFLICT,
          message: `A branch named "${req.name}" already exists in your business.`,
          statusCode: 409,
        });
      }

      const res = await client.query(
        `INSERT INTO branches (id, org_id, name, city, address, timezone, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'active')
         RETURNING id, org_id AS "orgId", name, city, address, timezone, status, created_at AS "createdAt"`,
        [branchId, user.orgId, req.name, req.city ?? null, req.address ?? null, req.timezone || 'Africa/Addis_Ababa']
      );

      // Audit Log
      await client.query(
        `INSERT INTO audit_logs (org_id, actor_id, actor_role, action, entity_type, entity_id, meta)
         VALUES ($1, $2, $3, 'branch.create', 'branch', $4, $5)`,
        [user.orgId, user.id, user.role, branchId, JSON.stringify({ name: req.name })]
      );

      return res.rows[0];
    });
  }

  static async updateBranch(
    user: RequestUser,
    branchId: string,
    req: UpdateBranchRequest
  ): Promise<BranchResponse> {
    return withTenantTransaction(user, async (client) => {
      const existing = await client.query('SELECT * FROM branches WHERE id = $1', [branchId]);
      if (existing.rows.length === 0) {
        throw new AppApiError({
          code: ErrorCode.NOT_FOUND,
          message: 'Branch not found.',
          statusCode: 404,
        });
      }

      const current = existing.rows[0];
      const name = req.name ?? current.name;
      const city = req.city !== undefined ? req.city : current.city;
      const address = req.address !== undefined ? req.address : current.address;
      const timezone = req.timezone ?? current.timezone;
      const status = req.status ?? current.status;

      const res = await client.query(
        `UPDATE branches
         SET name = $1, city = $2, address = $3, timezone = $4, status = $5
         WHERE id = $6
         RETURNING id, org_id AS "orgId", name, city, address, timezone, status, created_at AS "createdAt"`,
        [name, city, address, timezone, status, branchId]
      );

      await client.query(
        `INSERT INTO audit_logs (org_id, actor_id, actor_role, action, entity_type, entity_id, meta)
         VALUES ($1, $2, $3, 'branch.update', 'branch', $4, $5)`,
        [user.orgId, user.id, user.role, branchId, JSON.stringify(req)]
      );

      return res.rows[0];
    });
  }
}
