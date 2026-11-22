import type { FastifyPluginAsync } from 'fastify';
import { SyncService } from '../services/sync-service.js';
import { requireAuth } from '../middleware/auth.js';

export const syncRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireAuth);

  // GET /v1/sync/catalog?since=<iso_timestamp>
  fastify.get('/catalog', async (request, reply) => {
    const query = request.query as { since?: string };
    const syncData = await SyncService.getCatalogSync(request.user!, query.since);
    return reply.status(200).send(syncData);
  });
};
