import { describe, it, expect, vi } from 'vitest';
import { HardwareBarcodeScanner } from '../src/hardware/barcode-scanner.js';

describe('Hardware Barcode Scanner Listener', () => {
  it('correctly classifies product barcodes vs payment receipt URLs', () => {
    // EAN-13
    expect(HardwareBarcodeScanner.classifyPayload('6901234567892')).toBe('product');
    // UPC-A
    expect(HardwareBarcodeScanner.classifyPayload('012345678905')).toBe('product');
    // Internal supermarket SKU barcode
    expect(HardwareBarcodeScanner.classifyPayload('PROD-TEFF-01')).toBe('product');

    // Telebirr receipt URL
    expect(
      HardwareBarcodeScanner.classifyPayload(
        'https://transactioninfo.ethiotelecom.et/receipt/TB12345678'
      )
    ).toBe('payment_qr');

    // CBE receipt link
    expect(
      HardwareBarcodeScanner.classifyPayload('https://apps.cbe.com.et:8443/receipt?txn=CBE998877')
    ).toBe('payment_qr');
  });

  it('captures rapid hardware laser scanner keystrokes terminating in Enter', () => {
    const onProduct = vi.fn();
    const onScan = vi.fn();

    const scanner = new HardwareBarcodeScanner({
      maxInterKeyDelayMs: 30,
      onProductBarcode: onProduct,
      onScan: onScan,
    });

    // Simulate hardware burst at 10ms intervals
    scanner.simulateScan('6901234567892', 10);

    expect(onProduct).toHaveBeenCalledWith('6901234567892');
    expect(onScan).toHaveBeenCalledWith('6901234567892', 'product');
  });

  it('captures payment receipt QR scans and triggers onPaymentQr callback', () => {
    const onPaymentQr = vi.fn();
    const scanner = new HardwareBarcodeScanner({
      maxInterKeyDelayMs: 30,
      onPaymentQr: onPaymentQr,
    });

    const qrLink = 'https://transactioninfo.ethiotelecom.et/receipt/TB99881122';
    scanner.simulateScan(qrLink, 15);

    expect(onPaymentQr).toHaveBeenCalledWith(qrLink);
  });

  it('ignores slow human typing that exceeds inter-key threshold', () => {
    const onProduct = vi.fn();
    const scanner = new HardwareBarcodeScanner({
      maxInterKeyDelayMs: 25,
      onProductBarcode: onProduct,
    });

    // Keystroke 1 at t=0
    scanner.handleKeyEvent('6', 1000);
    // Keystroke 2 at t=100ms (human slow speed > 25ms threshold)
    scanner.handleKeyEvent('9', 1100);
    // Keystroke 3 at t=250ms
    scanner.handleKeyEvent('0', 1350);
    scanner.handleKeyEvent('Enter', 1400);

    // Buffer reset between keys, final buffer only had '0' which is < minBarcodeLength (3)
    expect(onProduct).not.toHaveBeenCalled();
  });
});
