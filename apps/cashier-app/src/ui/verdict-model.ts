/**
 * Accessible Verdict Presentation Model
 * DESIGN.md § 5.3 & § 7-9 / TRD § 4.4
 * Enforces Tri-Factor signals (Color + Icon + Word), zero-CLS layout dimensions,
 * WCAG 2.2 AA/AAA contrast ratios, and reduced-motion fallbacks.
 */

import { formatBirr } from '@payproof/money';
import { VerificationDecision } from '@payproof/shared-types';
import { referenceColors } from '@payproof/ui-tokens';

export type VerdictStatus = 'verified' | 'waiting' | 'rejected' | 'checking';

export interface VerdictAction {
  id: string;
  label: string;
  isPrimary: boolean;
  isDestructive?: boolean;
}

export interface VerdictPresentation {
  status: VerdictStatus;
  headline: string;
  iconName: 'check' | 'clock' | 'cross' | 'spinner-placeholder';
  backgroundColor: string;
  tintColor: string;
  textColor: string;
  formattedAmount: string;
  subtitle: string;
  detailMessage: string;
  warningMessage?: string;
  countdownDisplay?: string;
  actions: VerdictAction[];
  isSkeleton: boolean;
  accessibilityLabel: string;
}

export class VerdictModel {
  /**
   * Generates the zero-CLS skeleton placeholder displayed instantly when checking begins.
   * Prevents any layout jump between checking and final verdict card.
   */
  public static getSkeletonPresentation(totalMinor: bigint): VerdictPresentation {
    const formatted = formatBirr(totalMinor);
    return {
      status: 'checking',
      headline: 'Checking payment...',
      iconName: 'spinner-placeholder',
      backgroundColor: referenceColors.ground100,
      tintColor: referenceColors.line200,
      textColor: referenceColors.ink900,
      formattedAmount: formatted,
      subtitle: 'Contacting official provider service',
      detailMessage: 'Please hold still while we verify the transaction record',
      actions: [
        { id: 'cancel', label: 'Cancel', isPrimary: false },
      ],
      isSkeleton: true,
      accessibilityLabel: `Checking payment of ${formatted} with provider. Please wait.`,
    };
  }

  /**
   * Builds the presentation model for a completed or waiting verification decision.
   */
  public static getVerdictPresentation(
    totalMinor: bigint,
    branchName: string,
    provider: string,
    decision: VerificationDecision | null,
    waitingCountdownSeconds: number = 12
  ): VerdictPresentation {
    const formattedAmount = formatBirr(totalMinor);

    // 1. VERIFIED state (Signature moment: Ledger green fill)
    if (decision?.verdict === 'verified') {
      const nearMatchWarning = decision.reasons?.find((r) => r.includes('Near-match'));
      return {
        status: 'verified',
        headline: 'Verified',
        iconName: 'check',
        backgroundColor: referenceColors.ledger600,
        tintColor: referenceColors.ledger100,
        textColor: referenceColors.ground0,
        formattedAmount,
        subtitle: `${provider.toUpperCase()} · To ${branchName}`,
        detailMessage: 'Payment verified and claimed atomically.',
        warningMessage: nearMatchWarning,
        actions: [
          { id: 'complete_sale', label: 'Complete sale', isPrimary: true },
        ],
        isSkeleton: false,
        accessibilityLabel: `Payment of ${formattedAmount} to ${branchName} successfully verified. Tap to complete sale.`,
      };
    }

    // 2. WAITING state (Amber fill)
    if (!decision || decision.verdict === 'waiting') {
      const mins = Math.floor(waitingCountdownSeconds / 60);
      const secs = waitingCountdownSeconds % 60;
      const countdown = `${mins}:${secs.toString().padStart(2, '0')}`;

      return {
        status: 'waiting',
        headline: 'Waiting',
        iconName: 'clock',
        backgroundColor: referenceColors.amber500,
        tintColor: referenceColors.amber100,
        textColor: referenceColors.amber800,
        formattedAmount,
        subtitle: "Provider isn't answering yet",
        detailMessage: `Trying again automatically (${countdown})`,
        countdownDisplay: countdown,
        actions: [
          { id: 'retry', label: 'Retry now', isPrimary: true },
          { id: 'manual_id', label: 'Enter payment ID', isPrimary: false },
          { id: 'ask_owner', label: 'Ask owner for override', isPrimary: false },
        ],
        isSkeleton: false,
        accessibilityLabel: `Payment waiting. Provider not responding yet. Retrying in ${countdown}.`,
      };
    }

    // 3. REJECTED state (Red fill)
    let plainReason = 'Payment could not be verified.';
    let shortfallDisplay: string | undefined;

    switch (decision.rejectReason) {
      case 'untrusted_link':
        plainReason = 'Receipt link is untrusted or invalid.';
        break;
      case 'wrong_receiver':
        plainReason = 'Payment was sent to a different account.';
        break;
      case 'short_payment':
        if (decision.shortfallMinor) {
          const formattedShortfall = formatBirr(decision.shortfallMinor);
          plainReason = `Payment is ${formattedShortfall} short.`;
          shortfallDisplay = formattedShortfall;
        } else {
          plainReason = 'Payment amount is less than total.';
        }
        break;
      case 'already_used':
        plainReason = 'This payment transaction was already claimed.';
        break;
      case 'too_old':
        plainReason = 'Payment timestamp is older than allowed window.';
        break;
      case 'not_successful':
        plainReason = 'Provider reports payment failed or reversed.';
        break;
      default:
        plainReason = decision.reasons?.[0] || 'Payment rejected.';
    }

    return {
      status: 'rejected',
      headline: 'Rejected',
      iconName: 'cross',
      backgroundColor: referenceColors.red700,
      tintColor: referenceColors.red100,
      textColor: referenceColors.red800,
      formattedAmount,
      subtitle: plainReason,
      detailMessage: shortfallDisplay ? `Shortfall: ${shortfallDisplay}` : plainReason,
      actions: [
        { id: 'scan_another', label: 'Scan another receipt', isPrimary: true },
        { id: 'ask_owner', label: 'Ask owner for override', isPrimary: false },
        { id: 'cancel', label: 'Cancel', isPrimary: false, isDestructive: true },
      ],
      isSkeleton: false,
      accessibilityLabel: `Payment rejected. ${plainReason}.`,
    };
  }
}
