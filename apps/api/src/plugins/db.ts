import pg from 'pg';
import { config } from '../config.js';

export interface TenantContext {
  orgId?: string;
  userId?: string;
  role?: 'owner' | 'manager' | 'cashier';
  branchIds?: string[];
}

export const dbPool = new pg.Pool({
  connectionString: config.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

/**
 * Executes a callback within a database transaction with the tenant session context set.
 * Enforces database-level Row Level Security (RLS) automatically.
 */
export async function withTenantTransaction<T>(
  ctx: TenantContext,
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await dbPool.connect();
  try {
    await client.query('BEGIN');

    // Set local RLS variables for this transaction
    if (ctx.orgId) {
      await client.query(`SET LOCAL app.org_id = '${ctx.orgId}'`);
    }
    if (ctx.userId) {
      await client.query(`SET LOCAL app.user_id = '${ctx.userId}'`);
    }
    if (ctx.role) {
      await client.query(`SET LOCAL app.role = '${ctx.role}'`);
    }
    if (ctx.branchIds && ctx.branchIds.length > 0) {
      const branchesLiteral = `{${ctx.branchIds.join(',')}}`;
      await client.query(`SET LOCAL app.branch_ids = '${branchesLiteral}'`);
    }

    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
