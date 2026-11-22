import { z } from 'zod';
import { UnitKindSchema } from './catalog.js';

export const SaleStatusSchema = z.enum([
  'draft',
  'awaiting_payment',
  'payment_pending',
  'paid',
  'voided',
  'failed',
]);
export type SaleStatus = z.infer<typeof SaleStatusSchema>;

export const PaymentMethodSchema = z.enum(['cash', 'mobile_money']);
export type PaymentMethod = z.infer<typeof PaymentMethodSchema>;

export const SaleItemInputSchema = z
  .object({
    productId: z.string().uuid().optional(),
    product_id: z.string().uuid().optional(),
    nameSnapshot: z.string().trim().min(1).max(255).optional(),
    name_snapshot: z.string().trim().min(1).max(255).optional(),
    barcodeSnapshot: z.string().trim().max(64).optional(),
    barcode_snapshot: z.string().trim().max(64).optional(),
    unit: UnitKindSchema,
    unitPriceMinor: z.coerce.number().int().nonnegative().optional(),
    unit_price_minor: z.coerce.number().int().nonnegative().optional(),
    quantity: z.union([z.number().positive(), z.string().regex(/^\d+(?:\.\d{1,3})?$/)]),
    lineTotalMinor: z.coerce.number().int().nonnegative().optional(),
    line_total_minor: z.coerce.number().int().nonnegative().optional(),
  })
  .transform((val) => ({
    product_id: val.product_id ?? val.productId,
    name_snapshot: val.name_snapshot ?? val.nameSnapshot ?? '',
    barcode_snapshot: val.barcode_snapshot ?? val.barcodeSnapshot,
    unit: val.unit,
    unit_price_minor: val.unit_price_minor ?? val.unitPriceMinor ?? 0,
    quantity: typeof val.quantity === 'string' ? Number.parseFloat(val.quantity) : val.quantity,
    line_total_minor: val.line_total_minor ?? val.lineTotalMinor ?? 0,
  }));
export type SaleItemInput = z.infer<typeof SaleItemInputSchema>;

export const CreateSaleRequestSchema = z
  .object({
    id: z.string().uuid('Sale ID must be a client-generated UUID v7'),
    branchId: z.string().uuid().optional(),
    branch_id: z.string().uuid().optional(),
    paymentMethod: PaymentMethodSchema.optional(),
    payment_method: PaymentMethodSchema.optional(),
    subtotalMinor: z.coerce.number().int().nonnegative().optional(),
    subtotal_minor: z.coerce.number().int().nonnegative().optional(),
    totalMinor: z.coerce.number().int().nonnegative().optional(),
    total_minor: z.coerce.number().int().nonnegative().optional(),
    cashReceivedMinor: z.coerce.number().int().optional(),
    cash_received_minor: z.coerce.number().int().optional(),
    idempotencyKey: z.string().trim().min(8).max(128).optional(),
    idempotency_key: z.string().trim().min(8).max(128).optional(),
    items: z.array(SaleItemInputSchema).min(1, 'Sale must contain at least one item'),
    clientCreatedAt: z.string().optional(),
    client_created_at: z.string().optional(),
  })
  .transform((val) => ({
    id: val.id,
    branch_id: (val.branch_id ?? val.branchId)!,
    payment_method: (val.payment_method ?? val.paymentMethod)!,
    subtotal_minor: val.subtotal_minor ?? val.subtotalMinor ?? 0,
    total_minor: val.total_minor ?? val.totalMinor ?? 0,
    cash_received_minor: val.cash_received_minor ?? val.cashReceivedMinor,
    idempotency_key: (val.idempotency_key ?? val.idempotencyKey)!,
    items: val.items,
    client_created_at: val.client_created_at ?? val.clientCreatedAt ?? new Date().toISOString(),
  }));
export type CreateSaleRequest = z.infer<typeof CreateSaleRequestSchema>;

export const VoidSaleRequestSchema = z
  .object({
    reason: z.string().trim().min(3).max(255),
    ownerPin: z
      .string()
      .regex(/^\d{4,6}$/)
      .optional(),
    pin: z
      .string()
      .regex(/^\d{4,6}$/)
      .optional(),
  })
  .transform((val) => ({
    reason: val.reason,
    pin: val.pin ?? val.ownerPin,
  }));
export type VoidSaleRequest = z.infer<typeof VoidSaleRequestSchema>;

export const SaleItemResponseSchema = z.object({
  id: z.string().uuid(),
  sale_id: z.string().uuid(),
  product_id: z.string().uuid().nullable().optional(),
  name_snapshot: z.string(),
  barcode_snapshot: z.string().nullable().optional(),
  unit: UnitKindSchema,
  unit_price_minor: z.coerce.number().int().nonnegative(),
  quantity: z.number().positive(),
  line_total_minor: z.coerce.number().int().nonnegative(),
});
export type SaleItemResponse = z.infer<typeof SaleItemResponseSchema>;

export const SaleResponseSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  branch_id: z.string().uuid(),
  cashier_id: z.string().uuid(),
  status: SaleStatusSchema,
  payment_method: PaymentMethodSchema.nullable(),
  subtotal_minor: z.coerce.number().int().nonnegative(),
  total_minor: z.coerce.number().int().nonnegative(),
  cash_received_minor: z.coerce.number().int().nullable().optional(),
  overpaid_minor: z.coerce.number().int().nonnegative(),
  idempotency_key: z.string(),
  client_created_at: z.string(),
  completed_at: z.string().nullable().optional(),
  voided_at: z.string().nullable().optional(),
  void_reason: z.string().nullable().optional(),
  voided_by: z.string().nullable().optional(),
  created_at: z.string(),
  items: z.array(SaleItemResponseSchema).optional(),
});
export type SaleResponse = z.infer<typeof SaleResponseSchema>;
