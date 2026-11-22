import type { OfflineStorage } from './storage.js';
import type { SaleResponse, VerificationDecision } from '@payproof/shared-types';

export interface ApiClient {
  postSale: (payload: any) => Promise<SaleResponse>;
  verifyMobileMoney?: (saleId: string, qrText: string) => Promise<VerificationDecision>;
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
   * For mobile money sales, performs provider verification during sync if offline QR was recorded.
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
          // 1. Post sale to server (idempotent via UUID v7 and idempotency_key)
          await this.api.postSale(record.payload);

          // 2. If mobile money with pending QR verification, verify against provider
          if (record.qrText && this.api.verifyMobileMoney) {
            const decision = await this.api.verifyMobileMoney(record.id, record.qrText);
            if (decision.verdict === 'rejected') {
              this.storage.markFailed(
                record.id,
                `Mobile money rejected: ${decision.rejectReason || 'Unknown error'}`
              );
              failed++;
              continue;
            }
          }

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
