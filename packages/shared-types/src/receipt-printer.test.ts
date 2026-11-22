import { describe, it, expect } from 'vitest';
import {
  generateReceiptText,
  generateEscPosBuffer,
  formatTwoColumns,
  ESC_POS,
  type ReceiptData,
} from './receipt-printer.js';

describe('Thermal Receipt Printer Engine', () => {
  const sampleReceipt: ReceiptData = {
    storeName: 'Fresh Corner Supermarket',
    branchName: 'Bole Medhanialem Branch',
    branchAddress: 'Bole Road, Mall GF #102',
    branchPhone: '+251 91 122 3344',
    tinNumber: '0012345678',
    receiptId: 'sale-987654321-uuid',
    cashierName: 'Tigist Haile',
    timestamp: '2026-11-22T14:30:00Z',
    items: [
      { name: 'Sergegna Teff 5kg', quantity: 1, unitPriceMinor: 65000, totalMinor: 65000 },
      { name: 'Ambo Mineral Water 500ml', quantity: 3, unitPriceMinor: 4000, totalMinor: 12000 },
      { name: 'Anchor Butter 250g', quantity: 2, unitPriceMinor: 28000, totalMinor: 56000 },
    ],
    subtotalMinor: 133000,
    taxMinor: 19950,
    totalMinor: 152950,
    paymentMethod: 'mobile_money',
    mobileMoneyDetails: {
      provider: 'telebirr',
      accountLast4: '4821',
      transactionId: 'TB9988776655',
      verified: true,
    },
    width: 58,
  };

  it('formats two columns justified to width', () => {
    const line = formatTwoColumns('Subtotal:', '150.00 ETB', 32);
    expect(line.length).toBe(32);
    expect(line.startsWith('Subtotal:')).toBe(true);
    expect(line.endsWith('150.00 ETB')).toBe(true);
  });

  it('generates complete 58mm ASCII receipt with store, tax, items, and verification status', () => {
    const text = generateReceiptText(sampleReceipt);

    expect(text).toContain('FRESH CORNER SUPERMARKET');
    expect(text).toContain('Bole Medhanialem Branch');
    expect(text).toContain('TIN: 0012345678');
    expect(text).toContain('Cashier: Tigist Haile');
    expect(text).toContain('Sergegna Teff 5kg');
    expect(text).toContain('Ambo Mineral Water 500ml');
    expect(text).toContain('SUBTOTAL:');
    expect(text).toContain('TOTAL DUE:');
    expect(text).toContain('TELEBIRR');
    expect(text).toContain('Txn ID:');
    expect(text).toContain('TB9988776655');
    expect(text).toContain('VERIFIED [OK]');
    expect(text).toContain('Powered by PayProof POS');
  });

  it('handles cash receipts with cash tendered and change return', () => {
    const cashReceipt: ReceiptData = {
      ...sampleReceipt,
      paymentMethod: 'cash',
      cashTenderedMinor: 200000, // 2000 Birr
      cashChangeMinor: 47050, // 470.50 Birr
      mobileMoneyDetails: undefined,
    };

    const text = generateReceiptText(cashReceipt);
    expect(text).toContain('PAYMENT MODE:');
    expect(text).toContain('CASH');
    expect(text).toContain('Cash Tendered:');
    expect(text).toContain('Change Returned:');
  });

  it('generates binary ESC/POS buffer with paper cut and drawer commands', () => {
    const buffer = generateEscPosBuffer(sampleReceipt, { cutPaper: true });
    expect(buffer).toBeInstanceOf(Uint8Array);
    expect(buffer.length).toBeGreaterThan(100);

    // Verify ESC @ (init: 0x1B, 0x40) is present
    const hasInit = buffer[0] === 0x1b && buffer[1] === 0x40;
    expect(hasInit).toBe(true);

    // Verify GS V 0 (cut paper: 0x1D, 0x56, 0x00) is at the tail
    const len = buffer.length;
    expect(buffer[len - 3]).toBe(ESC_POS.CUT_PAPER[0]);
    expect(buffer[len - 2]).toBe(ESC_POS.CUT_PAPER[1]);
    expect(buffer[len - 1]).toBe(ESC_POS.CUT_PAPER[2]);
  });

  it('supports 80mm wide receipts (48 columns)', () => {
    const wideReceipt: ReceiptData = { ...sampleReceipt, width: 80 };
    const text = generateReceiptText(wideReceipt);
    const lines = text.split('\n');
    expect(lines.length).toBeGreaterThan(15);
  });
});
