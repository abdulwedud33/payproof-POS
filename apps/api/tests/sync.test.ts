import { describe, it, expect, vi, beforeAll } from 'vitest';
import { buildApp } from '../src/app.js';
import { SyncService } from '../src/services/sync-service.js';

describe('Catalog Sync Endpoints', () => {
  const app = buildApp();
  let cashierToken: string;

  beforeAll(async () => {
    await app.ready();
    cashierToken = app.jwt.sign({
      id: '33333333-3333-3333-3333-333333333331',
      orgId: '11111111-1111-1111-1111-111111111111',
      role: 'cashier',
      branchIds: ['22222222-2222-2222-2222-222222222221'],
    });
  });

  describe('GET /v1/sync/catalog', () => {
    it('returns catalog sync dataset with server timestamp and barcodes', async () => {
      vi.spyOn(SyncService, 'getCatalogSync').mockResolvedValueOnce({
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
        server_time: new Date().toISOString(),
        count: 1,
      });

      const res = await app.inject({
        method: 'GET',
        url: '/v1/sync/catalog',
        headers: { authorization: `Bearer ${cashierToken}` },
      });

      expect(res.statusCode).toBe(200);
      const body = JSON.parse(res.body);
      expect(body.count).toBe(1);
      expect(body.products[0].barcodes).toContain('690100100001');
      expect(body.server_time).toBeDefined();
    });
  });
});
