import { z } from 'zod';

export const UnitKindSchema = z.enum(['piece', 'kg', 'litre', 'pack']);
export type UnitKind = z.infer<typeof UnitKindSchema>;

export const ProductBarcodeSchema = z.object({
  id: z.string().uuid().optional(),
  barcode: z.string().trim().min(1).max(64),
});

export const CreateProductRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    name_local: z.string().trim().max(255).optional(),
    nameLocal: z.string().trim().max(255).optional(),
    sku: z.string().trim().max(64).optional(),
    unit: UnitKindSchema.default('piece'),
    price_minor: z.coerce.number().int().nonnegative().optional(),
    priceMinor: z.coerce.number().int().nonnegative().optional(),
    barcodes: z.array(z.string().trim().min(1).max(64)).default([]),
    active: z.boolean().default(true).optional(),
  })
  .transform((val) => ({
    name: val.name,
    name_local: val.name_local ?? val.nameLocal,
    sku: val.sku,
    unit: val.unit,
    price_minor: val.price_minor ?? val.priceMinor ?? 0,
    barcodes: val.barcodes,
    active: val.active ?? true,
  }));
export type CreateProductRequest = z.infer<typeof CreateProductRequestSchema>;

export const UpdateProductRequestSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    name_local: z.string().trim().max(255).optional(),
    nameLocal: z.string().trim().max(255).optional(),
    sku: z.string().trim().max(64).optional(),
    unit: UnitKindSchema.optional(),
    price_minor: z.coerce.number().int().nonnegative().optional(),
    priceMinor: z.coerce.number().int().nonnegative().optional(),
    active: z.boolean().optional(),
    barcodes: z.array(z.string().trim().min(1).max(64)).optional(),
  })
  .transform((val) => ({
    name: val.name,
    name_local: val.name_local ?? val.nameLocal,
    sku: val.sku,
    unit: val.unit,
    price_minor: val.price_minor ?? val.priceMinor,
    active: val.active,
    barcodes: val.barcodes,
  }));
export type UpdateProductRequest = z.infer<typeof UpdateProductRequestSchema>;

export const ProductResponseSchema = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  name: z.string(),
  name_local: z.string().nullable().optional(),
  sku: z.string().nullable().optional(),
  unit: UnitKindSchema,
  price_minor: z.coerce.number().int().nonnegative(),
  active: z.boolean(),
  barcodes: z.array(z.string()),
  updated_at: z.string(),
  created_at: z.string(),
});
export type ProductResponse = z.infer<typeof ProductResponseSchema>;

export const ProductImportRowSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    name_local: z.string().trim().max(255).optional(),
    nameLocal: z.string().trim().max(255).optional(),
    sku: z.string().trim().max(64).optional(),
    unit: UnitKindSchema.default('piece'),
    price_minor: z.coerce.number().int().nonnegative().optional(),
    priceMinor: z.coerce.number().int().nonnegative().optional(),
    priceBirr: z
      .string()
      .regex(/^\d+(?:\.\d{1,2})?$/)
      .optional(),
    barcode: z.string().trim().max(64).optional(),
  })
  .refine(
    (data) =>
      data.price_minor !== undefined ||
      data.priceMinor !== undefined ||
      data.priceBirr !== undefined,
    { message: 'Price must be provided via price_minor or priceBirr' }
  );
export type ProductImportRow = z.infer<typeof ProductImportRowSchema>;
