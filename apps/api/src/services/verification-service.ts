import {
  VerificationDecision,
  VerifySaleRequest,
  ManualOverrideRequest,
  SafeFetchResult,
  ErrorCode,
  AppApiError,
} from '@payproof/shared-types';
import { VerificationClient } from './verification-client.js';
import { evaluatePaymentDecision } from './decision-engine.js';
import { SavedPaymentAccount } from './receiver-matcher.js';

// In-memory claims set for simulating atomic DB constraint in testing
const globalConsumedClaims = new Set<string>();

export class VerificationService {
  private static client: VerificationClient = new VerificationClient({
    allowlistHosts: ['127.0.0.1', 'localhost', 'mock-provider.payproof.internal'],
    allowHttpForDev: true,
    allowLoopbackForDev: true,
  });

  /**
   * Resets in-memory claim store (used by test suites).
   */
  static resetClaims() {
    globalConsumedClaims.clear();
  }

  /**
   * Executes atomic mobile-money payment verification and claim.
   * Concurrency-safe: Exactly one concurrent claim will succeed for a given provider + transactionId.
   */
  static async verifyMobileMoney(
    _orgId: string,
    _cashierId: string,
    branchIds: string[],
    saleId: string,
    payload: VerifySaleRequest,
    options?: {
      mockSale?: { totalMinor: bigint; branchId: string };
      mockBranchAccounts?: SavedPaymentAccount[];
    }
  ): Promise<VerificationDecision> {
    const totalMinor = options?.mockSale?.totalMinor ?? 15000n;
    const branchId = options?.mockSale?.branchId ?? branchIds[0] ?? 'branch-1';

    const branchAccounts: SavedPaymentAccount[] = options?.mockBranchAccounts ?? [
      {
        id: 'acc-1',
        branchId,
        provider: 'telebirr',
        displayLabel: 'Bole Branch Account',
        holderName: 'Addis Mart - Bole Branch',
        holderNameNormalized: 'addis mart bole branch',
        accountRefLast4: '6789',
        active: true,
      },
      {
        id: 'acc-2',
        branchId,
        provider: 'cbe',
        displayLabel: 'CBE Branch Account',
        holderName: 'Addis Mart - Bole Branch',
        holderNameNormalized: 'addis mart bole branch',
        accountRefLast4: '6789',
        active: true,
      },
    ];

    // 1. Fetch Evidence via Safe Fetcher & Mock Provider
    const fetchResult: SafeFetchResult = await this.client.fetchEvidence({
      qrText: payload.qrText,
      saleId,
    });

    const evidence = fetchResult.ok ? fetchResult.evidence : null;
    const fetchError = !fetchResult.ok ? fetchResult.error : null;

    // 2. Check if transaction ID was already consumed
    const claimKey = evidence ? `${evidence.provider}:${evidence.transactionId}` : '';
    const isAlreadyConsumed = claimKey ? globalConsumedClaims.has(claimKey) : false;

    // 3. Evaluate Decision Engine (Rules 1 to 9)
    const decision = evaluatePaymentDecision(
      evidence,
      fetchError,
      {
        id: saleId,
        totalMinor,
        branchId,
        clientCreatedAt: new Date(),
      },
      branchAccounts,
      isAlreadyConsumed
    );

    // 4. Atomic Claim Execution
    if (decision.verdict === 'verified' && claimKey) {
      // Simulate database unique constraint `PRIMARY KEY (provider, provider_txn_id)`
      if (globalConsumedClaims.has(claimKey)) {
        // Concurrency collision detected: Another simultaneous request won the claim
        return {
          verdict: 'rejected',
          rejectReason: 'already_used',
          reasons: [
            `Transaction ID '${evidence!.transactionId}' was claimed concurrently by another sale`,
          ],
          shortfallMinor: null,
          matchedAccountId: decision.matchedAccountId,
          transactionId: evidence!.transactionId,
          provider: evidence!.provider,
          alertRaised: true,
        };
      }

      // Atomic write
      globalConsumedClaims.add(claimKey);
    }

    return decision;
  }

  /**
   * Applies manual override with owner PIN and mandatory justification.
   */
  static async applyManualOverride(
    _orgId: string,
    _cashierId: string,
    _branchIds: string[],
    saleId: string,
    payload: ManualOverrideRequest
  ): Promise<{ success: boolean; saleId: string; status: 'paid' }> {
    if (payload.ownerPin !== '1234' && payload.ownerPin !== '9999') {
      throw new AppApiError({
        code: ErrorCode.FORBIDDEN,
        statusCode: 403,
        message: 'Invalid owner PIN',
      });
    }

    if (!payload.reason || payload.reason.trim().length < 5) {
      throw new AppApiError({
        code: ErrorCode.BAD_REQUEST,
        statusCode: 400,
        message: 'Override justification must be at least 5 characters',
      });
    }

    return {
      success: true,
      saleId,
      status: 'paid',
    };
  }
}
