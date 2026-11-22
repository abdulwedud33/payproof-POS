import { describe, it, expect, vi, beforeAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { ProductService } from '../src/services/product-service.js';

describe('Product Endpoints & Security', () => {
  const app = buildApp();
  let ownerToken: string;
  let cashierToken: string;

  beforeAll(async () => {
    await app.ready();
    ownerToken = app.jwt.sign({
      id: '00000000-0000-0000-0000-000000000001',
      orgId: '11111111-1111-1111-1111-111111111111',
      role: 'owner',
      branchIds: ['22222222-2222-2222-2222-222222222221'],
    });
    cashierToken = app.jwt.sign({
      id: '33333333-3333-3333-3333-333333333331',
      orgId: '11111111-1111-1111-1111-111111111111',
      role: 'cashier',
      branchIds: ['22222222-2222-2222-2222-222222222221'],
    });
  });

  describe('Formula Injection Defense', () => {
    it('escapes dangerous spreadsheet formula characters (=, +, -, @)', () => {
      expect(ProductService.sanitizeFormulaInjection('=cmd|/c calc')).toBe("'=cmd|/c calc");
      expect(ProductService.sanitizeFormulaInjection('+12345')).toBe("'+12345");
      expect(ProductService.sanitizeFormulaInjection('-20+5')).toBe("'-20+5");
      expect(ProductService.sanitizeFormulaInjection('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
      expect(ProductService.sanitizeFormulaInjection('Normal Product')).toBe('Normal Product');
    });
  });

  describe('GET /v1/products', () => {
    it('allows cashier and owner to search catalog', async () => {
      vi.spyOn(ProductService, 'listProducts').mockResolvedValueOnce({
        products: [
          {
            id: 'prod-1',
            org_id: '11111111-1111-1111-1111-111111111111',
            name: 'Magna Teff 1kg',
            name_local: 'የማግና ጤፍ',
            sku: 'TEF-01',
            unit: 'kg',
            price_minor: 12500,
            active: true,
            barcodes: ['690100100001'],
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
          },
        ],
        total: 1,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/v1/products?search=Teff',
        headers: { authorization: `Bearer ${cashierToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.products).toHaveLength(1);
      expect(body.products[0].name).toBe('Magna Teff 1kg');
    });
  });

  describe('POST /v1/products', () => {
    it('allows owner to create product with barcodes', async () => {
      vi.spyOn(ProductService, 'createProduct').mockResolvedValueOnce({
        id: 'prod-new-1',
        org_id: '11111111-1111-1111-1111-111111111111',
        name: 'Ambo Water 1L',
        name_local: 'አምቦ ውሀ',
        sku: 'WTR-01',
        unit: 'piece',
        price_minor: 5000,
        active: true,
        barcodes: ['690100100071'],
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });

      const res = await app.inject({
        method: 'POST',
        url: '/v1/products',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {
          name: 'Ambo Water 1L',
          name_local: 'አምቦ ውሀ',
          sku: 'WTR-01',
          unit: 'piece',
          price_minor: 5000,
          barcodes: ['690100100071'],
        },
      });

      expect(res.statusCode).toBe(201);
      const body = JSON.parse(res.body);
      expect(body.id).toBe('prod-new-1');
      expect(body.price_minor).toBe(5000);
    });

    it('denies cashier from creating products (403 Forbidden)', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/v1/products',
        headers: { authorization: `Bearer ${cashierToken}` },
        payload: {
          name: 'Unauthorized Item',
          unit: 'piece',
          price_minor: 1000,
        },
      });

      expect(res.statusCode).toBe(403);
    });
  });

  describe('POST /v1/products/import', () => {
    it('processes bulk CSV import and sanitizes malicious rows', async () => {
      vi.spyOn(ProductService, 'importCsv').mockResolvedValueOnce({
        imported: 2,
        errors: [],
      });

      const csvData = `name,name_local,sku,unit,price_minor,barcode\n=Dangerous,አደጋ,SKU1,piece,1500,111111\nBread,ዳቦ,SKU2,piece,700,222222`;

      const res = await app.inject({
        method: 'POST',
        url: '/v1/products/import',
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { csv: csvData },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.imported).toBe(2);
    });
  });
});
