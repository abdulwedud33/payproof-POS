import { describe, it, expect } from 'vitest';
import {
  CreateProductRequestSchema,
  ProductImportRowSchema,
  CreateSaleRequestSchema,
  VoidSaleRequestSchema,
} from './index.js';

describe('packages/shared-types - Catalog & Sales', () => {
  it('validates product creation schema with barcodes', () => {
    const payload = {
      name: 'Fresh Bread',
      unit: 'piece',
      priceMinor: 4200n,
      barcodes: ['6001234567890'],
    };
    const parsed = CreateProductRequestSchema.safeParse(payload);
    expect(parsed.success).toBe(true);
  });

  it('validates CSV product import row format', () => {
    const row = {
      name: 'Watermelon',
      unit: 'kg',
      priceBirr: '30.00',
      barcode: '200123',
    };
    expect(ProductImportRowSchema.safeParse(row).success).toBe(true);

    const invalidRow = {
      name: 'Watermelon',
      priceBirr: 'invalid-price',
    };
    expect(ProductImportRowSchema.safeParse(invalidRow).success).toBe(false);
  });

  it('validates sale creation with items and integer amounts', () => {
    const salePayload = {
      id: '018f8e7b-1234-7123-8123-123456789abc',
      branchId: '00000000-0000-4000-8000-000000000001',
      paymentMethod: 'cash',
      subtotalMinor: 9600n,
      totalMinor: 9600n,
      cashReceivedMinor: 10000n,
      idempotencyKey: 'idemp_key_12345678',
      clientCreatedAt: new Date().toISOString(),
      items: [
        {
          nameSnapshot: 'Watermelon',
          unit: 'kg',
          unitPriceMinor: 3000n,
          quantity: 3.2,
          lineTotalMinor: 9600n,
        },
      ],
    };

    const parsed = CreateSaleRequestSchema.safeParse(salePayload);
    expect(parsed.success).toBe(true);
  });

  it('validates void reason requirement', () => {
    expect(VoidSaleRequestSchema.safeParse({ reason: 'Customer changed mind' }).success).toBe(true);
    expect(VoidSaleRequestSchema.safeParse({ reason: 'no' }).success).toBe(false); // too short
  });
});
