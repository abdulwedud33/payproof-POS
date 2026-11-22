import { FastifyPluginAsync } from 'fastify';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { ReportService } from '../services/report-service.js';
import { BreakdownDimensionSchema } from '@payproof/shared-types';

export const reportRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth);

  // 1. GET /v1/reports/summary (Owner & Manager)
  app.get('/summary', { preHandler: [requireRole('owner', 'manager')] }, async (request, reply) => {
    const user = request.user!;
    const { branch_id, from, to } = request.query as {
      branch_id?: string;
      from?: string;
      to?: string;
    };

    const summary = await ReportService.getSummary(user.orgId, {
      branchId: branch_id,
      from,
      to,
    });
    return reply.status(200).send(summary);
  });

  // 2. GET /v1/reports/breakdown (Owner & Manager)
  app.get(
    '/breakdown',
    { preHandler: [requireRole('owner', 'manager')] },
    async (request, reply) => {
      const user = request.user!;
      const { dimension, branch_id, from, to } = request.query as {
        dimension?: string;
        branch_id?: string;
        from?: string;
        to?: string;
      };

      const parsedDim = BreakdownDimensionSchema.safeParse(dimension);
      const validDim = parsedDim.success ? parsedDim.data : 'branch';

      const breakdown = await ReportService.getBreakdown(user.orgId, validDim, {
        branchId: branch_id,
        from,
        to,
      });
      return reply.status(200).send(breakdown);
    }
  );

  // 3. GET /v1/reports/export (Owner only - CSV download)
  app.get('/export', { preHandler: [requireRole('owner')] }, async (request, reply) => {
    const user = request.user!;
    const { branch_id, from, to } = request.query as {
      branch_id?: string;
      from?: string;
      to?: string;
    };

    const csvContent = await ReportService.exportReportsCsv(user.orgId, {
      branchId: branch_id,
      from,
      to,
    });

    reply.header('content-type', 'text/csv');
    reply.header(
      'content-disposition',
      `attachment; filename="payproof-report-${new Date().toISOString().slice(0, 10)}.csv"`
    );
    return reply.status(200).send(csvContent);
  });
};
