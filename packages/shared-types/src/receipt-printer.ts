import { formatEthiopianDate } from './ethiopian-calendar.js';

function formatBirr(minor: number): string {
  return `${(minor / 100).toFixed(2)} ETB`;
}

export interface ReceiptItem {
  name: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
}

export interface ReceiptData {
  storeName: string;
  branchName: string;
  branchAddress?: string;
  branchPhone?: string;
  tinNumber?: string;
  receiptId: string;
  cashierName: string;
  timestamp: string | Date;
  items: ReceiptItem[];
  subtotalMinor: number;
  taxMinor?: number; // e.g. 15% VAT
  totalMinor: number;
  paymentMethod: 'cash' | 'mobile_money';
  cashTenderedMinor?: number;
  cashChangeMinor?: number;
  mobileMoneyDetails?: {
    provider: 'telebirr' | 'cbe';
    accountLast4?: string;
    transactionId: string;
    verified: boolean;
  };
  footerMessage?: string;
  width?: 58 | 80; // 58mm (32 chars) or 80mm (48 chars)
}

/**
 * Standard ESC/POS Control Byte Constants
 */
export const ESC_POS = {
  INIT: [0x1b, 0x40], // Initialize printer
  ALIGN_LEFT: [0x1b, 0x61, 0x00],
  ALIGN_CENTER: [0x1b, 0x61, 0x01],
  ALIGN_RIGHT: [0x1b, 0x61, 0x02],
  BOLD_ON: [0x1b, 0x45, 0x01],
  BOLD_OFF: [0x1b, 0x45, 0x00],
  DOUBLE_HEIGHT_ON: [0x1d, 0x21, 0x01],
  DOUBLE_WIDTH_ON: [0x1d, 0x21, 0x10],
  DOUBLE_SIZE_ON: [0x1d, 0x21, 0x11],
  NORMAL_SIZE: [0x1d, 0x21, 0x00],
  FEED_LINES: (n: number) => [0x1b, 0x64, n],
  CUT_PAPER: [0x1d, 0x56, 0x00], // Full cut
  KICK_DRAWER: [0x1b, 0x70, 0x00, 0x19, 0xfa], // Pulse cash drawer 1 (pin 2)
} as const;

/**
 * Pad a line into two justified columns (left text and right text).
 */
export function formatTwoColumns(left: string, right: string, width: number): string {
  const availableSpace = width - right.length;
  if (left.length > availableSpace) {
    left = left.slice(0, Math.max(0, availableSpace - 1)) + ' ';
  }
  return left.padEnd(availableSpace, ' ') + right;
}

/**
 * Generates an ASCII formatted receipt text preview.
 */
export function generateReceiptText(data: ReceiptData): string {
  const width = data.width || 58;
  const colWidth = width === 80 ? 48 : 32;
  const divider = '='.repeat(colWidth);
  const thinDivider = '-'.repeat(colWidth);

  const lines: string[] = [];

  // Header
  lines.push(data.storeName.toUpperCase().padStart((colWidth + data.storeName.length) / 2));
  lines.push(data.branchName.padStart((colWidth + data.branchName.length) / 2));
  if (data.branchAddress) {
    lines.push(data.branchAddress.padStart((colWidth + data.branchAddress.length) / 2));
  }
  if (data.branchPhone) {
    lines.push(
      `Tel: ${data.branchPhone}`.padStart((colWidth + `Tel: ${data.branchPhone}`.length) / 2)
    );
  }
  if (data.tinNumber) {
    lines.push(`TIN: ${data.tinNumber}`.padStart((colWidth + `TIN: ${data.tinNumber}`.length) / 2));
  }

  lines.push(divider);

  // Meta
  lines.push(
    formatTwoColumns(
      `Rcpt: #${data.receiptId.slice(0, 8)}`,
      `Cashier: ${data.cashierName}`,
      colWidth
    )
  );
  const gregDate = new Date(data.timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
  const ethDate = formatEthiopianDate(data.timestamp, 'am', { short: true });
  lines.push(formatTwoColumns(gregDate, ethDate, colWidth));

  lines.push(thinDivider);

  // Line items
  lines.push(formatTwoColumns('ITEM (QTY x PRICE)', 'TOTAL', colWidth));
  lines.push(thinDivider);

  for (const item of data.items) {
    const itemTotalStr = formatBirr(item.totalMinor);
    if (item.name.length + itemTotalStr.length + 1 <= colWidth) {
      lines.push(formatTwoColumns(item.name, itemTotalStr, colWidth));
      const qtyPriceStr = `  ${item.quantity} x ${formatBirr(item.unitPriceMinor)}`;
      lines.push(qtyPriceStr);
    } else {
      lines.push(item.name);
      const qtyPriceStr = `  ${item.quantity} x ${formatBirr(item.unitPriceMinor)}`;
      lines.push(formatTwoColumns(qtyPriceStr, itemTotalStr, colWidth));
    }
  }

  lines.push(thinDivider);

  // Totals
  lines.push(formatTwoColumns('SUBTOTAL:', formatBirr(data.subtotalMinor), colWidth));
  if (data.taxMinor !== undefined && data.taxMinor > 0) {
    lines.push(formatTwoColumns('VAT (15%):', formatBirr(data.taxMinor), colWidth));
  }
  lines.push(divider);
  lines.push(formatTwoColumns('TOTAL DUE:', formatBirr(data.totalMinor), colWidth));
  lines.push(divider);

  // Payment Breakdown
  if (data.paymentMethod === 'cash') {
    lines.push(formatTwoColumns('PAYMENT MODE:', 'CASH', colWidth));
    if (data.cashTenderedMinor !== undefined) {
      lines.push(formatTwoColumns('Cash Tendered:', formatBirr(data.cashTenderedMinor), colWidth));
    }
    if (data.cashChangeMinor !== undefined) {
      lines.push(formatTwoColumns('Change Returned:', formatBirr(data.cashChangeMinor), colWidth));
    }
  } else {
    const details = data.mobileMoneyDetails;
    const providerName = details?.provider ? details.provider.toUpperCase() : 'MOBILE MONEY';
    lines.push(formatTwoColumns('PAYMENT MODE:', providerName, colWidth));
    if (details?.transactionId) {
      lines.push(formatTwoColumns('Txn ID:', details.transactionId, colWidth));
    }
    if (details?.accountLast4) {
      lines.push(formatTwoColumns('Merchant Ref:', `***${details.accountLast4}`, colWidth));
    }
    lines.push(
      formatTwoColumns(
        'VERIFICATION:',
        details?.verified ? 'VERIFIED [OK]' : 'UNVERIFIED',
        colWidth
      )
    );
  }

  lines.push(divider);

  // Footer
  const footer = data.footerMessage || 'Thank you for shopping with us! / እናመሰግናለን!';
  lines.push(footer.padStart((colWidth + footer.length) / 2));
  lines.push('Powered by PayProof POS'.padStart((colWidth + 'Powered by PayProof POS'.length) / 2));

  return lines.join('\n');
}

/**
 * Builds raw ESC/POS binary command buffer ready for direct transmission to thermal printers.
 */
export function generateEscPosBuffer(
  data: ReceiptData,
  options: { kickDrawer?: boolean; cutPaper?: boolean } = {}
): Uint8Array {
  const bytes: number[] = [];

  // Helper to push text in ASCII / ISO-8859-1
  const pushText = (text: string) => {
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      bytes.push(code <= 0xff ? code : 0x3f); // '?' for unencodable chars in standard 8-bit codepages
    }
  };

  // 1. Kick Cash Drawer if requested (standard POS pulse)
  if (options.kickDrawer !== false && data.paymentMethod === 'cash') {
    bytes.push(...ESC_POS.KICK_DRAWER);
  }

  // 2. Initialize printer
  bytes.push(...ESC_POS.INIT);

  // 3. Header - Double size & centered
  bytes.push(...ESC_POS.ALIGN_CENTER);
  bytes.push(...ESC_POS.BOLD_ON);
  bytes.push(...ESC_POS.DOUBLE_SIZE_ON);
  pushText(data.storeName + '\n');
  bytes.push(...ESC_POS.NORMAL_SIZE);
  bytes.push(...ESC_POS.BOLD_OFF);

  pushText(data.branchName + '\n');
  if (data.branchAddress) pushText(data.branchAddress + '\n');
  if (data.branchPhone) pushText(`Tel: ${data.branchPhone}\n`);
  if (data.tinNumber) pushText(`TIN: ${data.tinNumber}\n`);

  // 4. Receipt Body
  bytes.push(...ESC_POS.ALIGN_LEFT);
  const textBody = generateReceiptText(data);
  pushText(textBody + '\n');

  // 5. Feed lines and Cut
  bytes.push(...ESC_POS.FEED_LINES(3));
  if (options.cutPaper !== false) {
    bytes.push(...ESC_POS.CUT_PAPER);
  }

  return new Uint8Array(bytes);
}
