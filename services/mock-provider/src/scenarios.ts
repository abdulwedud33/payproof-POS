export interface MockReceiptData {
  provider: 'telebirr' | 'cbe' | 'mock';
  transactionId: string;
  amount: string; // e.g. "150.00"
  currency: 'ETB';
  paymentDate: string; // ISO string
  status: 'SUCCESS' | 'PENDING' | 'FAILED';
  receiverName: string;
  receiverAccount: string;
  payerName: string;
  payerAccount: string;
}

export function generateReceiptHtml(data: MockReceiptData): string {
  const isCbe = data.provider === 'cbe';
  const brandName = isCbe ? 'Commercial Bank of Ethiopia (CBE)' : 'Ethio Telecom Telebirr';
  const primaryColor = isCbe ? '#70193d' : '#0072bc';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${brandName} - Payment Receipt</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f4f6f8; margin: 0; padding: 20px; color: #1f2937; }
    .receipt-card { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; }
    .header { background: ${primaryColor}; color: #ffffff; padding: 24px; text-align: center; }
    .header h1 { margin: 0 0 8px 0; font-size: 20px; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 9999px; font-size: 13px; font-weight: 600; text-transform: uppercase; background: ${data.status === 'SUCCESS' ? '#10b981' : data.status === 'PENDING' ? '#f59e0b' : '#ef4444'}; color: #ffffff; }
    .body { padding: 24px; }
    .amount-block { text-align: center; margin-bottom: 24px; padding-bottom: 24px; border-bottom: 1px dashed #e5e7eb; }
    .amount { font-size: 32px; font-weight: 700; color: #111827; }
    .currency { font-size: 18px; font-weight: 500; color: #6b7280; margin-left: 4px; }
    .detail-row { display: flex; justify-content: space-between; padding: 10px 0; font-size: 14px; border-bottom: 1px solid #f3f4f6; }
    .detail-label { color: #6b7280; }
    .detail-value { font-weight: 600; text-align: right; }
    .footer { text-align: center; padding: 16px; font-size: 12px; color: #9ca3af; background: #fafafa; border-top: 1px solid #f3f4f6; }
  </style>
</head>
<body>
  <div class="receipt-card">
    <div class="header">
      <h1>${brandName}</h1>
      <span class="badge" id="status-badge">${data.status}</span>
    </div>
    <div class="body">
      <div class="amount-block">
        <span class="amount" id="receipt-amount">${data.amount}</span>
        <span class="currency" id="receipt-currency">${data.currency}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Transaction ID</span>
        <span class="detail-value" id="receipt-txnid">${data.transactionId}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Payment Date</span>
        <span class="detail-value" id="receipt-date">${data.paymentDate}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Receiver Name</span>
        <span class="detail-value" id="receipt-receiver-name">${data.receiverName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Receiver Account</span>
        <span class="detail-value" id="receipt-receiver-account">${data.receiverAccount}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Payer Name</span>
        <span class="detail-value" id="receipt-payer-name">${data.payerName}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Payer Account</span>
        <span class="detail-value" id="receipt-payer-account">${data.payerAccount}</span>
      </div>
    </div>
    <div class="footer">
      Official Electronic Receipt · Verified by ${brandName}
    </div>
  </div>
</body>
</html>`;
}
