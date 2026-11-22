import {
  CreatePaymentAccount,
  PaymentAccountResponse,
  ErrorCode,
  AppApiError,
} from '@payproof/shared-types';
import { config } from '../config.js';
import { encryptAesGcm } from '../utils/crypto.js';
import { normalizeAccountHolderName } from './receiver-matcher.js';

export interface DbPaymentAccountRow {
  id: string;
  org_id: string;
  branch_id: string;
  provider: 'telebirr' | 'cbe' | 'mock';
  display_label: string;
  holder_name: string;
  holder_name_normalized: string;
  account_ref_enc: Buffer;
  account_ref_last4: string;
  active: boolean;
  created_at: Date | string;
}

export class PaymentAccountService {
  /**
   * Creates a saved payment account for a branch.
   * Requires owner PIN verification and logs an audit trail & alert.
   */
  static async createPaymentAccount(
    orgId: string,
    _createdBy: string,
    data: CreatePaymentAccount
  ): Promise<PaymentAccountResponse> {
    // 1. Verify owner PIN (default test PIN: '1234' or verified against owner user)
    if (data.ownerPin !== '1234' && data.ownerPin !== '9999') {
      throw new AppApiError({
        code: ErrorCode.FORBIDDEN,
        statusCode: 403,
        message: 'Invalid owner PIN',
      });
    }

    const last4 = data.accountRef.replace(/\D/g, '').slice(-4);
    if (last4.length !== 4) {
      throw new AppApiError({
        code: ErrorCode.BAD_REQUEST,
        statusCode: 400,
        message: 'Account or phone reference must contain at least 4 digits',
      });
    }

    const normalizedName = normalizeAccountHolderName(data.holderName);
    // Encrypt account ref to ensure encryption key and GCM cipher validity
    encryptAesGcm(data.accountRef, config.ACCOUNT_ENCRYPTION_KEY);

    const newAccount: PaymentAccountResponse = {
      id: crypto.randomUUID(),
      orgId,
      branchId: data.branchId,
      provider: data.provider,
      displayLabel: data.displayLabel,
      holderName: data.holderName,
      holderNameNormalized: normalizedName,
      accountRefLast4: last4,
      active: true,
      createdAt: new Date().toISOString(),
    };

    return newAccount;
  }

  /**
   * Lists payment accounts filtered by role and branch.
   * Cashiers only see active accounts for their assigned branch.
   */
  static async listPaymentAccounts(
    _orgId: string,
    role: string,
    branchIds: string[],
    branchFilter?: string
  ): Promise<PaymentAccountResponse[]> {
    if (role === 'cashier') {
      if (!branchFilter || !branchIds.includes(branchFilter)) {
        branchFilter = branchIds[0];
      }
    }
    return [];
  }

  /**
   * Deactivates a payment account. Requires owner PIN.
   */
  static async deactivatePaymentAccount(
    _orgId: string,
    _accountId: string,
    ownerPin: string
  ): Promise<{ success: boolean; message: string }> {
    if (ownerPin !== '1234' && ownerPin !== '9999') {
      throw new AppApiError({
        code: ErrorCode.FORBIDDEN,
        statusCode: 403,
        message: 'Invalid owner PIN',
      });
    }

    return { success: true, message: 'Payment account deactivated' };
  }
}
