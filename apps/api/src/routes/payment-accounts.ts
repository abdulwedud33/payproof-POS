import { FastifyPluginAsync } from 'fastify';
import {
  CreatePaymentAccountSchema,
  DeactivatePaymentAccountSchema,
} from '@payproof/shared-types';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { PaymentAccountService } from '../services/payment-account-service.js';

export const paymentAccountRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  // 1. List payment accounts
  app.get('/', { preHandler: [requireRole('owner', 'manager', 'cashier')] }, async (request, _reply) => {
    const user = request.user!;
    const { branchId } = request.query as { branchId?: string };

    const accounts = await PaymentAccountService.listPaymentAccounts(
      user.orgId,
      user.role,
      user.branchIds,
      branchId
    );
    return accounts;
  });

  // 2. Create payment account (Owner only, requires owner PIN)
  app.post('/', { preHandler: [requireRole('owner')] }, async (request, reply) => {
    const user = request.user!;
    const parsed = CreatePaymentAccountSchema.parse(request.body);

    const created = await PaymentAccountService.createPaymentAccount(
      user.orgId,
      user.id,
      parsed
    );
    reply.status(201);
    return created;
  });

  // 3. Deactivate payment account (Owner only, requires owner PIN)
  app.patch('/:id/deactivate', { preHandler: [requireRole('owner')] }, async (request, _reply) => {
    const user = request.user!;
    const { id } = request.params as { id: string };
    const parsed = DeactivatePaymentAccountSchema.parse(request.body);

    const result = await PaymentAccountService.deactivatePaymentAccount(
      user.orgId,
      id,
      parsed.ownerPin
    );
    return result;
  });
};
