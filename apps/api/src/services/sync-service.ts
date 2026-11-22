import { withTenantTransaction, type TenantContext } from '../plugins/db.js';
import type { RequestUser } from '../middleware/auth.js';
import type { CatalogSyncResponse, ProductResponse } from '@payproof/shared-types';

export class SyncService {
  public static async getCatalogSync(
    user: RequestUser,
    since?: string
  ): Promise<CatalogSyncResponse> {
    const ctx: TenantContext = {
      orgId: user.org_id,
      userId: user.user_id,
      role: user.role,
      branchIds: user.branch_ids,
    };

    return withTenantTransaction(ctx, async (client) => {
      const serverTime = new Date().toISOString();
      const conditions: string[] = ['p.org_id = $1'];
      const values: unknown[] = [user.org_id];

      if (since) {
        const sinceDate = new Date(since);
        if (!Number.isNaN(sinceDate.getTime())) {
          conditions.push('p.updated_at > $2');
          values.push(sinceDate);
        }
      } else {
        // Full initial sync only fetches active products
        conditions.push('p.active = true');
      }

      const query = `
        SELECT
          p.id,
          p.org_id,
          p.name,
          p.name_local,
          p.sku,
          p.unit,
          p.price_minor::bigint AS price_minor,
          p.active,
          p.updated_at,
          p.created_at,
          COALESCE(
            (SELECT json_agg(b.barcode) FROM product_barcodes b WHERE b.product_id = p.id),
            '[]'::json
          ) AS barcodes
        FROM products p
        WHERE ${conditions.join(' AND ')}
        ORDER BY p.updated_at ASC
      `;

      const res = await client.query(query, values);
      const products: ProductResponse[] = res.rows.map((row) => ({
        id: row.id,
        org_id: row.org_id,
        name: row.name,
        name_local: row.name_local,
        sku: row.sku,
        unit: row.unit,
        price_minor: Number(row.price_minor),
        active: row.active,
        barcodes: Array.isArray(row.barcodes) ? row.barcodes : [],
        updated_at: row.updated_at.toISOString(),
        created_at: row.created_at.toISOString(),
      }));

      return {
        products,
        server_time: serverTime,
        serverTimestamp: serverTime,
        count: products.length,
      };
    });
  }
}
