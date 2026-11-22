import type { FastifyPluginAsync } from 'fastify';
import {
  CreateSaleRequestSchema,
  VoidSaleRequestSchema,
  VerifySaleRequestSchema,
  ManualOverrideRequestSchema,
} from '@payproof/shared-types';
import { SaleService } from '../services/sale-service.js';
import { VerificationService } from '../services/verification-service.js';
import { requireAuth } from '../middleware/auth.js';

export const saleRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireAuth);

  // POST /v1/sales (cashier or owner)
  fastify.post('/', async (request, reply) => {
    const parsed = CreateSaleRequestSchema.parse(request.body);
    const sale = await SaleService.createSale(request.user!, parsed);
    return reply.status(201).send(sale);
  });

  // GET /v1/sales (owner all, cashier scoped)
  fastify.get('/', async (request, reply) => {
    const query = request.query as {
      branch_id?: string;
      cashier_id?: string;
      status?: string;
      from?: string;
      to?: string;
      page?: string;
      limit?: string;
    };

    const pageParam = query.page ? Number.parseInt(query.page, 10) : 1;
    const limitParam = query.limit ? Number.parseInt(query.limit, 10) : 50;

    const result = await SaleService.listSales(request.user!, {
      branch_id: query.branch_id,
      cashier_id: query.cashier_id,
      status: query.status,
      from: query.from,
      to: query.to,
      page: pageParam,
      limit: limitParam,
    });

    return reply.status(200).send(result);
  });

  // GET /v1/sales/:id
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const sale = await SaleService.getSaleById(request.user!, id);
    return reply.status(200).send(sale);
  });

  // POST /v1/sales/:id/void
  fastify.post('/:id/void', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = VoidSaleRequestSchema.parse(request.body);
    const sale = await SaleService.voidSale(request.user!, id, parsed);
    return reply.status(200).send(sale);
  });

  // POST /v1/sales/:id/verify-mobile-money
  fastify.post('/:id/verify-mobile-money', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = VerifySaleRequestSchema.parse(request.body);
    const user = request.user!;

    const decision = await VerificationService.verifyMobileMoney(
      user.orgId,
      user.id,
      user.branchIds,
      id,
      parsed
    );
    return reply.status(200).send(decision);
  });

  // POST /v1/sales/:id/override
  fastify.post('/:id/override', async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = ManualOverrideRequestSchema.parse(request.body);
    const user = request.user!;

    const result = await VerificationService.applyManualOverride(
      user.orgId,
      user.id,
      user.branchIds,
      id,
      parsed
    );
    return reply.status(200).send(result);
  });
};
