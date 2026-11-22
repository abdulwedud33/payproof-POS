import { describe, it, expect } from 'vitest';
import { CartService } from '../src/cart/cart-service.js';
import type { ProductResponse } from '@payproof/shared-types';

describe('Cashier Cart Service (<300ms additions & Weighed Keypad)', () => {
  const milk: ProductResponse = {
    id: 'prod-milk-1',
    org_id: 'org-1',
    name: 'Shola Milk 500ml',
    unit: 'piece',
    price_minor: 6000, // 60.00 Birr
    active: true,
    barcodes: ['690100100040'],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  const watermelon: ProductResponse = {
    id: 'prod-wml-1',
    org_id: 'org-1',
    name: 'Watermelon Weighed',
    unit: 'kg',
    price_minor: 4500, // 45.00 Birr / kg
    active: true,
    barcodes: ['690100100064'],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  it('adds piece items and increments quantity on repeat scan', () => {
    const cart = new CartService();
    const start = performance.now();
    cart.addItem(milk, 1);
    const item2 = cart.addItem(milk, 2);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(300); // 300ms target from DESIGN.md
    expect(cart.getItemCount()).toBe(1);
    expect(item2.quantity).toBe(3);
    expect(item2.lineTotalMinor).toBe(18000); // 3 * 6000 santim
    expect(cart.calculateSubtotalMinor()).toBe(18000);
  });

  it('accurately calculates weighed items in kg using integer santim arithmetic', () => {
    const cart = new CartService();
    // 3.250 kg of watermelon at 45.00 Birr (4500 santim) / kg
    // 4500 * 3.250 = 14625 santim
    const item = cart.addItem(watermelon, 3.25);
    expect(item.quantity).toBe(3.25);
    expect(item.lineTotalMinor).toBe(14625);
    expect(cart.calculateSubtotalMinor()).toBe(14625);
  });

  it('supports undo last item removal (Instant feedback & error tolerance)', () => {
    const cart = new CartService();
    const item1 = cart.addItem(milk, 1);
    cart.addItem(watermelon, 2);

    expect(cart.getItemCount()).toBe(2);

    // Remove first item
    cart.removeItem(item1.id);
    expect(cart.getItemCount()).toBe(1);

    // Undo removal
    const restored = cart.undoLastRemoval();
    expect(restored).not.toBeNull();
    expect(restored?.id).toBe(item1.id);
    expect(cart.getItemCount()).toBe(2);
  });

  it('prepares cash sale payload and calculates exact change', () => {
    const cart = new CartService();
    cart.addItem(milk, 2); // 12000 santim = 120 Birr
    cart.addItem(watermelon, 2); // 9000 santim = 90 Birr
    // Total = 21000 santim = 210 Birr

    // Customer gives 250 Birr (25000 santim)
    const result = cart.prepareCashSale({
      branchId: '22222222-2222-2222-2222-222222222221',
      cashReceivedMinor: 25000,
    });

    expect(result.changeDueMinor).toBe(4000); // 40.00 Birr
    expect(result.changeDueFormatted).toBe('40.00 Birr');
    expect(result.saleRequest.total_minor).toBe(21000);
    expect(result.saleRequest.idempotency_key).toMatch(/^idemp-/);
  });

  it('rejects cash checkout if cash received is less than total', () => {
    const cart = new CartService();
    cart.addItem(milk, 1); // 6000 santim

    expect(() =>
      cart.prepareCashSale({
        branchId: '22222222-2222-2222-2222-222222222221',
        cashReceivedMinor: 5000, // Insufficient
      })
    ).toThrow(/Insufficient cash/);
  });
});
