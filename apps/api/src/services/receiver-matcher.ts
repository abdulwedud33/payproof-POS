import { ProviderEvidence } from '@payproof/shared-types';

export interface SavedPaymentAccount {
  id: string;
  branchId: string;
  provider: 'telebirr' | 'cbe' | 'mock';
  displayLabel: string;
  holderName: string;
  holderNameNormalized: string;
  accountRefLast4: string;
  active: boolean;
}

export interface ReceiverMatchResult {
  matches: boolean;
  matchedAccount?: SavedPaymentAccount;
  reason?: string;
  nearMatchWarning?: string;
}

/**
 * Normalizes account holder names according to TRD 4.5:
 * - NFKD Unicode normalization
 * - Lowercase
 * - Remove standard Ethiopian corporate & honorific titles (PLC, SC, Ato, W/ro, W/rt)
 * - Strip punctuation, symbols, and extra whitespace
 */
export function normalizeAccountHolderName(rawName: string): string {
  if (!rawName) return '';

  return (
    rawName
      .normalize('NFKD')
      .toLowerCase()
      // Remove corporate & honorific titles as whole words
      .replace(/\b(plc|p\.l\.c|share\s+company|s\.c|s\s+c|ato|w\/ro|w\/rt)\b/gi, ' ')
      // Remove punctuation & special characters
      .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()'"?]/g, ' ')
      // Collapse whitespace
      .replace(/\s+/g, ' ')
      .trim()
  );
}

/**
 * Calculates simple Levenshtein edit distance for near-match warning detection.
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] = 1 + Math.min(dp[i - 1]![j]!, dp[i]![j - 1]!, dp[i - 1]![j - 1]!);
      }
    }
  }

  return dp[m]![n]!;
}

/**
 * Dual-factor receiver matching according to TRD 4.5:
 * - Match on strongest identifier (account number last 4 / normalized name).
 * - If both are present, ALL must agree.
 * - Near-matches are rejected and surfaced as a warning.
 */
export function matchReceiver(
  evidence: ProviderEvidence,
  branchAccounts: SavedPaymentAccount[]
): ReceiverMatchResult {
  const providerAccounts = branchAccounts.filter(
    (acc) => acc.provider === evidence.provider && acc.active
  );

  if (providerAccounts.length === 0) {
    return {
      matches: false,
      reason: `No active saved ${evidence.provider} payment accounts found for this branch`,
    };
  }

  const evidenceNameNorm = evidence.receiverName
    ? normalizeAccountHolderName(evidence.receiverName)
    : null;

  // Extract last 4 digits from masked evidence account (e.g. "1000****789" -> "0789" or "789" or regex digits)
  let evidenceLast4: string | null = null;
  if (evidence.receiverAccountMasked) {
    const digits = evidence.receiverAccountMasked.replace(/\D/g, '');
    if (digits.length >= 4) {
      evidenceLast4 = digits.slice(-4);
    }
  }

  let nearMatchWarning: string | undefined;

  for (const acc of providerAccounts) {
    let nameMatches = false;
    let accountMatches = false;

    // Check account number match
    if (evidenceLast4) {
      accountMatches = acc.accountRefLast4 === evidenceLast4;
    }

    // Check holder name match
    if (evidenceNameNorm) {
      nameMatches = acc.holderNameNormalized === evidenceNameNorm;

      // Check near-match if not exact
      if (!nameMatches && !nearMatchWarning) {
        const dist = levenshteinDistance(acc.holderNameNormalized, evidenceNameNorm);
        if (dist <= 2 && dist > 0) {
          nearMatchWarning = `Near-match detected between '${evidence.receiverName}' and saved account '${acc.holderName}' (distance ${dist}). Rejected for safety.`;
        }
      }
    }

    // Dual-factor evaluation (TRD 4.5)
    if (evidenceLast4 && evidenceNameNorm) {
      if (accountMatches && nameMatches) {
        return { matches: true, matchedAccount: acc };
      }
    } else if (evidenceLast4) {
      if (accountMatches) {
        return { matches: true, matchedAccount: acc };
      }
    } else if (evidenceNameNorm) {
      if (nameMatches) {
        return { matches: true, matchedAccount: acc };
      }
    }
  }

  return {
    matches: false,
    reason: `Provider receiver (${evidence.receiverName || 'unknown'}, ${evidence.receiverAccountMasked || 'unknown'}) does not match any saved account for this branch`,
    nearMatchWarning,
  };
}
