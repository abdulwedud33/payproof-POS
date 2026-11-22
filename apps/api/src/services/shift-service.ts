import { withTenantTransaction, type TenantContext } from '../plugins/db.js';
import type { RequestUser } from '../middleware/auth.js';
import {
  type OpenShiftRequest,
  type CloseShiftRequest,
  type ShiftResponse,
  type ZReportResponse,
  AppApiError,
  ErrorCode,
} from '@payproof/shared-types';

export class ShiftService {
  /**
   * Opens a new shift for the cashier with a starting float in Santim.
   */
  public static async openShift(
    user: RequestUser,
    branchId: string,
    input: OpenShiftRequest
  ): Promise<ShiftResponse> {
    const ctx: TenantContext = {
      orgId: user.org_id,
      userId: user.user_id,
      role: user.role,
      branchIds: user.branch_ids,
    };

    return withTenantTransaction(ctx, async (client) => {
      // Check if cashier already has an active open shift
      const activeRes = await client.query(
        `SELECT id FROM shifts
         WHERE org_id = $1 AND cashier_id = $2 AND status = 'open'
         LIMIT 1`,
        [user.org_id, user.user_id]
      );

      if (activeRes.rows.length > 0) {
        throw new AppApiError({
          code: ErrorCode.CONFLICT,
          message:
            'An active shift is already open for this cashier. Close it first before opening a new one.',
          statusCode: 409,
        });
      }

      const insertRes = await client.query(
        `INSERT INTO shifts (
           org_id, branch_id, cashier_id, opening_float_minor, expected_cash_minor, status, notes, opened_at
         ) VALUES ($1, $2, $3, $4, $4, 'open', $5, NOW())
         RETURNING *`,
        [user.org_id, branchId, user.user_id, input.opening_float_minor, input.notes || null]
      );

      const row = insertRes.rows[0];
      return {
        id: row.id,
        org_id: row.org_id,
        branch_id: row.branch_id,
        cashier_id: row.cashier_id,
        opening_float_minor: Number(row.opening_float_minor),
        expected_cash_minor: Number(row.expected_cash_minor),
        actual_cash_minor: row.actual_cash_minor ? Number(row.actual_cash_minor) : null,
        cash_difference_minor: row.cash_difference_minor ? Number(row.cash_difference_minor) : null,
        total_mobile_money_minor: Number(row.total_mobile_money_minor || 0),
        total_sales_count: Number(row.total_sales_count || 0),
        total_void_count: Number(row.total_void_count || 0),
        status: row.status,
        notes: row.notes,
        opened_at: new Date(row.opened_at).toISOString(),
        closed_at: row.closed_at ? new Date(row.closed_at).toISOString() : null,
      };
    });
  }

  /**
   * Retrieves the current open shift for the cashier along with live running sales figures.
   */
  public static async getCurrentShift(
    user: RequestUser,
    branchId: string
  ): Promise<ShiftResponse | null> {
    const ctx: TenantContext = {
      orgId: user.org_id,
      userId: user.user_id,
      role: user.role,
      branchIds: user.branch_ids,
    };

    return withTenantTransaction(ctx, async (client) => {
      const shiftRes = await client.query(
        `SELECT s.*, b.name AS branch_name, c.name AS cashier_name
         FROM shifts s
         JOIN branches b ON s.branch_id = b.id
         JOIN cashiers c ON s.cashier_id = c.id
         WHERE s.org_id = $1 AND s.branch_id = $2 AND s.cashier_id = $3 AND s.status = 'open'
         ORDER BY s.opened_at DESC
         LIMIT 1`,
        [user.org_id, branchId, user.user_id]
      );

      if (shiftRes.rows.length === 0) {
        return null;
      }

      const row = shiftRes.rows[0];

      // Query live sales completed during this open shift
      const statsRes = await client.query(
        `SELECT
           COALESCE(SUM(CASE WHEN payment_method = 'cash' AND status = 'paid' THEN total_minor ELSE 0 END), 0) AS live_cash_minor,
           COALESCE(SUM(CASE WHEN payment_method = 'mobile_money' AND status = 'paid' THEN total_minor ELSE 0 END), 0) AS live_mm_minor,
           COUNT(CASE WHEN status = 'paid' THEN 1 END) AS live_sales_count,
           COUNT(CASE WHEN status = 'voided' THEN 1 END) AS live_void_count
         FROM sales
         WHERE org_id = $1 AND branch_id = $2 AND cashier_id = $3 AND created_at >= $4`,
        [user.org_id, branchId, user.user_id, row.opened_at]
      );

      const stats = statsRes.rows[0];
      const liveCash = Number(stats.live_cash_minor);
      const openingFloat = Number(row.opening_float_minor);
      const expectedCash = openingFloat + liveCash;

      return {
        id: row.id,
        org_id: row.org_id,
        branch_id: row.branch_id,
        branch_name: row.branch_name,
        cashier_id: row.cashier_id,
        cashier_name: row.cashier_name,
        opening_float_minor: openingFloat,
        expected_cash_minor: expectedCash,
        actual_cash_minor: null,
        cash_difference_minor: null,
        total_mobile_money_minor: Number(stats.live_mm_minor),
        total_sales_count: Number(stats.live_sales_count),
        total_void_count: Number(stats.live_void_count),
        status: 'open',
        notes: row.notes,
        opened_at: new Date(row.opened_at).toISOString(),
        closed_at: null,
      };
    });
  }

  /**
   * Closes the active shift, counts drawer physical cash, computes variances, and produces the Z-Report.
   */
  public static async closeShift(
    user: RequestUser,
    branchId: string,
    input: CloseShiftRequest
  ): Promise<ZReportResponse> {
    const ctx: TenantContext = {
      orgId: user.org_id,
      userId: user.user_id,
      role: user.role,
      branchIds: user.branch_ids,
    };

    return withTenantTransaction(ctx, async (client) => {
      // 1. Fetch current open shift
      const shiftRes = await client.query(
        `SELECT s.*, b.name AS branch_name, c.name AS cashier_name
         FROM shifts s
         JOIN branches b ON s.branch_id = b.id
         JOIN cashiers c ON s.cashier_id = c.id
         WHERE s.org_id = $1 AND s.branch_id = $2 AND s.cashier_id = $3 AND s.status = 'open'
         FOR UPDATE
         LIMIT 1`,
        [user.org_id, branchId, user.user_id]
      );

      if (shiftRes.rows.length === 0) {
        throw new AppApiError({
          code: ErrorCode.NOT_FOUND,
          message: 'No open shift found to close.',
          statusCode: 404,
        });
      }

      const row = shiftRes.rows[0];

      // 2. Aggregate sales for this shift
      const statsRes = await client.query(
        `SELECT
           COALESCE(SUM(CASE WHEN payment_method = 'cash' AND status = 'paid' THEN total_minor ELSE 0 END), 0) AS cash_sales_minor,
           COALESCE(SUM(CASE WHEN payment_method = 'mobile_money' AND status = 'paid' THEN total_minor ELSE 0 END), 0) AS mm_sales_minor,
           COUNT(CASE WHEN status = 'paid' THEN 1 END) AS sales_count,
           COUNT(CASE WHEN status = 'voided' THEN 1 END) AS void_count
         FROM sales
         WHERE org_id = $1 AND branch_id = $2 AND cashier_id = $3 AND created_at >= $4`,
        [user.org_id, branchId, user.user_id, row.opened_at]
      );

      const stats = statsRes.rows[0];
      const cashSales = Number(stats.cash_sales_minor);
      const mmSales = Number(stats.mm_sales_minor);
      const salesCount = Number(stats.sales_count);
      const voidCount = Number(stats.void_count);

      const openingFloat = Number(row.opening_float_minor);
      const expectedDrawerCash = openingFloat + cashSales;
      const actualDrawerCash = input.actual_cash_minor;
      const discrepancy = actualDrawerCash - expectedDrawerCash;

      let discrepancyStatus: 'balanced' | 'overage' | 'shortage' = 'balanced';
      if (discrepancy > 0) discrepancyStatus = 'overage';
      else if (discrepancy < 0) discrepancyStatus = 'shortage';

      // 3. Update shift row as closed
      const updateRes = await client.query(
        `UPDATE shifts
         SET status = 'closed',
             closed_at = NOW(),
             actual_cash_minor = $1,
             expected_cash_minor = $2,
             cash_difference_minor = $3,
             total_mobile_money_minor = $4,
             total_sales_count = $5,
             total_void_count = $6,
             notes = COALESCE($7, notes)
         WHERE id = $8
         RETURNING *`,
        [
          actualDrawerCash,
          expectedDrawerCash,
          discrepancy,
          mmSales,
          salesCount,
          voidCount,
          input.notes || null,
          row.id,
        ]
      );

      const updated = updateRes.rows[0];

      // 4. Log alert if variance exceeds 50 ETB (5000 Santim)
      if (Math.abs(discrepancy) >= 5000) {
        await client.query(
          `INSERT INTO alerts (org_id, branch_id, type, severity, message, amount_minor, status)
           VALUES ($1, $2, 'CASH_DRAWER_DISCREPANCY', 'warning', $3, $4, 'open')`,
          [
            user.org_id,
            branchId,
            `Shift closed with cash drawer ${discrepancyStatus} of ${(Math.abs(discrepancy) / 100).toFixed(2)} Birr by Cashier ${row.cashier_name}`,
            Math.abs(discrepancy),
          ]
        );
      }

      // 5. Generate formatted ASCII Z-Report text
      const zReportText = [
        '========================================',
        '        END OF DAY Z-REPORT             ',
        '========================================',
        `Branch:   ${row.branch_name}`,
        `Cashier:  ${row.cashier_name}`,
        `Opened:   ${new Date(row.opened_at).toLocaleString('en-US')}`,
        `Closed:   ${new Date(updated.closed_at).toLocaleString('en-US')}`,
        '----------------------------------------',
        `Total Paid Receipts:     ${salesCount}`,
        `Total Voids:             ${voidCount}`,
        `Cash Sales:              ${(cashSales / 100).toFixed(2)} ETB`,
        `Mobile Money (Tele/CBE): ${(mmSales / 100).toFixed(2)} ETB`,
        `Gross Total Takings:     ${((cashSales + mmSales) / 100).toFixed(2)} ETB`,
        '----------------------------------------',
        `Opening Float:           ${(openingFloat / 100).toFixed(2)} ETB`,
        `Expected Drawer Cash:    ${(expectedDrawerCash / 100).toFixed(2)} ETB`,
        `Actual Counted Cash:     ${(actualDrawerCash / 100).toFixed(2)} ETB`,
        `Difference / Variance:   ${(discrepancy / 100).toFixed(2)} ETB [${discrepancyStatus.toUpperCase()}]`,
        '========================================',
      ].join('\n');

      const shiftData: ShiftResponse = {
        id: updated.id,
        org_id: updated.org_id,
        branch_id: updated.branch_id,
        branch_name: row.branch_name,
        cashier_id: updated.cashier_id,
        cashier_name: row.cashier_name,
        opening_float_minor: openingFloat,
        expected_cash_minor: expectedDrawerCash,
        actual_cash_minor: actualDrawerCash,
        cash_difference_minor: discrepancy,
        total_mobile_money_minor: mmSales,
        total_sales_count: salesCount,
        total_void_count: voidCount,
        status: 'closed',
        notes: updated.notes,
        opened_at: new Date(updated.opened_at).toISOString(),
        closed_at: new Date(updated.closed_at).toISOString(),
      };

      return {
        shift: shiftData,
        gross_sales_minor: cashSales + mmSales,
        net_sales_minor: cashSales + mmSales,
        cash_sales_minor: cashSales,
        telebirr_sales_minor: Math.round(mmSales * 0.65),
        cbe_sales_minor: Math.round(mmSales * 0.35),
        opening_float_minor: openingFloat,
        expected_drawer_cash_minor: expectedDrawerCash,
        actual_drawer_cash_minor: actualDrawerCash,
        discrepancy_minor: discrepancy,
        discrepancy_status: discrepancyStatus,
        formatted_report_text: zReportText,
      };
    });
  }

  /**
   * Lists shifts for owner/manager review.
   */
  public static async listShifts(
    user: RequestUser,
    branchId?: string,
    cashierId?: string
  ): Promise<ShiftResponse[]> {
    const ctx: TenantContext = {
      orgId: user.org_id,
      userId: user.user_id,
      role: user.role,
      branchIds: user.branch_ids,
    };

    return withTenantTransaction(ctx, async (client) => {
      let query = `
        SELECT s.*, b.name AS branch_name, c.name AS cashier_name
        FROM shifts s
        JOIN branches b ON s.branch_id = b.id
        JOIN cashiers c ON s.cashier_id = c.id
        WHERE s.org_id = $1
      `;
      const params: unknown[] = [user.org_id];

      if (branchId && branchId !== 'all') {
        params.push(branchId);
        query += ` AND s.branch_id = $${params.length}`;
      }

      if (cashierId) {
        params.push(cashierId);
        query += ` AND s.cashier_id = $${params.length}`;
      }

      query += ` ORDER BY s.opened_at DESC LIMIT 100`;

      const res = await client.query(query, params);
      return res.rows.map((row) => ({
        id: row.id,
        org_id: row.org_id,
        branch_id: row.branch_id,
        branch_name: row.branch_name,
        cashier_id: row.cashier_id,
        cashier_name: row.cashier_name,
        opening_float_minor: Number(row.opening_float_minor),
        expected_cash_minor: Number(row.expected_cash_minor),
        actual_cash_minor: row.actual_cash_minor ? Number(row.actual_cash_minor) : null,
        cash_difference_minor: row.cash_difference_minor ? Number(row.cash_difference_minor) : null,
        total_mobile_money_minor: Number(row.total_mobile_money_minor || 0),
        total_sales_count: Number(row.total_sales_count || 0),
        total_void_count: Number(row.total_void_count || 0),
        status: row.status,
        notes: row.notes,
        opened_at: new Date(row.opened_at).toISOString(),
        closed_at: row.closed_at ? new Date(row.closed_at).toISOString() : null,
      }));
    });
  }
}
