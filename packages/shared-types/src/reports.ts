import { z } from 'zod';

export const ReportSummaryResponseSchema = z.object({
  totalIncomeMinor: z.union([z.bigint(), z.number().int()]).transform((val) => BigInt(val)),
  salesCount: z.number().int(),
  itemsSoldCount: z.number().int(),
  averageTicketMinor: z.union([z.bigint(), z.number().int()]).transform((val) => BigInt(val)),
  cashIncomeMinor: z.union([z.bigint(), z.number().int()]).transform((val) => BigInt(val)),
  mobileIncomeMinor: z.union([z.bigint(), z.number().int()]).transform((val) => BigInt(val)),
  protectedAmountMinor: z.union([z.bigint(), z.number().int()]).transform((val) => BigInt(val)),
  alertsCount: z.number().int(),
  incomeGrowthPct: z.number(),
});
export type ReportSummaryResponse = z.infer<typeof ReportSummaryResponseSchema>;

export const BreakdownDimensionSchema = z.enum(['branch', 'payment_method', 'product', 'cashier']);
export type BreakdownDimension = z.infer<typeof BreakdownDimensionSchema>;

export const BreakdownItemSchema = z.object({
  id: z.string(),
  label: z.string(),
  subLabel: z.string().optional(),
  salesCount: z.number().int(),
  itemsSold: z.number().int().optional(),
  incomeMinor: z.union([z.bigint(), z.number().int()]).transform((val) => BigInt(val)),
  percentage: z.number(),
});
export type BreakdownItem = z.infer<typeof BreakdownItemSchema>;

export const ReportBreakdownResponseSchema = z.object({
  dimension: BreakdownDimensionSchema,
  items: z.array(BreakdownItemSchema),
  totalMinor: z.union([z.bigint(), z.number().int()]).transform((val) => BigInt(val)),
});
export type ReportBreakdownResponse = z.infer<typeof ReportBreakdownResponseSchema>;
