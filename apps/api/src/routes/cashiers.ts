import type { FastifyPluginAsync } from 'fastify';
import {
  CreateCashierRequestSchema,
  UpdateCashierRequestSchema,
} from '@payproof/shared-types';
import { CashierService } from '../services/cashier-service.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const cashierRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireAuth);
  fastify.addHook('preHandler', requireRole('owner'));

  // GET /v1/cashiers (owner only)
  fastify.get('/', async (request, reply) => {
    const cashiers = await CashierService.listCashiers(request.user!);
    return reply.status(200).send(cashiers);
  });

  // POST /v1/cashiers (owner only)
  fastify.post('/', async (request, reply) => {
    const parsed = CreateCashierRequestSchema.parse(request.body);
    const result = await CashierService.createCashier(request.user!, parsed);
    return reply.status(201).send(result);
  });

  // PATCH /v1/cashiers/:id (owner only)
  fastify.patch('/:id', async (request, reply) => {
    const parsed = UpdateCashierRequestSchema.parse(request.body);
    const cashierId = (request.params as { id: string }).id;
    const cashier = await CashierService.updateCashier(request.user!, cashierId, parsed);
    return reply.status(200).send(cashier);
  });

  // DELETE /v1/cashiers/:id (owner only)
  fastify.delete('/:id', async (request, reply) => {
    const cashierId = (request.params as { id: string }).id;
    await CashierService.deleteCashier(request.user!, cashierId);
    return reply.status(200).send({ success: true });
  });
};
