import type { FastifyPluginAsync } from 'fastify';
import {
  CreateProductRequestSchema,
  UpdateProductRequestSchema,
} from '@payproof/shared-types';
import { ProductService } from '../services/product-service.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const productRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireAuth);

  // GET /v1/products (owner, manager, cashier)
  fastify.get('/', async (request, reply) => {
    const query = request.query as {
      search?: string;
      active?: string;
      page?: string;
      limit?: string;
    };

    const activeParam =
      query.active === 'true' ? true : query.active === 'false' ? false : undefined;
    const pageParam = query.page ? Number.parseInt(query.page, 10) : 1;
    const limitParam = query.limit ? Number.parseInt(query.limit, 10) : 50;

    const result = await ProductService.listProducts(request.user!, {
      search: query.search,
      active: activeParam,
      page: pageParam,
      limit: limitParam,
    });

    return reply.status(200).send(result);
  });

  // GET /v1/products/:id (owner, manager, cashier)
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const product = await ProductService.getProductById(request.user!, id);
    return reply.status(200).send(product);
  });

  // POST /v1/products (owner only)
  fastify.post('/', { preHandler: [requireRole('owner')] }, async (request, reply) => {
    const parsed = CreateProductRequestSchema.parse(request.body);
    const product = await ProductService.createProduct(request.user!, parsed);
    return reply.status(201).send(product);
  });

  // PATCH /v1/products/:id (owner only)
  fastify.patch('/:id', { preHandler: [requireRole('owner')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const parsed = UpdateProductRequestSchema.parse(request.body);
    const product = await ProductService.updateProduct(request.user!, id, parsed);
    return reply.status(200).send(product);
  });

  // DELETE /v1/products/:id (owner only)
  fastify.delete('/:id', { preHandler: [requireRole('owner')] }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const result = await ProductService.deleteProduct(request.user!, id);
    return reply.status(200).send(result);
  });

  // POST /v1/products/import (owner only - CSV content)
  fastify.post('/import', { preHandler: [requireRole('owner')] }, async (request, reply) => {
    const body = request.body as { csv?: string };
    const csvContent = typeof body?.csv === 'string' ? body.csv : (request.body as string);
    const result = await ProductService.importCsv(request.user!, csvContent);
    return reply.status(200).send(result);
  });
};
