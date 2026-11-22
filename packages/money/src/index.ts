/**
 * Money utilities for PayProof POS.
 * NON-NEGOTIABLE RULE: Money is always an integer in santim (1 Birr = 100 santim).
 * Floats are strictly prohibited.
 */

export class MoneyError extends Error {
  constructor(message: string) {
    super(`[MoneyError] ${message}`);
    this.name = 'MoneyError';
  }
}

/**
 * Validates and converts any minor amount representation to BigInt.
 * Rejects floats, non-integers, and NaN.
 */
export function toMinor(value: number | string | bigint): bigint {
  if (typeof value === 'bigint') {
    return value;
  }

  if (typeof value === 'number') {
    if (!Number.isFinite(value) || !Number.isInteger(value)) {
      throw new MoneyError(`Floating point or non-integer values are strictly forbidden: ${value}`);
    }
    return BigInt(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) {
      throw new MoneyError(`Invalid integer santim string: "${value}"`);
    }
    return BigInt(trimmed);
  }

  throw new MoneyError(`Unsupported money type: ${typeof value}`);
}

/**
 * Parses a decimal Birr string (e.g., "318.00" or "42.5") into integer santim without float imprecision.
 */
export function fromBirrDecimalString(birrStr: string): bigint {
  const trimmed = birrStr.trim();
  const match = /^(-)?(\d+)(?:\.(\d+))?$/.exec(trimmed);
  if (!match) {
    throw new MoneyError(`Invalid Birr decimal format: "${birrStr}"`);
  }

  const isNegative = match[1] === '-';
  const wholePart = match[2]!;
  const fracPart = match[3] ?? '';

  if (fracPart.length > 2) {
    throw new MoneyError(`Birr precision cannot exceed 2 decimal places (santim): "${birrStr}"`);
  }

  const paddedFrac = fracPart.padEnd(2, '0');
  const totalSantim = BigInt(wholePart) * 100n + BigInt(paddedFrac);
  return isNegative ? -totalSantim : totalSantim;
}

/**
 * Formats integer santim into standard human-readable display string: "318.00 Birr".
 */
export function formatBirr(
  santim: bigint | number | string,
  includeSuffix: boolean = true
): string {
  const minor = toMinor(santim);
  const isNegative = minor < 0n;
  const absMinor = isNegative ? -minor : minor;

  const whole = absMinor / 100n;
  const frac = absMinor % 100n;
  const fracStr = frac.toString().padStart(2, '0');

  const sign = isNegative ? '-' : '';
  const formatted = `${sign}${whole.toString()}.${fracStr}`;
  return includeSuffix ? `${formatted} Birr` : formatted;
}

export const formatSantimToBirr = formatBirr;

export function add(a: bigint | number, b: bigint | number): bigint {
  return toMinor(a) + toMinor(b);
}

export function subtract(a: bigint | number, b: bigint | number): bigint {
  return toMinor(a) - toMinor(b);
}

/**
 * Multiplies an integer santim amount by a numeric quantity (e.g. 3.2 kg).
 * Quantity must be a valid non-negative number or string. Uses round-half-up.
 */
export function multiplyQuantity(
  unitPriceMinor: bigint | number,
  quantity: number | string
): bigint {
  const price = toMinor(unitPriceMinor);
  if (price < 0n) {
    throw new MoneyError(`Unit price cannot be negative: ${price}`);
  }

  // Parse quantity scaled to 3 decimal places (numeric(12,3) from schema)
  const qtyStr = typeof quantity === 'number' ? quantity.toFixed(3) : quantity.trim();
  const match = /^(\d+)(?:\.(\d+))?$/.exec(qtyStr);
  if (!match) {
    throw new MoneyError(`Invalid quantity format: "${quantity}"`);
  }

  const whole = match[1]!;
  const frac = (match[2] ?? '').slice(0, 3).padEnd(3, '0');
  const qtyScaled = BigInt(whole) * 1000n + BigInt(frac);

  // price (in santim) * qtyScaled (in 1/1000 units) / 1000 with round-half-up
  const product = price * qtyScaled;
  const half = 500n;
  const rounded = (product + half) / 1000n;
  return rounded;
}

export function compare(a: bigint | number, b: bigint | number): -1 | 0 | 1 {
  const ma = toMinor(a);
  const mb = toMinor(b);
  if (ma < mb) return -1;
  if (ma > mb) return 1;
  return 0;
}
