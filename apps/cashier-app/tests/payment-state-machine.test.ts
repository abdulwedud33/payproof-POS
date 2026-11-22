import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PaymentStateMachine,
  HapticDriver,
  ReceivingAccountInfo,
} from '../src/payment/payment-state-machine.js';
import { VerificationDecision } from '@payproof/shared-types';

describe('Payment & Verification State Machine (DESIGN § 5.2 - 5.4 / TRD § 4.4)', () => {
  const receivingAccount: ReceivingAccountInfo = {
    provider: 'telebirr',
    displayLabel: 'Bole Branch Telebirr',
    holderName: 'Addis Mart - Bole Branch',
    accountRefLast4: '6789',
  };

  const saleContext = {
    saleId: '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b',
    totalMinor: 31800n, // 318.00 Birr
    branchName: 'Bole Branch',
    receivingAccount,
  };

  let mockHaptics: HapticDriver;
  let triggeredHaptics: string[];

  beforeEach(() => {
    triggeredHaptics = [];
    mockHaptics = {
      trigger: vi.fn((pattern) => {
        triggeredHaptics.push(pattern);
      }),
    };
  });

  it('completes immediately for cash payments without external network verification', () => {
    const sm = new PaymentStateMachine(saleContext, { haptics: mockHaptics });
    expect(sm.getState()).toBe('IDLE');

    sm.startPayment();
    expect(sm.getState()).toBe('SELECT_METHOD');

    sm.selectMethod('cash');
    expect(sm.getState()).toBe('COMPLETED');
    expect(triggeredHaptics).toContain('verified');
  });

  it('transitions through Mobile Money prompt to scanning and checking', async () => {
    const mockVerify = vi.fn().mockResolvedValue({
      verdict: 'verified',
      rejectReason: null,
      reasons: ['Payment confirmed by provider'],
      shortfallMinor: null,
      matchedAccountId: 'acc-1',
      transactionId: 'TXN_TEST_001',
      provider: 'telebirr',
      alertRaised: false,
    } as VerificationDecision);

    const sm = new PaymentStateMachine(saleContext, {
      haptics: mockHaptics,
      verifyPaymentApi: mockVerify,
    });

    sm.startPayment();
    sm.selectMethod('mobile_money');
    expect(sm.getState()).toBe('MOBILE_MONEY_PROMPT');

    sm.openScanner();
    expect(sm.getState()).toBe('SCANNING');

    // Capture QR -> transitions to CHECKING and executes API call
    const decisionPromise = sm.handleQrCaptured('https://telebirr.et/receipt/TXN_TEST_001');
    expect(sm.getState()).toBe('CHECKING'); // Verified is NOT shown before server responds

    const decision = await decisionPromise;
    expect(decision?.verdict).toBe('verified');
    expect(sm.getState()).toBe('VERIFIED');
    expect(triggeredHaptics).toContain('verified');

    // Complete sale from verified state
    sm.completeSale();
    expect(sm.getState()).toBe('COMPLETED');
  });

  it('handles REJECTED decision and triggers rejection haptic', async () => {
    const mockVerify = vi.fn().mockResolvedValue({
      verdict: 'rejected',
      rejectReason: 'wrong_receiver',
      reasons: ['Sent to wrong account'],
      shortfallMinor: null,
      matchedAccountId: null,
      transactionId: 'TXN_WRONG',
      provider: 'telebirr',
      alertRaised: true,
    } as VerificationDecision);

    const sm = new PaymentStateMachine(saleContext, {
      haptics: mockHaptics,
      verifyPaymentApi: mockVerify,
    });

    sm.startPayment();
    sm.selectMethod('mobile_money');
    sm.openScanner();

    await sm.handleQrCaptured('https://telebirr.et/receipt/TXN_WRONG');
    expect(sm.getState()).toBe('REJECTED');
    expect(triggeredHaptics).toContain('rejected');
  });

  it('handles WAITING state, counts down timer, and triggers automatic retry', async () => {
    let callCount = 0;
    const mockVerify = vi.fn().mockImplementation(async () => {
      callCount++;
      if (callCount === 1) {
        return {
          verdict: 'waiting',
          rejectReason: null,
          reasons: ['Transaction pending confirmation'],
          shortfallMinor: null,
          matchedAccountId: null,
          transactionId: 'TXN_PENDING',
          provider: 'telebirr',
          alertRaised: false,
        } as VerificationDecision;
      }
      return {
        verdict: 'verified',
        rejectReason: null,
        reasons: ['Confirmed on retry'],
        shortfallMinor: null,
        matchedAccountId: 'acc-1',
        transactionId: 'TXN_PENDING',
        provider: 'telebirr',
        alertRaised: false,
      } as VerificationDecision;
    });

    const sm = new PaymentStateMachine(saleContext, {
      haptics: mockHaptics,
      verifyPaymentApi: mockVerify,
      waitingTimeoutSeconds: 12,
      retryIntervalSeconds: 3,
    });

    sm.startPayment();
    sm.selectMethod('mobile_money');
    sm.openScanner();

    await sm.handleQrCaptured('https://telebirr.et/receipt/TXN_PENDING');
    expect(sm.getState()).toBe('WAITING');
    expect(sm.getContext().waitingCountdownSeconds).toBe(12);

    // Tick 1 second (11s left)
    await sm.tickWaitingTimer();
    expect(sm.getContext().waitingCountdownSeconds).toBe(11);
    expect(callCount).toBe(1);

    // Tick 2 seconds (10s left)
    await sm.tickWaitingTimer();
    expect(sm.getContext().waitingCountdownSeconds).toBe(10);

    // Tick 3 seconds (9s left -> multiple of 3 -> triggers automatic retry)
    await sm.tickWaitingTimer();
    expect(sm.getContext().waitingCountdownSeconds).toBe(9);
    expect(callCount).toBe(2);
    // Recovered to verified on retry!
    expect(sm.getState()).toBe('VERIFIED');
  });

  it('supports Manual Payment ID entry fallback', async () => {
    const mockVerify = vi.fn().mockResolvedValue({
      verdict: 'verified',
      rejectReason: null,
      reasons: ['Manual ID verified'],
      shortfallMinor: null,
      matchedAccountId: 'acc-1',
      transactionId: 'TXN_MANUAL_123',
      provider: 'telebirr',
      alertRaised: false,
    } as VerificationDecision);

    const sm = new PaymentStateMachine(saleContext, {
      haptics: mockHaptics,
      verifyPaymentApi: mockVerify,
    });

    sm.startPayment();
    sm.selectMethod('mobile_money');
    sm.openManualEntry();
    expect(sm.getState()).toBe('MANUAL_ENTRY');

    const decision = await sm.submitManualPaymentId('telebirr', 'TXN_MANUAL_123');
    expect(decision?.verdict).toBe('verified');
    expect(sm.getState()).toBe('VERIFIED');
  });

  it('supports Owner PIN Override flow with valid PIN and rejects invalid PIN', async () => {
    const mockOverride = vi.fn().mockImplementation(async (_saleId, pin, _reason) => {
      if (pin === '1234') {
        return { success: true };
      }
      throw new Error('Invalid owner PIN');
    });

    const sm = new PaymentStateMachine(saleContext, {
      haptics: mockHaptics,
      overridePaymentApi: mockOverride,
    });

    sm.startPayment();
    sm.selectMethod('mobile_money');
    sm.openScanner();

    // Trigger rejected state
    const mockVerify = vi.fn().mockResolvedValue({
      verdict: 'rejected',
      rejectReason: 'too_old',
      reasons: ['Payment is too old'],
      shortfallMinor: null,
      matchedAccountId: null,
      transactionId: 'TXN_OLD',
      provider: 'telebirr',
      alertRaised: false,
    });
    (sm as any).config.verifyPaymentApi = mockVerify;
    await sm.handleQrCaptured('https://telebirr.et/receipt/TXN_OLD');
    expect(sm.getState()).toBe('REJECTED');

    // Open override modal
    sm.openOverrideModal();
    expect(sm.getState()).toBe('OVERRIDE_MODAL');

    // Invalid PIN -> rejects
    const badRes = await sm.submitOverride('0000', 'Customer showed bank debit message');
    expect(badRes).toBe(false);
    expect(sm.getState()).toBe('OVERRIDE_MODAL');

    // Valid PIN -> transitions to VERIFIED
    const goodRes = await sm.submitOverride('1234', 'Customer showed bank debit message');
    expect(goodRes).toBe(true);
    expect(sm.getState()).toBe('VERIFIED');
    expect(triggeredHaptics).toContain('verified');
  });
});
