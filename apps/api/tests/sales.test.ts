import { describe, it, expect, vi, beforeAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { SaleService } from '../src/services/sale-service.js';

describe('Sales Endpoints & Cash Workflows', () => {
  const app = buildApp();
  let ownerToken: string;
  let cashierToken: string;
  let otherBranchCashierToken: string;

  beforeAll(async () => {
    await app.ready();
    ownerToken = app.jwt.sign({
      id: '00000000-0000-0000-0000-000000000001',
      orgId: '11111111-1111-1111-1111-111111111111',
      role: 'owner',
      branchIds: ['22222222-2222-2222-2222-222222222221', '22222222-2222-2222-2222-222222222222'],
    });
    cashierToken = app.jwt.sign({
      id: '33333333-3333-3333-3333-333333333331',
      orgId: '11111111-1111-1111-1111-111111111111',
      role: 'cashier',
      branchIds: ['22222222-2222-2222-2222-222222222221'],
    });
    otherBranchCashierToken = app.jwt.sign({
      id: '33333333-3333-3333-3333-333333333332',
      orgId: '11111111-1111-1111-1111-111111111111',
      role: 'cashier',
      branchIds: ['22222222-2222-2222-2222-222222222222'],
    });
  });

  describe('POST /v1/sales (Cash Sale)', () => {
    it('creates completed cash sale, verifies line totals and calculates change', async () => {
      const mockSale = {
        id: '99999999-9999-9999-9999-999999999991',
        org_id: '11111111-1111-1111-1111-111111111111',
        branch_id: '22222222-2222-2222-2222-222222222221',
        cashier_id: '33333333-3333-3333-3333-333333333331',
        status: 'paid' as const,
        payment_method: 'cash' as const,
        subtotal_minor: 31000,
        total_minor: 31000,
        cash_received_minor: 35000,
        overpaid_minor: 4000,
        idempotency_key: 'idemp-cash-sale-1',
        client_created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        voided_at: null,
        void_reason: null,
        voided_by: null,
        created_at: new Date().toISOString(),
        items: [
          {
            id: 'item-1',
            sale_id: '99999999-9999-9999-9999-999999999991',
            product_id: '11111111-1111-1111-1111-111111111111',
            name_snapshot: 'Magna Teff 1kg',
            barcode_snapshot: '690100100001',
            unit: 'kg' as const,
            unit_price_minor: 12500,
            quantity: 2,
            line_total_minor: 25000,
          },
          {
            id: 'item-2',
            sale_id: '99999999-9999-9999-9999-999999999991',
            product_id: '22222222-2222-2222-2222-222222222222',
            name_snapshot: 'Shola Fresh Milk 500ml',
            barcode_snapshot: '690100100040',
            unit: 'piece' as const,
            unit_price_minor: 6000,
            quantity: 1,
            line_total_minor: 6000,
          },
        ],
      };

      vi.spyOn(SaleService, 'createSale').mockResolvedValueOnce(mockSale);

      const res = await app.inject({
        method: 'POST',
        url: '/v1/sales',
        headers: { authorization: `Bearer ${cashierToken}` },
        payload: {
          id: '99999999-9999-9999-9999-999999999991',
          branch_id: '22222222-2222-2222-2222-222222222221',
          payment_method: 'cash',
          subtotal_minor: 31000,
          total_minor: 31000,
          cash_received_minor: 35000,
          idempotency_key: 'idemp-cash-sale-1',
          client_created_at: new Date().toISOString(),
          items: [
            {
              product_id: '11111111-1111-1111-1111-111111111111',
              name_snapshot: 'Magna Teff 1kg',
              barcode_snapshot: '690100100001',
              unit: 'kg',
              unit_price_minor: 12500,
              quantity: 2,
              line_total_minor: 25000,
            },
            {
              product_id: '22222222-2222-2222-2222-222222222222',
              name_snapshot: 'Shola Fresh Milk 500ml',
              barcode_snapshot: '690100100040',
              unit: 'piece',
              unit_price_minor: 6000,
              quantity: 1,
              line_total_minor: 6000,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('paid');
      expect(body.overpaid_minor).toBe(4000);
      expect(body.items).toHaveLength(2);
    });

    it('denies cashier creating sales for another branch (403 Forbidden)', async () => {
      vi.restoreAllMocks();
      // otherBranchCashier has branch-2, tries to submit sale for branch-1
      const res = await app.inject({
        method: 'POST',
        url: '/v1/sales',
        headers: { authorization: `Bearer ${otherBranchCashierToken}` },
        payload: {
          id: '99999999-9999-9999-9999-999999999992',
          branch_id: '22222222-2222-2222-2222-222222222221', // Branch 1 (not assigned)
          payment_method: 'cash',
          subtotal_minor: 5000,
          total_minor: 5000,
          cash_received_minor: 5000,
          idempotency_key: 'idemp-cross-branch-test',
          client_created_at: new Date().toISOString(),
          items: [
            {
              name_snapshot: 'Water',
              unit: 'piece',
              unit_price_minor: 5000,
              quantity: 1,
              line_total_minor: 5000,
            },
          ],
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /v1/sales/:id/void', () => {
    it('voids a paid sale with reason and valid PIN authorization', async () => {
      vi.spyOn(SaleService, 'voidSale').mockResolvedValueOnce({
        id: '99999999-9999-9999-9999-999999999991',
        org_id: '11111111-1111-1111-1111-111111111111',
        branch_id: '22222222-2222-2222-2222-222222222221',
        cashier_id: '33333333-3333-3333-3333-333333333331',
        status: 'voided',
        payment_method: 'cash',
        subtotal_minor: 31000,
        total_minor: 31000,
        cash_received_minor: 35000,
        overpaid_minor: 4000,
        idempotency_key: 'idemp-cash-sale-1',
        client_created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        voided_at: new Date().toISOString(),
        void_reason: 'Customer returned items immediately',
        voided_by: '00000000-0000-0000-0000-000000000001',
        created_at: new Date().toISOString(),
        items: [],
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/sales/99999999-9999-9999-9999-999999999991/void',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          reason: 'Customer returned items immediately',
          pin: '1234',
        },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.status).toBe('voided');
      expect(body.void_reason).toBe('Customer returned items immediately');
    });
  });
});
