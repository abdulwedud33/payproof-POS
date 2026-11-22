import { describe, it, expect } from 'vitest';
import { VerdictModel } from '../src/ui/verdict-model.js';
import { VerificationDecision } from '@payproof/shared-types';
import { referenceColors } from '@payproof/ui-tokens';

describe('Accessible Verdict Presentation Model (DESIGN § 5.3 & § 7-9)', () => {
  const totalMinor = 31800n; // 318.00 Birr
  const branchName = 'Bole Branch';
  const provider = 'telebirr';

  it('generates zero-CLS skeleton layout matching final verdict card geometry', () => {
    const skeleton = VerdictModel.getSkeletonPresentation(totalMinor);

    expect(skeleton.isSkeleton).toBe(true);
    expect(skeleton.status).toBe('checking');
    expect(skeleton.headline).toBe('Checking payment...');
    expect(skeleton.formattedAmount).toBe('318.00 Birr');
    expect(skeleton.actions[0]?.id).toBe('cancel');
    expect(skeleton.accessibilityLabel).toContain('Checking payment of 318.00 Birr');
  });

  it('generates VERIFIED presentation with tri-factor signals and ledger green fill', () => {
    const decision: VerificationDecision = {
      verdict: 'verified',
      rejectReason: null,
      reasons: ['Payment confirmed'],
      shortfallMinor: null,
      matchedAccountId: 'acc-1',
      transactionId: 'TXN_123',
      provider: 'telebirr',
      alertRaised: false,
    };

    const model = VerdictModel.getVerdictPresentation(totalMinor, branchName, provider, decision);

    // Tri-factor signals: Color, Icon, Word
    expect(model.status).toBe('verified');
    expect(model.headline).toBe('Verified'); // Word
    expect(model.iconName).toBe('check'); // Icon
    expect(model.backgroundColor).toBe(referenceColors.ledger600); // Color
    expect(model.textColor).toBe(referenceColors.ground0); // High contrast text

    expect(model.formattedAmount).toBe('318.00 Birr');
    expect(model.subtitle).toBe('TELEBIRR · To Bole Branch');
    expect(model.actions[0]?.id).toBe('complete_sale');
    expect(model.actions[0]?.isPrimary).toBe(true);
  });

  it('generates WAITING presentation with amber fill, countdown, and fallback actions', () => {
    const decision: VerificationDecision = {
      verdict: 'waiting',
      rejectReason: 'fetch_failed',
      reasons: ['Provider not responding'],
      shortfallMinor: null,
      matchedAccountId: null,
      transactionId: null,
      provider: null,
      alertRaised: false,
    };

    const model = VerdictModel.getVerdictPresentation(totalMinor, branchName, provider, decision, 12);

    expect(model.status).toBe('waiting');
    expect(model.headline).toBe('Waiting');
    expect(model.iconName).toBe('clock');
    expect(model.backgroundColor).toBe(referenceColors.amber500);
    expect(model.textColor).toBe(referenceColors.amber800);
    expect(model.countdownDisplay).toBe('0:12');

    const actionIds = model.actions.map((a) => a.id);
    expect(actionIds).toEqual(['retry', 'manual_id', 'ask_owner']);
  });

  it('generates REJECTED presentation with red fill and plain language shortfall explanation', () => {
    const decision: VerificationDecision = {
      verdict: 'rejected',
      rejectReason: 'short_payment',
      reasons: ['Amount paid is 40.00 Birr short'],
      shortfallMinor: 4000n, // 40.00 Birr
      matchedAccountId: 'acc-1',
      transactionId: 'TXN_SHORT',
      provider: 'telebirr',
      alertRaised: true,
    };

    const model = VerdictModel.getVerdictPresentation(totalMinor, branchName, provider, decision);

    expect(model.status).toBe('rejected');
    expect(model.headline).toBe('Rejected');
    expect(model.iconName).toBe('cross');
    expect(model.backgroundColor).toBe(referenceColors.red700);
    expect(model.textColor).toBe(referenceColors.red800);

    expect(model.subtitle).toBe('Payment is 40.00 Birr short.');
    expect(model.detailMessage).toContain('Shortfall: 40.00 Birr');

    const actionIds = model.actions.map((a) => a.id);
    expect(actionIds).toEqual(['scan_another', 'ask_owner', 'cancel']);
  });

  it('renders quiet warning strip on near-match without competing with Verified headline', () => {
    const decision: VerificationDecision = {
      verdict: 'verified',
      rejectReason: null,
      reasons: ['Near-match detected on account name'],
      shortfallMinor: null,
      matchedAccountId: 'acc-1',
      transactionId: 'TXN_WARN',
      provider: 'telebirr',
      alertRaised: false,
    };

    const model = VerdictModel.getVerdictPresentation(totalMinor, branchName, provider, decision);
    expect(model.headline).toBe('Verified');
    expect(model.warningMessage).toBe('Near-match detected on account name');
  });
});
