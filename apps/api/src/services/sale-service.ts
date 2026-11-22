import argon2 from 'argon2';
import { withTenantTransaction, type TenantContext } from '../plugins/db.js';
import type { RequestUser } from '../middleware/auth.js';
import { multiplyQuantity, toMinor } from '@payproof/money';
import {
  type CreateSaleRequest,
  type VoidSaleRequest,
  type SaleResponse,
  type SaleItemResponse,
  AppApiError,
  ErrorCode,
} from '@payproof/shared-types';

export interface SaleListParams {
  branch_id?: string;
  cashier_id?: string;
  status?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export class SaleService {
  public static async createSale(
    user: RequestUser,
    input: CreateSaleRequest
  ): Promise<SaleResponse> {
    // Role & branch authorization
    if (user.role === 'cashier') {
      const allowedBranches = user.branch_ids || user.branchIds || [];
      if (!allowedBranches.includes(input.branch_id)) {
        throw new AppApiError({
          code: ErrorCode.FORBIDDEN,
          message: 'Cashier is not authorized for this branch',
          statusCode: 403,
        });
      }
    }

    const ctx: TenantContext = {
      orgId: user.org_id,
      userId: user.user_id,
      role: user.role,
      branchIds: user.branch_ids,
    };

    return withTenantTransaction(ctx, async (client) => {
      // 1. Idempotency Check: Return existing sale if idempotency_key already processed
      const existingRes = await client.query(
        `SELECT id FROM sales WHERE org_id = $1 AND idempotency_key = $2`,
        [user.org_id, input.idempotency_key]
      );
      if (existingRes.rowCount && existingRes.rowCount > 0) {
        return SaleService.getSaleById(user, existingRes.rows[0].id);
      }

      // 2. Validate line items and totals strictly
      let computedTotal = 0n;
      for (const item of input.items) {
        const expectedLineTotal = multiplyQuantity(item.unit_price_minor, item.quantity);
        if (toMinor(item.line_total_minor) !== expectedLineTotal) {
          throw new AppApiError({
            code: ErrorCode.VALIDATION_ERROR,
            message: `Line total mismatch for "${item.name_snapshot}": expected ${expectedLineTotal}, got ${item.line_total_minor}`,
            statusCode: 400,
          });
        }
        computedTotal += expectedLineTotal;
      }

      if (toMinor(input.subtotal_minor) !== computedTotal || toMinor(input.total_minor) !== computedTotal) {
        throw new AppApiError({
          code: ErrorCode.VALIDATION_ERROR,
          message: `Sale total mismatch: computed ${computedTotal}, declared subtotal ${input.subtotal_minor}, total ${input.total_minor}`,
          statusCode: 400,
        });
      }

      // 3. Payment Method Specific Validation
      let saleStatus: 'paid' | 'draft' = 'draft';
      let completedAt: Date | null = null;
      let overpaidMinor = 0n;

      if (input.payment_method === 'cash') {
        if (input.cash_received_minor === undefined || input.cash_received_minor === null) {
          throw new AppApiError({
            code: ErrorCode.VALIDATION_ERROR,
            message: 'cash_received_minor is required for cash sales',
            statusCode: 400,
          });
        }
        const received = toMinor(input.cash_received_minor);
        if (received < computedTotal) {
          throw new AppApiError({
            code: ErrorCode.VALIDATION_ERROR,
            message: `Insufficient cash received: total is ${computedTotal}, received ${received}`,
            statusCode: 400,
          });
        }
        overpaidMinor = received - computedTotal;
        saleStatus = 'paid';
        completedAt = new Date();
      }

      // 4. Atomic Insert into sales
      const saleInsertRes = await client.query(
        `INSERT INTO sales (
          id, org_id, branch_id, cashier_id, status, payment_method,
          subtotal_minor, total_minor, cash_received_minor, overpaid_minor,
          idempotency_key, client_created_at, completed_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING id, org_id, branch_id, cashier_id, status, payment_method,
                  subtotal_minor::bigint, total_minor::bigint, cash_received_minor::bigint,
                  overpaid_minor::bigint, idempotency_key, client_created_at, completed_at,
                  voided_at, void_reason, voided_by, created_at`,
        [
          input.id,
          user.org_id,
          input.branch_id,
          user.user_id,
          saleStatus,
          input.payment_method,
          computedTotal.toString(),
          computedTotal.toString(),
          input.cash_received_minor !== undefined ? input.cash_received_minor.toString() : null,
          overpaidMinor.toString(),
          input.idempotency_key,
          new Date(input.client_created_at),
          completedAt,
        ]
      );
      const saleRow = saleInsertRes.rows[0];

      // 5. Batch Insert into sale_items
      const itemResponses: SaleItemResponse[] = [];
      for (const item of input.items) {
        const itemRes = await client.query(
          `INSERT INTO sale_items (
            sale_id, product_id, name_snapshot, barcode_snapshot,
            unit, unit_price_minor, quantity, line_total_minor
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id, sale_id, product_id, name_snapshot, barcode_snapshot,
                    unit, unit_price_minor::bigint, quantity::text, line_total_minor::bigint`,
          [
            saleRow.id,
            item.product_id || null,
            item.name_snapshot,
            item.barcode_snapshot || null,
            item.unit,
            item.unit_price_minor,
            item.quantity,
            item.line_total_minor,
          ]
        );
        const ir = itemRes.rows[0];
        itemResponses.push({
          id: ir.id,
          sale_id: ir.sale_id,
          product_id: ir.product_id,
          name_snapshot: ir.name_snapshot,
          barcode_snapshot: ir.barcode_snapshot,
          unit: ir.unit,
          unit_price_minor: Number(ir.unit_price_minor),
          quantity: Number(ir.quantity),
          line_total_minor: Number(ir.line_total_minor),
        });
      }

      // 6. Audit Log
      await client.query(
        `INSERT INTO audit_logs (org_id, actor_id, actor_role, action, entity_type, entity_id, meta)
         VALUES ($1, $2, $3, 'sale_completed', 'sales', $4, $5)`,
        [
          user.org_id,
          user.user_id,
          user.role,
          saleRow.id,
          JSON.stringify({
            total_minor: Number(saleRow.total_minor),
            payment_method: saleRow.payment_method,
            item_count: itemResponses.length,
          }),
        ]
      );

      return {
        id: saleRow.id,
        org_id: saleRow.org_id,
        branch_id: saleRow.branch_id,
        cashier_id: saleRow.cashier_id,
        status: saleRow.status,
        payment_method: saleRow.payment_method,
        subtotal_minor: Number(saleRow.subtotal_minor),
        total_minor: Number(saleRow.total_minor),
        cash_received_minor: saleRow.cash_received_minor ? Number(saleRow.cash_received_minor) : null,
        overpaid_minor: Number(saleRow.overpaid_minor),
        idempotency_key: saleRow.idempotency_key,
        client_created_at: saleRow.client_created_at.toISOString(),
        completed_at: saleRow.completed_at ? saleRow.completed_at.toISOString() : null,
        voided_at: saleRow.voided_at ? saleRow.voided_at.toISOString() : null,
        void_reason: saleRow.void_reason,
        voided_by: saleRow.voided_by,
        created_at: saleRow.created_at.toISOString(),
        items: itemResponses,
      };
    });
  }

  public static async getSaleById(user: RequestUser, saleId: string): Promise<SaleResponse> {
    const ctx: TenantContext = {
      orgId: user.org_id,
      userId: user.user_id,
      role: user.role,
      branchIds: user.branch_ids,
    };

    return withTenantTransaction(ctx, async (client) => {
      const saleRes = await client.query(
        `SELECT
           s.id, s.org_id, s.branch_id, s.cashier_id, s.status, s.payment_method,
           s.subtotal_minor::bigint, s.total_minor::bigint, s.cash_received_minor::bigint,
           s.overpaid_minor::bigint, s.idempotency_key, s.client_created_at, s.completed_at,
           s.voided_at, s.void_reason, s.voided_by, s.created_at
         FROM sales s
         WHERE s.id = $1 AND s.org_id = $2`,
        [saleId, user.org_id]
      );

      if (saleRes.rowCount === 0) {
        throw new AppApiError({
          code: ErrorCode.NOT_FOUND,
          message: 'Sale not found',
          statusCode: 404,
        });
      }

      const sale = saleRes.rows[0];

      // Cashier boundary check
      const cashierBranches = user.branch_ids || user.branchIds || [];
      if (user.role === 'cashier' && (!cashierBranches.includes(sale.branch_id) || sale.cashier_id !== user.user_id)) {
        throw new AppApiError({
          code: ErrorCode.FORBIDDEN,
          message: 'Access to sale outside assigned branch/cashier denied',
          statusCode: 403,
        });
      }

      const itemsRes = await client.query(
        `SELECT
           id, sale_id, product_id, name_snapshot, barcode_snapshot,
           unit, unit_price_minor::bigint, quantity::text, line_total_minor::bigint
         FROM sale_items
         WHERE sale_id = $1
         ORDER BY id ASC`,
        [saleId]
      );

      const items: SaleItemResponse[] = itemsRes.rows.map((ir) => ({
        id: ir.id,
        sale_id: ir.sale_id,
        product_id: ir.product_id,
        name_snapshot: ir.name_snapshot,
        barcode_snapshot: ir.barcode_snapshot,
        unit: ir.unit,
        unit_price_minor: Number(ir.unit_price_minor),
        quantity: Number(ir.quantity),
        line_total_minor: Number(ir.line_total_minor),
      }));

      return {
        id: sale.id,
        org_id: sale.org_id,
        branch_id: sale.branch_id,
        cashier_id: sale.cashier_id,
        status: sale.status,
        payment_method: sale.payment_method,
        subtotal_minor: Number(sale.subtotal_minor),
        total_minor: Number(sale.total_minor),
        cash_received_minor: sale.cash_received_minor ? Number(sale.cash_received_minor) : null,
        overpaid_minor: Number(sale.overpaid_minor),
        idempotency_key: sale.idempotency_key,
        client_created_at: sale.client_created_at.toISOString(),
        completed_at: sale.completed_at ? sale.completed_at.toISOString() : null,
        voided_at: sale.voided_at ? sale.voided_at.toISOString() : null,
        void_reason: sale.void_reason,
        voided_by: sale.voided_by,
        created_at: sale.created_at.toISOString(),
        items,
      };
    });
  }

  public static async listSales(
    user: RequestUser,
    params: SaleListParams = {}
  ): Promise<{ sales: SaleResponse[]; total: number }> {
    const ctx: TenantContext = {
      orgId: user.org_id,
      userId: user.user_id,
      role: user.role,
      branchIds: user.branch_ids,
    };

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const offset = (page - 1) * limit;

    return withTenantTransaction(ctx, async (client) => {
      const conditions: string[] = ['s.org_id = $1'];
      const values: unknown[] = [user.org_id];
      let pIdx = 2;

      // Cashier role restriction
      if (user.role === 'cashier') {
        conditions.push(`s.branch_id = ANY($${pIdx++})`);
        values.push(user.branch_ids);
        conditions.push(`s.cashier_id = $${pIdx++}`);
        values.push(user.user_id);
      } else if (params.branch_id) {
        conditions.push(`s.branch_id = $${pIdx++}`);
        values.push(params.branch_id);
      }

      if (params.cashier_id && user.role !== 'cashier') {
        conditions.push(`s.cashier_id = $${pIdx++}`);
        values.push(params.cashier_id);
      }

      if (params.status) {
        conditions.push(`s.status = $${pIdx++}`);
        values.push(params.status);
      }

      if (params.from) {
        conditions.push(`s.created_at >= $${pIdx++}`);
        values.push(new Date(params.from));
      }

      if (params.to) {
        conditions.push(`s.created_at <= $${pIdx++}`);
        values.push(new Date(params.to));
      }

      const whereClause = conditions.join(' AND ');

      const countRes = await client.query(
        `SELECT count(*)::int AS total FROM sales s WHERE ${whereClause}`,
        values
      );
      const total = countRes.rows[0]?.total || 0;

      const salesRes = await client.query(
        `SELECT
           s.id, s.org_id, s.branch_id, s.cashier_id, s.status, s.payment_method,
           s.subtotal_minor::bigint, s.total_minor::bigint, s.cash_received_minor::bigint,
           s.overpaid_minor::bigint, s.idempotency_key, s.client_created_at, s.completed_at,
           s.voided_at, s.void_reason, s.voided_by, s.created_at
         FROM sales s
         WHERE ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT $${pIdx++} OFFSET $${pIdx}`,
        [...values, limit, offset]
      );

      const sales: SaleResponse[] = [];
      for (const sale of salesRes.rows) {
        const itemsRes = await client.query(
          `SELECT
             id, sale_id, product_id, name_snapshot, barcode_snapshot,
             unit, unit_price_minor::bigint, quantity::text, line_total_minor::bigint
           FROM sale_items
           WHERE sale_id = $1
           ORDER BY id ASC`,
          [sale.id]
        );

        const items: SaleItemResponse[] = itemsRes.rows.map((ir) => ({
          id: ir.id,
          sale_id: ir.sale_id,
          product_id: ir.product_id,
          name_snapshot: ir.name_snapshot,
          barcode_snapshot: ir.barcode_snapshot,
          unit: ir.unit,
          unit_price_minor: Number(ir.unit_price_minor),
          quantity: Number(ir.quantity),
          line_total_minor: Number(ir.line_total_minor),
        }));

        sales.push({
          id: sale.id,
          org_id: sale.org_id,
          branch_id: sale.branch_id,
          cashier_id: sale.cashier_id,
          status: sale.status,
          payment_method: sale.payment_method,
          subtotal_minor: Number(sale.subtotal_minor),
          total_minor: Number(sale.total_minor),
          cash_received_minor: sale.cash_received_minor ? Number(sale.cash_received_minor) : null,
          overpaid_minor: Number(sale.overpaid_minor),
          idempotency_key: sale.idempotency_key,
          client_created_at: sale.client_created_at.toISOString(),
          completed_at: sale.completed_at ? sale.completed_at.toISOString() : null,
          voided_at: sale.voided_at ? sale.voided_at.toISOString() : null,
          void_reason: sale.void_reason,
          voided_by: sale.voided_by,
          created_at: sale.created_at.toISOString(),
          items,
        });
      }

      return { sales, total };
    });
  }

  public static async voidSale(
    user: RequestUser,
    saleId: string,
    input: VoidSaleRequest
  ): Promise<SaleResponse> {
    const ctx: TenantContext = {
      orgId: user.org_id,
      userId: user.user_id,
      role: user.role,
      branchIds: user.branch_ids,
    };

    return withTenantTransaction(ctx, async (client) => {
      // 1. Fetch sale
      const saleRes = await client.query(
        `SELECT id, org_id, branch_id, cashier_id, status, total_minor::bigint
         FROM sales
         WHERE id = $1 AND org_id = $2`,
        [saleId, user.org_id]
      );
      if (saleRes.rowCount === 0) {
        throw new AppApiError({
          code: ErrorCode.NOT_FOUND,
          message: 'Sale not found',
          statusCode: 404,
        });
      }

      const sale = saleRes.rows[0];
      if (sale.status !== 'paid') {
        throw new AppApiError({
          code: ErrorCode.BAD_REQUEST,
          message: `Only paid sales can be voided (status: ${sale.status})`,
          statusCode: 400,
        });
      }

      // 2. Organization void PIN limit check
      const orgRes = await client.query(
        `SELECT void_pin_limit_minor::bigint AS limit FROM organizations WHERE id = $1`,
        [user.org_id]
      );
      const voidLimit = Number(orgRes.rows[0]?.limit || 0);

      // If sale total > voidLimit, owner/manager PIN is required
      if (Number(sale.total_minor) > voidLimit) {
        if (!input.pin) {
          throw new AppApiError({
            code: ErrorCode.FORBIDDEN,
            message: 'Manager or Owner PIN required for void exceeding limit',
            statusCode: 403,
          });
        }

        // Verify PIN against an owner/manager in this org
        const pinUsersRes = await client.query(
          `SELECT pin_hash FROM users WHERE org_id = $1 AND role IN ('owner', 'manager') AND pin_hash IS NOT NULL`,
          [user.org_id]
        );

        let pinValid = false;
        for (const u of pinUsersRes.rows) {
          if (await argon2.verify(u.pin_hash, input.pin)) {
            pinValid = true;
            break;
          }
        }

        if (!pinValid) {
          throw new AppApiError({
            code: ErrorCode.UNAUTHORIZED,
            message: 'Invalid authorization PIN',
            statusCode: 401,
          });
        }
      }

      // 3. Update sale void fields (allowed by trigger)
      const now = new Date();
      await client.query(
        `UPDATE sales
         SET status = 'voided',
             voided_at = $1,
             void_reason = $2,
             voided_by = $3
         WHERE id = $4 AND org_id = $5`,
        [now, input.reason, user.user_id, saleId, user.org_id]
      );

      // 4. Audit Log
      await client.query(
        `INSERT INTO audit_logs (org_id, actor_id, actor_role, action, entity_type, entity_id, meta)
         VALUES ($1, $2, $3, 'sale_voided', 'sales', $4, $5)`,
        [
          user.org_id,
          user.user_id,
          user.role,
          saleId,
          JSON.stringify({
            reason: input.reason,
            total_minor: Number(sale.total_minor),
          }),
        ]
      );

      return SaleService.getSaleById(user, saleId);
    });
  }
}
