import type { ProductResponse, CreateSaleRequest } from '@payproof/shared-types';

export interface OutboxRecord {
  id: string; // Sale UUID
  idempotencyKey: string;
  payload: CreateSaleRequest;
  qrText?: string;
  status: 'pending' | 'syncing' | 'synced' | 'failed' | 'needs_review';
  attempts: number;
  lastError?: string;
  createdAt: string;
  syncedAt?: string;
}

export class OfflineStorage {
  private catalogCache: Map<string, ProductResponse> = new Map();
  private barcodeIndex: Map<string, string> = new Map(); // barcode -> productId
  private outbox: Map<string, OutboxRecord> = new Map();

  /**
   * Caches products into local offline database and indexes barcodes.
   */
  public cacheCatalog(products: ProductResponse[]): void {
    for (const prod of products) {
      this.catalogCache.set(prod.id, prod);
      if (prod.barcodes && prod.barcodes.length > 0) {
        for (const bc of prod.barcodes) {
          this.barcodeIndex.set(bc.trim(), prod.id);
        }
      }
    }
  }

  public getProductByBarcode(barcode: string): ProductResponse | undefined {
    const prodId = this.barcodeIndex.get(barcode.trim());
    if (!prodId) return undefined;
    return this.catalogCache.get(prodId);
  }

  public searchCatalog(term: string): ProductResponse[] {
    const lower = term.trim().toLowerCase();
    if (!lower) return Array.from(this.catalogCache.values());

    return Array.from(this.catalogCache.values()).filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        (p.name_local && p.name_local.toLowerCase().includes(lower)) ||
        (p.sku && p.sku.toLowerCase().includes(lower)) ||
        (p.barcodes && p.barcodes.some((b) => b.toLowerCase().includes(lower)))
    );
  }

  public getCatalogCount(): number {
    return this.catalogCache.size;
  }

  /**
   * Enqueues a completed sale into local outbox queue for background sync.
   * Optionally accepts scanned QR text for mobile-money verification during sync.
   */
  public enqueueSale(sale: CreateSaleRequest, qrText?: string): OutboxRecord {
    const record: OutboxRecord = {
      id: sale.id,
      idempotencyKey: sale.idempotency_key,
      payload: sale,
      qrText,
      status: 'pending',
      attempts: 0,
      createdAt: new Date().toISOString(),
    };
    this.outbox.set(sale.id, record);
    return record;
  }

  public getPendingSales(): OutboxRecord[] {
    return Array.from(this.outbox.values()).filter(
      (r) => r.status === 'pending' || r.status === 'failed'
    );
  }

  public markSyncing(saleId: string): void {
    const rec = this.outbox.get(saleId);
    if (rec) {
      rec.status = 'syncing';
      rec.attempts += 1;
    }
  }

  public markSynced(saleId: string): void {
    const rec = this.outbox.get(saleId);
    if (rec) {
      rec.status = 'synced';
      rec.syncedAt = new Date().toISOString();
    }
  }

  public markFailed(saleId: string, error: string): void {
    const rec = this.outbox.get(saleId);
    if (rec) {
      rec.status = 'failed';
      rec.lastError = error;
    }
  }

  public getOutboxCount(): { total: number; pending: number; synced: number } {
    const all = Array.from(this.outbox.values());
    return {
      total: all.length,
      pending: all.filter((r) => r.status === 'pending' || r.status === 'failed').length,
      synced: all.filter((r) => r.status === 'synced').length,
    };
  }
}
