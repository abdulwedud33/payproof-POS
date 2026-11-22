import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import {
  OpenShiftRequestSchema,
  CloseShiftRequestSchema,
  AppApiError,
  ErrorCode,
} from '@payproof/shared-types';
import { ShiftService } from '../services/shift-service.js';
import { requireAuth } from '../middleware/auth.js';

const OpenShiftBodySchema = OpenShiftRequestSchema.extend({
  branch_id: z.string().uuid(),
});

const CloseShiftBodySchema = CloseShiftRequestSchema.extend({
  branch_id: z.string().uuid(),
});

export const shiftRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', requireAuth);

  // POST /v1/shifts/open
  fastify.post('/open', async (request, reply) => {
    const parsed = OpenShiftBodySchema.parse(request.body);
    const shift = await ShiftService.openShift(request.user!, parsed.branch_id, {
      opening_float_minor: parsed.opening_float_minor,
      notes: parsed.notes,
    });
    return reply.status(201).send(shift);
  });

  // GET /v1/shifts/current
  fastify.get('/current', async (request, reply) => {
    const query = request.query as { branch_id?: string };
    if (!query.branch_id) {
      throw new AppApiError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Missing required query parameter branch_id',
        statusCode: 400,
      });
    }

    const shift = await ShiftService.getCurrentShift(request.user!, query.branch_id);
    if (!shift) {
      return reply.status(404).send({
        error: {
          code: 'NO_OPEN_SHIFT',
          message: 'No active shift is currently open for this cashier.',
        },
      });
    }
    return reply.status(200).send(shift);
  });

  // POST /v1/shifts/close
  fastify.post('/close', async (request, reply) => {
    const parsed = CloseShiftBodySchema.parse(request.body);
    const zReport = await ShiftService.closeShift(request.user!, parsed.branch_id, {
      actual_cash_minor: parsed.actual_cash_minor,
      notes: parsed.notes,
    });
    return reply.status(200).send(zReport);
  });

  // GET /v1/shifts (Owner / Audit history)
  fastify.get('/', async (request, reply) => {
    const query = request.query as { branch_id?: string; cashier_id?: string };
    const shifts = await ShiftService.listShifts(request.user!, query.branch_id, query.cashier_id);
    return reply.status(200).send({ data: shifts });
  });
};
