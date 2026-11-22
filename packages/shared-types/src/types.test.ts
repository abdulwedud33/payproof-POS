import { describe, it, expect } from 'vitest';
import {
  RegisterOwnerRequestSchema,
  PinVerifyRequestSchema,
  PhoneSchema,
  CreateCashierRequestSchema,
  CreateBranchRequestSchema,
} from './index.js';

describe('packages/shared-types', () => {
  describe('PhoneSchema', () => {
    it('validates Ethiopian mobile numbers (+251 and 0 format)', () => {
      expect(PhoneSchema.safeParse('+251911223344').success).toBe(true);
      expect(PhoneSchema.safeParse('+251711223344').success).toBe(true);
      expect(PhoneSchema.safeParse('0911223344').success).toBe(true);
      expect(PhoneSchema.safeParse('0711223344').success).toBe(true);

      // Invalid
      expect(PhoneSchema.safeParse('12345678').success).toBe(false);
      expect(PhoneSchema.safeParse('+15551234567').success).toBe(false);
    });
  });

  describe('RegisterOwnerRequestSchema', () => {
    it('validates full owner registration payload', () => {
      const payload = {
        businessName: 'Fresh Mart Supermarket',
        fullName: 'Meseret Tadesse',
        phone: '0911223344',
        password: 'SecurePassword123!',
      };
      const result = RegisterOwnerRequestSchema.safeParse(payload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.firstBranchName).toBe('Main Branch');
        expect(result.data.city).toBe('Addis Ababa');
      }
    });

    it('rejects short passwords', () => {
      const payload = {
        businessName: 'Fresh Mart',
        fullName: 'Meseret',
        phone: '0911223344',
        password: 'short',
      };
      expect(RegisterOwnerRequestSchema.safeParse(payload).success).toBe(false);
    });
  });

  describe('PinVerifyRequestSchema', () => {
    it('accepts 4 to 6 digit pins only', () => {
      expect(PinVerifyRequestSchema.safeParse({ pin: '1234' }).success).toBe(true);
      expect(PinVerifyRequestSchema.safeParse({ pin: '123456' }).success).toBe(true);
      expect(PinVerifyRequestSchema.safeParse({ pin: '123' }).success).toBe(false);
      expect(PinVerifyRequestSchema.safeParse({ pin: '1234567' }).success).toBe(false);
      expect(PinVerifyRequestSchema.safeParse({ pin: 'abcd' }).success).toBe(false);
    });
  });

  describe('CreateBranchRequestSchema', () => {
    it('sets smart defaults', () => {
      const result = CreateBranchRequestSchema.safeParse({ name: 'Piassa Branch' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.timezone).toBe('Africa/Addis_Ababa');
      }
    });
  });

  describe('CreateCashierRequestSchema', () => {
    it('validates cashier assignment requires branch UUID', () => {
      const valid = {
        fullName: 'Dawit Abebe',
        phone: '0922334455',
        branchId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      };
      expect(CreateCashierRequestSchema.safeParse(valid).success).toBe(true);

      const invalid = {
        fullName: 'Dawit Abebe',
        phone: '0922334455',
        branchId: 'invalid-uuid',
      };
      expect(CreateCashierRequestSchema.safeParse(invalid).success).toBe(false);
    });
  });
});
