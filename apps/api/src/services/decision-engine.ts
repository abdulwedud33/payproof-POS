import { ProviderEvidence, VerificationDecision, SafeFetchError } from '@payproof/shared-types';
import { formatBirr } from '@payproof/money';
import { matchReceiver, SavedPaymentAccount } from './receiver-matcher.js';

export interface DecisionSaleContext {
  id: string;
  totalMinor: bigint;
  branchId: string;
  clientCreatedAt: Date;
}

export interface DecisionOptions {
  allowedWindowMs?: number; // Default 60 minutes (3,600,000 ms)
}

/**
 * Pure, deterministic Decision Engine evaluating TRD 4.4 rules in exact order (1 to 9).
 * Returns the immutable verification decision.
 */
export function evaluatePaymentDecision(
  evidence: ProviderEvidence | null,
  fetchError: SafeFetchError | null,
  sale: DecisionSaleContext,
  branchAccounts: SavedPaymentAccount[],
  isAlreadyConsumed: boolean,
  now: Date = new Date(),
  options: DecisionOptions = {}
): VerificationDecision {
  const allowedWindowMs = options.allowedWindowMs ?? 60 * 60 * 1000; // 60 minutes

  // Rule 1: Untrusted link or not on allowlist
  if (fetchError?.code === 'UNTRUSTED_LINK' || fetchError?.code === 'SSRF_BLOCKED') {
    return {
      verdict: 'rejected',
      rejectReason: 'untrusted_link',
      reasons: [
        fetchError.message ||
          'Link is not HTTPS, host is not on allowlist, or redirects off allowlist',
      ],
      shortfallMinor: null,
      matchedAccountId: null,
      transactionId: null,
      provider: null,
      alertRaised: true,
    };
  }

  // Rule 2: Page could not be fetched or parsed
  if (!evidence || fetchError) {
    return {
      verdict: 'waiting',
      rejectReason: 'fetch_failed',
      reasons: [
        fetchError?.message ||
          'Page could not be fetched or parsed (timeout, network error, or layout changed)',
      ],
      shortfallMinor: null,
      matchedAccountId: null,
      transactionId: null,
      provider: null,
      alertRaised: false,
    };
  }

  // Rule 3: Provider status is pending
  if (evidence.status === 'pending') {
    return {
      verdict: 'waiting',
      rejectReason: null,
      reasons: ['Provider transaction is pending confirmation'],
      shortfallMinor: null,
      matchedAccountId: null,
      transactionId: evidence.transactionId,
      provider: evidence.provider,
      alertRaised: false,
    };
  }

  // Rule 4: Provider status is failed or reversed
  if (evidence.status === 'failed' || evidence.status === 'reversed') {
    return {
      verdict: 'rejected',
      rejectReason: 'not_successful',
      reasons: [`Provider reports transaction status as '${evidence.status}'`],
      shortfallMinor: null,
      matchedAccountId: null,
      transactionId: evidence.transactionId,
      provider: evidence.provider,
      alertRaised: false,
    };
  }

  // Rule 5: Receiver does not match a saved account of this branch
  const matchResult = matchReceiver(evidence, branchAccounts);
  if (!matchResult.matches) {
    const reasons = [
      matchResult.reason || 'Receiver does not match any saved account for this branch',
    ];
    if (matchResult.nearMatchWarning) {
      reasons.push(matchResult.nearMatchWarning);
    }
    return {
      verdict: 'rejected',
      rejectReason: 'wrong_receiver',
      reasons,
      shortfallMinor: null,
      matchedAccountId: null,
      transactionId: evidence.transactionId,
      provider: evidence.provider,
      alertRaised: true,
    };
  }

  // Rule 6: Payment time outside allowed window
  const paymentTime = new Date(evidence.paymentTimestamp);
  const ageMs = now.getTime() - paymentTime.getTime();
  if (ageMs > allowedWindowMs || ageMs < -300000) {
    // Also rejects future timestamps >5 min ahead for clock skew protection
    const ageMinutes = Math.round(ageMs / 60000);
    return {
      verdict: 'rejected',
      rejectReason: 'too_old',
      reasons: [
        `Payment timestamp is outside the allowed window (${ageMinutes} minutes old; max ${allowedWindowMs / 60000} minutes)`,
      ],
      shortfallMinor: null,
      matchedAccountId: matchResult.matchedAccount?.id || null,
      transactionId: evidence.transactionId,
      provider: evidence.provider,
      alertRaised: false,
    };
  }

  // Rule 7: Amount is less than the total
  if (evidence.amountMinor < sale.totalMinor) {
    const shortfallMinor = sale.totalMinor - evidence.amountMinor;
    const formattedShortfall = formatBirr(shortfallMinor);
    const formattedPaid = formatBirr(evidence.amountMinor);
    const formattedTotal = formatBirr(sale.totalMinor);

    return {
      verdict: 'rejected',
      rejectReason: 'short_payment',
      reasons: [
        `Amount paid (${formattedPaid}) is less than sale total (${formattedTotal}). Shortfall: ${formattedShortfall}`,
      ],
      shortfallMinor,
      matchedAccountId: matchResult.matchedAccount?.id || null,
      transactionId: evidence.transactionId,
      provider: evidence.provider,
      alertRaised: true,
    };
  }

  // Rule 8: Transaction ID already claimed
  if (isAlreadyConsumed) {
    return {
      verdict: 'rejected',
      rejectReason: 'already_used',
      reasons: [
        `Transaction ID '${evidence.transactionId}' has already been claimed by another sale`,
      ],
      shortfallMinor: null,
      matchedAccountId: matchResult.matchedAccount?.id || null,
      transactionId: evidence.transactionId,
      provider: evidence.provider,
      alertRaised: true,
    };
  }

  // Rule 9: All checks pass
  return {
    verdict: 'verified',
    rejectReason: null,
    reasons: [
      'All verification checks passed: provider record valid, receiver matched, amount satisfied, time window valid, transaction unclaimed',
    ],
    shortfallMinor: null,
    matchedAccountId: matchResult.matchedAccount?.id || null,
    transactionId: evidence.transactionId,
    provider: evidence.provider,
    alertRaised: false,
  };
}
