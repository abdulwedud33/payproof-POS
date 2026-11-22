import Fastify from 'fastify';
import cors from '@fastify/cors';
import compress from '@fastify/compress';
import jwt from '@fastify/jwt';
import cookie from '@fastify/cookie';
import crypto from 'crypto';
import { config } from './config.js';
import { globalErrorHandler } from './plugins/error-handler.js';
import { authRoutes } from './routes/auth.js';
import { branchRoutes } from './routes/branches.js';
import { cashierRoutes } from './routes/cashiers.js';
import { productRoutes } from './routes/products.js';
import { saleRoutes } from './routes/sales.js';
import { syncRoutes } from './routes/sync.js';
import { paymentAccountRoutes } from './routes/payment-accounts.js';
import { reportRoutes } from './routes/reports.js';
import { alertRoutes } from './routes/alerts.js';

export function buildApp() {
  const isTest = config.NODE_ENV === 'test' || Boolean(process.env.VITEST);

  const app = Fastify({
    logger: isTest
      ? false
      : {
          level: 'info',
          serializers: {
            req(req) {
              return {
                id: req.id,
                method: req.method,
                url: req.url,
                ip: req.ip,
              };
            },
          },
        },
    requestIdHeader: 'x-request-id',
    genReqId: (req) => (req.headers['x-request-id'] as string) || crypto.randomUUID(),
  });

  // Attach security headers and x-request-id header to every response
  app.addHook('onSend', async (request, reply) => {
    reply.header('x-request-id', request.id);
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  });

  // Security Headers & CORS
  app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Brotli & Gzip compression for all responses > 1 KB (TRD speed rule)
  app.register(compress, {
    threshold: 1024,
    encodings: ['br', 'gzip', 'deflate'],
  });

  // Cookies & JWT
  app.register(cookie);
  app.register(jwt, {
    secret: config.JWT_ACCESS_SECRET,
  });

  // Global Error Handler
  app.setErrorHandler(globalErrorHandler);

  // Health check endpoint (exempt from auth)
  app.get('/health', async () => {
    return { status: 'healthy', timestamp: new Date().toISOString() };
  });

  // Route registration
  app.register(authRoutes, { prefix: '/v1/auth' });
  app.register(branchRoutes, { prefix: '/v1/branches' });
  app.register(cashierRoutes, { prefix: '/v1/cashiers' });
  app.register(productRoutes, { prefix: '/v1/products' });
  app.register(saleRoutes, { prefix: '/v1/sales' });
  app.register(syncRoutes, { prefix: '/v1/sync' });
  app.register(paymentAccountRoutes, { prefix: '/v1/payment-accounts' });
  app.register(reportRoutes, { prefix: '/v1/reports' });
  app.register(alertRoutes, { prefix: '/v1/alerts' });

  return app;
}
