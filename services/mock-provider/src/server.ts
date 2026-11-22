import Fastify from 'fastify';
import cors from '@fastify/cors';
import { generateReceiptHtml, MockReceiptData } from './scenarios.js';

export function buildMockProviderApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : true,
  });

  app.register(cors as any, { origin: true });

  app.get('/health', async () => {
    return { status: 'healthy', service: 'mock-provider', timestamp: new Date().toISOString() };
  });

  const handleReceipt = async (request: any, reply: any, provider: 'telebirr' | 'cbe') => {
    const { txn_id } = request.params as { txn_id: string };
    const { scenario } = (request.query || {}) as { scenario?: string };

    const scenarioKey = (scenario || txn_id).toUpperCase();

    if (scenarioKey.includes('REDIRECT_INTERNAL')) {
      return reply.redirect('http://169.254.169.254/latest/meta-data', 302);
    }

    if (scenarioKey.includes('REDIRECT_EXTERNAL')) {
      return reply.redirect('https://evil-phishing.com/receipt', 302);
    }

    if (scenarioKey.includes('REDIRECT_OK')) {
      return reply.redirect(`/receipt/${provider}/TXN_SUCCESS`, 302);
    }

    if (scenarioKey.includes('SLOW')) {
      await new Promise((resolve) => {
        const timer = setTimeout(resolve, 8000);
        request.raw.on('close', () => {
          clearTimeout(timer);
          resolve(null);
        });
      });
    }

    if (scenarioKey.includes('HUGE')) {
      // Stream ~600 KB (exceeds 500 KB limit)
      const chunk = '<!-- SAFE-FETCH-TEST-PADDING-BYTES -->\n'.repeat(16000);
      reply.type('text/html');
      return reply.send(chunk);
    }

    if (scenarioKey.includes('MALFORMED')) {
      reply.type('text/html');
      return reply.send(
        '<!DOCTYPE html><html><body><h1>Service Notice</h1><p>System undergoing maintenance</p></body></html>'
      );
    }

    let status: 'SUCCESS' | 'PENDING' | 'FAILED' = 'SUCCESS';
    let amount = '150.00';
    let receiverName = 'Addis Mart - Bole Branch';
    let receiverAccount = '1000123456789';

    if (scenarioKey.includes('PENDING')) {
      status = 'PENDING';
    } else if (scenarioKey.includes('FAILED')) {
      status = 'FAILED';
    } else if (scenarioKey.includes('WRONG_RECEIVER')) {
      receiverName = 'Unknown Electronics PLC';
      receiverAccount = '1000999999999';
    } else if (scenarioKey.includes('SHORT')) {
      amount = '50.00';
    }

    const receiptData: MockReceiptData = {
      provider,
      transactionId: txn_id,
      amount,
      currency: 'ETB',
      paymentDate: new Date().toISOString(),
      status,
      receiverName,
      receiverAccount,
      payerName: 'Abebe Bikila',
      payerAccount: '0911****22',
    };

    const html = generateReceiptHtml(receiptData);
    reply.type('text/html');
    return reply.send(html);
  };

  app.get('/receipt/telebirr/:txn_id', (req, rep) => handleReceipt(req, rep, 'telebirr'));
  app.get('/receipt/cbe/:txn_id', (req, rep) => handleReceipt(req, rep, 'cbe'));

  return app;
}

if (
  process.env.NODE_ENV !== 'test' &&
  !process.env.VITEST &&
  (process.argv[1]?.endsWith('server.ts') || process.argv[1]?.endsWith('server.js'))
) {
  const isDirectRun = !process.env.VITEST && !process.env.TEST;
  if (isDirectRun) {
    const server = buildMockProviderApp();
    const port = Number(process.env.PORT || 8080);
    const host = process.env.HOST || '0.0.0.0';

    server.listen({ port, host }, (err, address) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log(`Mock Provider Server listening at ${address}`);
    });
  }
}
