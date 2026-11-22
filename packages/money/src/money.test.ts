import { describe, it, expect } from 'vitest';
import {
  toMinor,
  fromBirrDecimalString,
  formatBirr,
  add,
  subtract,
  multiplyQuantity,
  compare,
  MoneyError,
} from './index.js';

describe('packages/money', () => {
  describe('toMinor', () => {
    it('accepts integer BigInt and number', () => {
      expect(toMinor(100n)).toBe(100n);
      expect(toMinor(500)).toBe(500n);
      expect(toMinor('1250')).toBe(1250n);
    });

    it('rejects floating point numbers strictly', () => {
      expect(() => toMinor(12.34)).toThrow(MoneyError);
      expect(() => toMinor(0.1)).toThrow(MoneyError);
      expect(() => toMinor(NaN)).toThrow(MoneyError);
      expect(() => toMinor(Infinity)).toThrow(MoneyError);
    });

    it('rejects malformed string numbers', () => {
      expect(() => toMinor('12.34')).toThrow(MoneyError);
      expect(() => toMinor('abc')).toThrow(MoneyError);
      expect(() => toMinor('')).toThrow(MoneyError);
    });
  });

  describe('fromBirrDecimalString', () => {
    it('converts valid decimal strings to integer santim', () => {
      expect(fromBirrDecimalString('318.00')).toBe(31800n);
      expect(fromBirrDecimalString('42.5')).toBe(4250n);
      expect(fromBirrDecimalString('0.05')).toBe(5n);
      expect(fromBirrDecimalString('100')).toBe(10000n);
      expect(fromBirrDecimalString('-15.20')).toBe(-1520n);
    });

    it('rejects decimal strings with > 2 decimal places', () => {
      expect(() => fromBirrDecimalString('318.001')).toThrow(MoneyError);
    });
  });

  describe('formatBirr', () => {
    it('formats santim correctly with tabular decimals and suffix', () => {
      expect(formatBirr(31800n)).toBe('318.00 Birr');
      expect(formatBirr(5n)).toBe('0.05 Birr');
      expect(formatBirr(0n)).toBe('0.00 Birr');
      expect(formatBirr(-1520n)).toBe('-15.20 Birr');
      expect(formatBirr(123456n, false)).toBe('1234.56');
    });
  });

  describe('add and subtract', () => {
    it('adds and subtracts accurately without floating point loss', () => {
      expect(add(1000n, 250n)).toBe(1250n);
      expect(subtract(1000n, 250n)).toBe(750n);
      expect(subtract(250n, 1000n)).toBe(-750n);
    });
  });

  describe('multiplyQuantity', () => {
    it('calculates weighted totals with correct rounding', () => {
      // 30.00 Birr/kg (3000 santim) * 3.2 kg = 96.00 Birr (9600 santim)
      expect(multiplyQuantity(3000n, 3.2)).toBe(9600n);

      // 42.00 Birr (4200 santim) * 1 = 4200 santim
      expect(multiplyQuantity(4200n, 1)).toBe(4200n);

      // 33.33 Birr (3333 santim) * 1.5 kg = 4999.5 -> rounds to 5000 santim
      expect(multiplyQuantity(3333n, 1.5)).toBe(5000n);
    });

    it('rejects negative unit price or malformed quantity', () => {
      expect(() => multiplyQuantity(-100n, 2)).toThrow(MoneyError);
      expect(() => multiplyQuantity(100n, 'invalid')).toThrow(MoneyError);
    });
  });

  describe('compare', () => {
    it('compares amounts correctly', () => {
      expect(compare(100n, 200n)).toBe(-1);
      expect(compare(200n, 100n)).toBe(1);
      expect(compare(100n, 100n)).toBe(0);
    });
  });
});
