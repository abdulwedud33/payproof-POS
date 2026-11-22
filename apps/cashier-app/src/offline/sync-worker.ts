import type { OfflineStorage, OutboxRecord } from './storage.js';
import type { SaleResponse } from '@payproof/shared-types';

export interface ApiClient {
  postSale: (payload: any) => Promise<SaleResponse>;
}

export class SyncWorker {
  private storage: OfflineStorage;
  private api: ApiClient;
  private isRunning: boolean = false;

  constructor(storage: OfflineStorage, api: ApiClient) {
    this.storage = storage;
    this.api = api;
  }

  /**
   * Processes all pending sales in the outbox sequentially.
   * Leverages the server-side idempotency_key to prevent duplicate transactions.
   */
  public async processOutbox(): Promise<{ processed: number; succeeded: number; failed: number }> {
    if (this.isRunning) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    this.isRunning = true;
    let processed = 0;
    let succeeded = 0;
    let failed = 0;

    try {
      const pending = this.storage.getPendingSales();

      for (const record of pending) {
        processed++;
        this.storage.markSyncing(record.id);

        try {
          await this.api.postSale(record.payload);
          this.storage.markSynced(record.id);
          succeeded++;
        } catch (error: any) {
          failed++;
          this.storage.markFailed(record.id, error?.message || 'Network sync error');
        }
      }
    } finally {
      this.isRunning = false;
    }

    return { processed, succeeded, failed };
  }
}
