import { describe, it, expect, vi, beforeAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { ShiftService } from '../src/services/shift-service.js';

describe('Shift Management & Cash Drawer Reconciliation Endpoints', () => {
  const app = buildApp();
  let cashierToken: string;
  let ownerToken: string;

  beforeAll(async () => {
    await app.ready();
    cashierToken = app.jwt.sign({
      id: '33333333-3333-3333-3333-333333333331',
      orgId: '11111111-1111-1111-1111-111111111111',
      role: 'cashier',
      branchIds: ['22222222-2222-2222-2222-222222222221'],
    });
    ownerToken = app.jwt.sign({
      id: '99999999-9999-9999-9999-999999999999',
      orgId: '11111111-1111-1111-1111-111111111111',
      role: 'owner',
      branchIds: ['22222222-2222-2222-2222-222222222221'],
    });
  });

  describe('POST /v1/shifts/open', () => {
    it('opens a new cashier shift with starting float', async () => {
      vi.spyOn(ShiftService, 'openShift').mockResolvedValueOnce({
        id: 'shift-uuid-1',
        org_id: '11111111-1111-1111-1111-111111111111',
        branch_id: '22222222-2222-2222-2222-222222222221',
        cashier_id: '33333333-3333-3333-3333-333333333331',
        opening_float_minor: 50000, // 500.00 Birr
        expected_cash_minor: 50000,
        actual_cash_minor: null,
        cash_difference_minor: null,
        total_mobile_money_minor: 0,
        total_sales_count: 0,
        total_void_count: 0,
        status: 'open',
        notes: 'Morning shift opening float',
        opened_at: new Date().toISOString(),
        closed_at: null,
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/shifts/open',
        headers: { authorization: `Bearer ${cashierToken}` },
        payload: {
          branch_id: '22222222-2222-2222-2222-222222222221',
          opening_float_minor: 50000,
          notes: 'Morning shift opening float',
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.id).toBe('shift-uuid-1');
      expect(body.opening_float_minor).toBe(50000);
      expect(body.status).toBe('open');
    });

    it('rejects unauthenticated requests', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/shifts/open',
        payload: {
          branch_id: '22222222-2222-2222-2222-222222222221',
          opening_float_minor: 50000,
        },
      });
      expect(res.statusCode).toBe(401);
    });
  });

  describe('GET /v1/shifts/current', () => {
    it('returns the active open shift with live calculated drawer totals', async () => {
      vi.spyOn(ShiftService, 'getCurrentShift').mockResolvedValueOnce({
        id: 'shift-uuid-1',
        org_id: '11111111-1111-1111-1111-111111111111',
        branch_id: '22222222-2222-2222-2222-222222222221',
        branch_name: 'Bole Branch',
        cashier_id: '33333333-3333-3333-3333-333333333331',
        cashier_name: 'Tigist Haile',
        opening_float_minor: 50000,
        expected_cash_minor: 125000, // 500 float + 750 cash sales
        actual_cash_minor: null,
        cash_difference_minor: null,
        total_mobile_money_minor: 180000,
        total_sales_count: 14,
        total_void_count: 1,
        status: 'open',
        notes: null,
        opened_at: new Date().toISOString(),
        closed_at: null,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/v1/shifts/current?branch_id=22222222-2222-2222-2222-222222222221',
        headers: { authorization: `Bearer ${cashierToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('open');
      expect(body.expected_cash_minor).toBe(125000);
      expect(body.total_sales_count).toBe(14);
    });

    it('returns 404 when no shift is currently open', async () => {
      vi.spyOn(ShiftService, 'getCurrentShift').mockResolvedValueOnce(null);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/shifts/current?branch_id=22222222-2222-2222-2222-222222222221',
        headers: { authorization: `Bearer ${cashierToken}` },
      });

      expect(res.statusCode).toBe(404);
      const body = JSON.parse(res.body);
      expect(body.error.code).toBe('NO_OPEN_SHIFT');
    });
  });

  describe('POST /v1/shifts/close', () => {
    it('closes shift, calculates cash discrepancy, and returns complete Z-Report', async () => {
      vi.spyOn(ShiftService, 'closeShift').mockResolvedValueOnce({
        shift: {
          id: 'shift-uuid-1',
          org_id: '11111111-1111-1111-1111-111111111111',
          branch_id: '22222222-2222-2222-2222-222222222221',
          branch_name: 'Bole Branch',
          cashier_id: '33333333-3333-3333-3333-333333333331',
          cashier_name: 'Tigist Haile',
          opening_float_minor: 50000,
          expected_cash_minor: 125000,
          actual_cash_minor: 125000,
          cash_difference_minor: 0,
          total_mobile_money_minor: 180000,
          total_sales_count: 14,
          total_void_count: 1,
          status: 'closed',
          notes: null,
          opened_at: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
          closed_at: new Date().toISOString(),
        },
        gross_sales_minor: 255000,
        net_sales_minor: 255000,
        cash_sales_minor: 75000,
        telebirr_sales_minor: 117000,
        cbe_sales_minor: 63000,
        opening_float_minor: 50000,
        expected_drawer_cash_minor: 125000,
        actual_drawer_cash_minor: 125000,
        discrepancy_minor: 0,
        discrepancy_status: 'balanced',
        formatted_report_text: '=== Z-REPORT ===\nStatus: BALANCED',
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/shifts/close',
        headers: { authorization: `Bearer ${cashierToken}` },
        payload: {
          branch_id: '22222222-2222-2222-2222-222222222221',
          actual_cash_minor: 125000,
          notes: 'Drawer cash balanced accurately',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.shift.status).toBe('closed');
      expect(body.discrepancy_status).toBe('balanced');
      expect(body.discrepancy_minor).toBe(0);
      expect(body.formatted_report_text).toContain('Z-REPORT');
    });
  });

  describe('GET /v1/shifts', () => {
    it('allows owner to query past shifts list', async () => {
      vi.spyOn(ShiftService, 'listShifts').mockResolvedValueOnce([
        {
          id: 'shift-uuid-1',
          org_id: '11111111-1111-1111-1111-111111111111',
          branch_id: '22222222-2222-2222-2222-222222222221',
          branch_name: 'Bole Branch',
          cashier_id: '33333333-3333-3333-3333-333333333331',
          cashier_name: 'Tigist Haile',
          opening_float_minor: 50000,
          expected_cash_minor: 125000,
          actual_cash_minor: 125000,
          cash_difference_minor: 0,
          total_mobile_money_minor: 180000,
          total_sales_count: 14,
          total_void_count: 1,
          status: 'closed',
          notes: null,
          opened_at: new Date().toISOString(),
          closed_at: new Date().toISOString(),
        },
      ]);

      const res = await app.inject({
        method: 'GET',
        url: '/v1/shifts?branch_id=22222222-2222-2222-2222-222222222221',
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.data).toHaveLength(1);
      expect(body.data[0].cashier_name).toBe('Tigist Haile');
    });
  });
});
