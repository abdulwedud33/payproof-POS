import { z } from 'zod';
import { ProductResponseSchema } from './catalog.js';

export const CatalogSyncResponseSchema = z
  .object({
    products: z.array(ProductResponseSchema),
    server_time: z.string().optional(),
    serverTimestamp: z.string().optional(),
    count: z.number().int().optional(),
  })
  .transform((val) => {
    const time = val.server_time ?? val.serverTimestamp ?? new Date().toISOString();
    return {
      products: val.products,
      server_time: time,
      serverTimestamp: time,
      count: val.count ?? val.products.length,
    };
  });
export type CatalogSyncResponse = z.infer<typeof CatalogSyncResponseSchema>;
