import type { FastifyPluginAsync } from 'fastify';
import { CreateBranchRequestSchema, UpdateBranchRequestSchema } from '@payproof/shared-types';
import { BranchService } from '../services/branch-service.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const branchRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireAuth);

  // GET /v1/branches (owner sees all, cashier sees assigned)
  fastify.get('/', async (request, reply) => {
    const branches = await BranchService.listBranches(request.user!);
    return reply.status(200).send(branches);
  });

  // POST /v1/branches (owner only)
  fastify.post('/', { preHandler: [requireRole('owner')] }, async (request, reply) => {
    const parsed = CreateBranchRequestSchema.parse(request.body);
    const branch = await BranchService.createBranch(request.user!, parsed);
    return reply.status(201).send(branch);
  });

  // PATCH /v1/branches/:id (owner only)
  fastify.patch('/:id', { preHandler: [requireRole('owner')] }, async (request, reply) => {
    const parsed = UpdateBranchRequestSchema.parse(request.body);
    const branchId = (request.params as { id: string }).id;
    const branch = await BranchService.updateBranch(request.user!, branchId, parsed);
    return reply.status(200).send(branch);
  });
};
