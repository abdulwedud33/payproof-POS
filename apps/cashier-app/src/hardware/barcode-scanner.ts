/**
 * Physical Barcode Scanner Hardware Listener (HID Keyboard Wedge Mode).
 *
 * Real retail USB and Bluetooth 1D/2D barcode scanners emulate a rapid-fire physical
 * keyboard. They transmit characters with an inter-keystroke interval typically < 35ms,
 * terminating with an 'Enter' key ('\r' or '\n').
 *
 * This module intercepts hardware scanner streams globally without requiring the cashier
 * to keep focus on an input box, distinguishing hardware laser/CCD reads from human typing.
 */

export interface BarcodeScannerConfig {
  maxInterKeyDelayMs?: number; // Maximum ms between characters to qualify as hardware scan (default: 35ms)
  minBarcodeLength?: number; // Minimum length of valid barcode (default: 3)
  onProductBarcode?: (barcode: string) => void;
  onPaymentQr?: (qrText: string) => void;
  onScan?: (rawText: string, type: 'product' | 'payment_qr' | 'generic') => void;
}

export type ScanTargetType = 'product' | 'payment_qr' | 'generic';

export class HardwareBarcodeScanner {
  private buffer: string[] = [];
  private lastKeyTime = 0;
  private readonly maxInterKeyDelayMs: number;
  private readonly minBarcodeLength: number;
  private onProductBarcode?: (barcode: string) => void;
  private onPaymentQr?: (qrText: string) => void;
  private onScan?: (rawText: string, type: ScanTargetType) => void;
  private isListening = false;

  constructor(config: BarcodeScannerConfig = {}) {
    this.maxInterKeyDelayMs = config.maxInterKeyDelayMs ?? 35;
    this.minBarcodeLength = config.minBarcodeLength ?? 3;
    this.onProductBarcode = config.onProductBarcode;
    this.onPaymentQr = config.onPaymentQr;
    this.onScan = config.onScan;
  }

  /**
   * Evaluates whether a scanned payload represents a customer payment QR/URL vs a product barcode.
   */
  public static classifyPayload(text: string): ScanTargetType {
    const trimmed = text.trim();
    // Payment receipt links from Telebirr, CBE, or mock providers
    if (
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.includes('telebirr') ||
      trimmed.includes('cbe') ||
      trimmed.includes('receipt') ||
      trimmed.includes('payproof')
    ) {
      return 'payment_qr';
    }

    // Standard 1D/2D retail product barcodes: UPC-A (12), EAN-13 (13), EAN-8 (8), Code 128 / 39
    if (/^[0-9A-Z\-_]{4,32}$/i.test(trimmed)) {
      return 'product';
    }

    return 'generic';
  }

  /**
   * Processes a single hardware keystroke.
   * Can be wired directly to window.addEventListener('keydown') or hardware input event loops.
   */
  public handleKeyEvent(key: string, timestamp: number = Date.now()): boolean {
    // If Enter key is pressed, evaluate buffered machine string
    if (key === 'Enter' || key === '\r' || key === '\n') {
      const fullText = this.buffer.join('').trim();
      this.buffer = [];

      if (fullText.length >= this.minBarcodeLength) {
        const type = HardwareBarcodeScanner.classifyPayload(fullText);
        if (type === 'product' && this.onProductBarcode) {
          this.onProductBarcode(fullText);
        } else if (type === 'payment_qr' && this.onPaymentQr) {
          this.onPaymentQr(fullText);
        }
        if (this.onScan) {
          this.onScan(fullText, type);
        }
        return true; // Handled as hardware scan
      }
      return false;
    }

    // Single printable character
    if (key.length === 1) {
      const timeSinceLastKey = timestamp - this.lastKeyTime;

      // If time between keystrokes exceeds threshold and buffer is not empty,
      // it was human typing -> clear buffer and restart
      if (this.buffer.length > 0 && timeSinceLastKey > this.maxInterKeyDelayMs) {
        this.buffer = [];
      }

      this.lastKeyTime = timestamp;
      this.buffer.push(key);
    }

    return false;
  }

  /**
   * Simulates a hardware barcode scanner burst (for automated tests and cashier manual barcode entry).
   */
  public simulateScan(barcode: string, intervalMs = 10): void {
    let time = Date.now();
    for (const char of barcode) {
      this.handleKeyEvent(char, time);
      time += intervalMs;
    }
    this.handleKeyEvent('Enter', time);
  }

  /**
   * Attaches the scanner listener to the global browser/DOM window if present.
   */
  public attach(): void {
    if (typeof window !== 'undefined' && !this.isListening) {
      window.addEventListener('keydown', this.domKeyHandler);
      this.isListening = true;
    }
  }

  /**
   * Detaches the scanner listener.
   */
  public detach(): void {
    if (typeof window !== 'undefined' && this.isListening) {
      window.removeEventListener('keydown', this.domKeyHandler);
      this.isListening = false;
    }
  }

  private domKeyHandler = (event: KeyboardEvent) => {
    const isHandled = this.handleKeyEvent(event.key);
    if (isHandled) {
      event.preventDefault();
      event.stopPropagation();
    }
  };
}
