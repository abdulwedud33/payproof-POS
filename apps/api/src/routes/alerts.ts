import { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { AlertService } from '../services/alert-service.js';
import { ResolveAlertSchema } from '@payproof/shared-types';

export const alertRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  // 1. GET /v1/alerts (Owner, Manager, Cashier scoped)
  app.get(
    '/',
    { preHandler: [requireRole('owner', 'manager', 'cashier')] },
    async (request, reply) => {
      const user = request.user!;
      const query = request.query as {
        branch_id?: string;
        kind?: any;
        severity?: any;
        resolved?: string;
      };

      let branchId = query.branch_id;
      if (user.role === 'cashier') {
        branchId = user.branchIds[0];
      }

      const resolvedFilter = query.resolved !== undefined ? query.resolved === 'true' : undefined;

      const alerts = await AlertService.listAlerts(user.orgId, {
        branchId,
        kind: query.kind,
        severity: query.severity,
        resolved: resolvedFilter,
      });

      return reply.status(200).send(alerts);
    }
  );

  // 2. PATCH /v1/alerts/:id/resolve (Owner & Manager)
  app.patch(
    '/:id/resolve',
    { preHandler: [requireRole('owner', 'manager')] },
    async (request, reply) => {
      const user = request.user!;
      const { id } = request.params as { id: string };
      const parsed = ResolveAlertSchema.parse(request.body);

      const resolved = await AlertService.resolveAlert(user.orgId, id, parsed.resolvedNote);
      return reply.status(200).send(resolved);
    }
  );
};
