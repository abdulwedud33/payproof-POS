import { describe, it, expect, vi } from 'vitest';
import { OfflineStorage } from '../src/offline/storage.js';
import { SyncWorker, type ApiClient } from '../src/offline/sync-worker.js';
import type { ProductResponse, CreateSaleRequest, SaleResponse } from '@payproof/shared-types';

describe('Offline Storage & Outbox Sync Worker', () => {
  const sampleProducts: ProductResponse[] = [
    {
      id: 'prod-teff-1',
      org_id: '11111111-1111-1111-1111-111111111111',
      name: 'Magna Teff 1kg',
      unit: 'kg',
      price_minor: 12500,
      active: true,
      barcodes: ['690100100001', '690100100002'],
      updated_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    },
  ];

  const sampleSale: CreateSaleRequest = {
    id: '99999999-9999-9999-9999-999999999901',
    branch_id: '22222222-2222-2222-2222-222222222221',
    payment_method: 'cash',
    subtotal_minor: 12500,
    total_minor: 12500,
    cash_received_minor: 15000,
    idempotency_key: 'idemp-test-01',
    client_created_at: new Date().toISOString(),
    items: [
      {
        name_snapshot: 'Magna Teff 1kg',
        unit: 'kg',
        unit_price_minor: 12500,
        quantity: 1,
        line_total_minor: 12500,
      },
    ],
  };

  it('indexes catalog and resolves barcode lookups offline in <5ms', () => {
    const storage = new OfflineStorage();
    storage.cacheCatalog(sampleProducts);

    expect(storage.getCatalogCount()).toBe(1);

    const start = performance.now();
    const product = storage.getProductByBarcode('690100100001');
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(5);
    expect(product).toBeDefined();
    expect(product?.name).toBe('Magna Teff 1kg');

    // Also resolves secondary barcode
    const prod2 = storage.getProductByBarcode('690100100002');
    expect(prod2?.id).toBe(product?.id);
  });

  it('enqueues sale in offline outbox and syncs when online', async () => {
    const storage = new OfflineStorage();
    storage.enqueueSale(sampleSale);

    const countsBefore = storage.getOutboxCount();
    expect(countsBefore.total).toBe(1);
    expect(countsBefore.pending).toBe(1);
    expect(countsBefore.synced).toBe(0);

    const mockApi: ApiClient = {
      postSale: vi.fn().mockResolvedValue({
        id: sampleSale.id,
        status: 'paid',
      } as SaleResponse),
    };

    const worker = new SyncWorker(storage, mockApi);
    const result = await worker.processOutbox();

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(mockApi.postSale).toHaveBeenCalledWith(sampleSale);

    const countsAfter = storage.getOutboxCount();
    expect(countsAfter.pending).toBe(0);
    expect(countsAfter.synced).toBe(1);
  });

  it('handles network failure gracefully without losing queued sales', async () => {
    const storage = new OfflineStorage();
    storage.enqueueSale(sampleSale);

    const mockFailingApi: ApiClient = {
      postSale: vi.fn().mockRejectedValue(new Error('Network unavailable: Connection timed out')),
    };

    const worker = new SyncWorker(storage, mockFailingApi);
    const result = await worker.processOutbox();

    expect(result.processed).toBe(1);
    expect(result.succeeded).toBe(0);
    expect(result.failed).toBe(1);

    // Sale remains safely in pending outbox for subsequent retry
    const countsAfter = storage.getOutboxCount();
    expect(countsAfter.pending).toBe(1);
    expect(countsAfter.synced).toBe(0);
    const pendingSales = storage.getPendingSales();
    expect(pendingSales[0].lastError).toContain('Network unavailable');
  });
});
