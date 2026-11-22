import { z } from 'zod';

export const ShiftStatusSchema = z.enum(['open', 'closed']);
export type ShiftStatus = z.infer<typeof ShiftStatusSchema>;

export const OpenShiftRequestSchema = z.object({
  opening_float_minor: z.number().int().nonnegative(),
  notes: z.string().max(500).optional(),
});
export type OpenShiftRequest = z.infer<typeof OpenShiftRequestSchema>;

export const CloseShiftRequestSchema = z.object({
  actual_cash_minor: z.number().int().nonnegative(),
  notes: z.string().max(500).optional(),
});
export type CloseShiftRequest = z.infer<typeof CloseShiftRequestSchema>;

export const ShiftResponseSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  branch_name: z.string().optional(),
  cashier_id: z.string().uuid(),
  cashier_name: z.string().optional(),
  opening_float_minor: z.number().int().nonnegative(),
  expected_cash_minor: z.number().int(),
  actual_cash_minor: z.number().int().nullable(),
  cash_difference_minor: z.number().int().nullable(),
  total_mobile_money_minor: z.number().int(),
  total_sales_count: z.number().int(),
  total_void_count: z.number().int(),
  status: ShiftStatusSchema,
  notes: z.string().nullable().optional(),
  opened_at: z.string().datetime(),
  closed_at: z.string().datetime().nullable(),
});
export type ShiftResponse = z.infer<typeof ShiftResponseSchema>;

export const ZReportResponseSchema = z.object({
  shift: ShiftResponseSchema,
  gross_sales_minor: z.number().int(),
  net_sales_minor: z.number().int(),
  cash_sales_minor: z.number().int(),
  telebirr_sales_minor: z.number().int(),
  cbe_sales_minor: z.number().int(),
  opening_float_minor: z.number().int(),
  expected_drawer_cash_minor: z.number().int(),
  actual_drawer_cash_minor: z.number().int(),
  discrepancy_minor: z.number().int(), // Over (+) or Short (-)
  discrepancy_status: z.enum(['balanced', 'overage', 'shortage']),
  formatted_report_text: z.string(),
});
export type ZReportResponse = z.infer<typeof ZReportResponseSchema>;
