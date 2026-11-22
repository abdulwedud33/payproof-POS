import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OfflineStorage } from '../src/offline/storage.js';
import { SyncWorker, ApiClient } from '../src/offline/sync-worker.js';
import { CreateSaleRequest, VerificationDecision } from '@payproof/shared-types';

describe('Offline Mobile-Money Queuing & Sync Worker (TRD § 4.4 / § 5.3)', () => {
  let storage: OfflineStorage;

  const sampleSale: CreateSaleRequest = {
    id: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b',
    idempotency_key: 'idem-sale-offline-001',
    branch_id: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6c',
    payment_method: 'mobile_money',
    total_minor: 15000,
    items: [
      {
        product_id: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a70',
        quantity: 2,
        unit_price_minor: 7500,
        line_total_minor: 15000,
      },
    ],
  };

  beforeEach(() => {
    storage = new OfflineStorage();
  });

  it('enqueues offline mobile money sale with scanned QR text', () => {
    const qrUrl = 'http://127.0.0.1:8080/receipt/telebirr/TXN_OFFLINE_001';
    const record = storage.enqueueSale(sampleSale, qrUrl);

    expect(record.status).toBe('pending');
    expect(record.qrText).toBe(qrUrl);
    expect(record.payload.id).toBe(sampleSale.id);

    const pending = storage.getPendingSales();
    expect(pending.length).toBe(1);
    expect(pending[0]?.qrText).toBe(qrUrl);
  });

  it('syncs offline mobile money sale and verifies against provider on reconnection', async () => {
    const qrUrl = 'http://127.0.0.1:8080/receipt/telebirr/TXN_OFFLINE_001';
    storage.enqueueSale(sampleSale, qrUrl);

    const mockPostSale = vi.fn().mockResolvedValue({
      id: sampleSale.id,
      org_id: 'org-1',
      branch_id: sampleSale.branch_id,
      cashier_id: 'cashier-1',
      receipt_number: 'REC-001',
      total_minor: sampleSale.total_minor,
      payment_method: 'mobile_money',
      status: 'pending_verification',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const mockVerify = vi.fn().mockResolvedValue({
      verdict: 'verified',
      rejectReason: null,
      reasons: ['Offline payment verified upon sync'],
      shortfallMinor: null,
      matchedAccountId: 'acc-1',
      transactionId: 'TXN_OFFLINE_001',
      provider: 'telebirr',
      alertRaised: false,
    } as VerificationDecision);

    const api: ApiClient = {
      postSale: mockPostSale,
      verifyMobileMoney: mockVerify,
    };

    const worker = new SyncWorker(storage, api);
    const syncRes = await worker.processOutbox();

    expect(syncRes.processed).toBe(1);
    expect(syncRes.succeeded).toBe(1);
    expect(syncRes.failed).toBe(0);

    expect(mockPostSale).toHaveBeenCalledWith(sampleSale);
    expect(mockVerify).toHaveBeenCalledWith(sampleSale.id, qrUrl);

    const pendingAfter = storage.getPendingSales();
    expect(pendingAfter.length).toBe(0);
  });

  it('marks outbox sale as failed with reason if mobile money verification is rejected during sync', async () => {
    const qrUrl = 'http://127.0.0.1:8080/receipt/telebirr/TXN_REJECTED';
    storage.enqueueSale(sampleSale, qrUrl);

    const mockPostSale = vi.fn().mockResolvedValue({ id: sampleSale.id });
    const mockVerify = vi.fn().mockResolvedValue({
      verdict: 'rejected',
      rejectReason: 'already_used',
      reasons: ['Transaction ID was previously claimed'],
      shortfallMinor: null,
      matchedAccountId: null,
      transactionId: 'TXN_REJECTED',
      provider: 'telebirr',
      alertRaised: true,
    } as VerificationDecision);

    const api: ApiClient = {
      postSale: mockPostSale,
      verifyMobileMoney: mockVerify,
    };

    const worker = new SyncWorker(storage, api);
    const syncRes = await worker.processOutbox();

    expect(syncRes.processed).toBe(1);
    expect(syncRes.succeeded).toBe(0);
    expect(syncRes.failed).toBe(1);

    const pendingAfter = storage.getPendingSales();
    expect(pendingAfter.length).toBe(1);
    expect(pendingAfter[0]?.lastError).toContain('Mobile money rejected: already_used');
  });
});
