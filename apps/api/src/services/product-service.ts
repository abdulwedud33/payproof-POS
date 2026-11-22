import { withTenantTransaction, type TenantContext } from '../plugins/db.js';
import type { RequestUser } from '../middleware/auth.js';
import {
  type CreateProductRequest,
  type UpdateProductRequest,
  type ProductResponse,
  AppApiError,
  ErrorCode,
} from '@payproof/shared-types';

export interface ProductListParams {
  search?: string;
  active?: boolean;
  page?: number;
  limit?: number;
}

export class ProductService {
  /**
   * Sanitizes string values to prevent CSV / Spreadsheet Formula Injection (CWE-1236).
   * Strips dangerous leading characters: '=', '+', '-', '@', '\t', '\r'.
   */
  public static sanitizeFormulaInjection(value: string): string {
    const trimmed = value.trim();
    if (/^[=+\-@\t\r]/.test(trimmed)) {
      return `'${trimmed}`;
    }
    return trimmed;
  }

  public static async listProducts(
    user: RequestUser,
    params: ProductListParams = {}
  ): Promise<{ products: ProductResponse[]; total: number }> {
    const ctx: TenantContext = {
      orgId: user.org_id,
      userId: user.user_id,
      role: user.role,
      branchIds: user.branch_ids,
    };

    const page = Math.max(1, params.page || 1);
    const limit = Math.min(100, Math.max(1, params.limit || 50));
    const offset = (page - 1) * limit;

    return withTenantTransaction(ctx, async (client) => {
      const conditions: string[] = ['p.org_id = $1'];
      const values: unknown[] = [user.org_id];
      let paramIdx = 2;

      if (params.active !== undefined) {
        conditions.push(`p.active = $${paramIdx++}`);
        values.push(params.active);
      }

      if (params.search && params.search.trim().length > 0) {
        const term = `%${params.search.trim().toLowerCase()}%`;
        conditions.push(`(
          lower(p.name) LIKE $${paramIdx} OR
          lower(COALESCE(p.name_local, '')) LIKE $${paramIdx} OR
          lower(COALESCE(p.sku, '')) LIKE $${paramIdx} OR
          EXISTS (
            SELECT 1 FROM product_barcodes b
            WHERE b.product_id = p.id AND lower(b.barcode) LIKE $${paramIdx}
          )
        )`);
        values.push(term);
        paramIdx++;
      }

      const whereClause = conditions.join(' AND ');

      // Total count query
      const countRes = await client.query(
        `SELECT count(*)::int AS total FROM products p WHERE ${whereClause}`,
        values
      );
      const total = countRes.rows[0]?.total || 0;

      // Data query with aggregated barcodes
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
        WHERE ${whereClause}
        ORDER BY p.name ASC
        LIMIT $${paramIdx++} OFFSET $${paramIdx}
      `;
      values.push(limit, offset);

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

      return { products, total };
    });
  }

  public static async getProductById(
    user: RequestUser,
    productId: string
  ): Promise<ProductResponse> {
    const ctx: TenantContext = {
      orgId: user.org_id,
      userId: user.user_id,
      role: user.role,
      branchIds: user.branch_ids,
    };

    return withTenantTransaction(ctx, async (client) => {
      const res = await client.query(
        `SELECT
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
         WHERE p.id = $1 AND p.org_id = $2`,
        [productId, user.org_id]
      );

      if (res.rowCount === 0) {
        throw new AppApiError({
          code: ErrorCode.NOT_FOUND,
          message: 'Product not found',
          statusCode: 404,
        });
      }

      const row = res.rows[0];
      return {
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
      };
    });
  }

  public static async createProduct(
    user: RequestUser,
    input: CreateProductRequest
  ): Promise<ProductResponse> {
    const ctx: TenantContext = {
      orgId: user.org_id,
      userId: user.user_id,
      role: user.role,
      branchIds: user.branch_ids,
    };

    return withTenantTransaction(ctx, async (client) => {
      const sanitizedName = ProductService.sanitizeFormulaInjection(input.name);
      const sanitizedNameLocal = input.name_local
        ? ProductService.sanitizeFormulaInjection(input.name_local)
        : null;

      const productRes = await client.query(
        `INSERT INTO products (org_id, name, name_local, sku, unit, price_minor, active)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, org_id, name, name_local, sku, unit, price_minor::bigint, active, updated_at, created_at`,
        [
          user.org_id,
          sanitizedName,
          sanitizedNameLocal,
          input.sku || null,
          input.unit,
          input.price_minor,
          input.active !== undefined ? input.active : true,
        ]
      );
      const row = productRes.rows[0];

      // Barcodes insertion
      const barcodes: string[] = [];
      if (input.barcodes && input.barcodes.length > 0) {
        for (const barcode of input.barcodes) {
          const cleanBarcode = barcode.trim();
          if (cleanBarcode.length > 0) {
            await client.query(
              `INSERT INTO product_barcodes (org_id, product_id, barcode)
               VALUES ($1, $2, $3)
               ON CONFLICT (org_id, barcode) DO NOTHING`,
              [user.org_id, row.id, cleanBarcode]
            );
            barcodes.push(cleanBarcode);
          }
        }
      }

      // Audit Log
      await client.query(
        `INSERT INTO audit_logs (org_id, actor_id, actor_role, action, entity_type, entity_id, meta)
         VALUES ($1, $2, $3, 'product_created', 'products', $4, $5)`,
        [
          user.org_id,
          user.user_id,
          user.role,
          row.id,
          JSON.stringify({ name: row.name, price_minor: row.price_minor }),
        ]
      );

      return {
        id: row.id,
        org_id: row.org_id,
        name: row.name,
        name_local: row.name_local,
        sku: row.sku,
        unit: row.unit,
        price_minor: Number(row.price_minor),
        active: row.active,
        barcodes,
        updated_at: row.updated_at.toISOString(),
        created_at: row.created_at.toISOString(),
      };
    });
  }

  public static async updateProduct(
    user: RequestUser,
    productId: string,
    input: UpdateProductRequest
  ): Promise<ProductResponse> {
    const ctx: TenantContext = {
      orgId: user.org_id,
      userId: user.user_id,
      role: user.role,
      branchIds: user.branch_ids,
    };

    return withTenantTransaction(ctx, async (client) => {
      // Verify product exists in org
      const existing = await client.query(`SELECT id FROM products WHERE id = $1 AND org_id = $2`, [
        productId,
        user.org_id,
      ]);
      if (existing.rowCount === 0) {
        throw new AppApiError({
          code: ErrorCode.NOT_FOUND,
          message: 'Product not found',
          statusCode: 404,
        });
      }

      const updates: string[] = ['updated_at = now()'];
      const values: unknown[] = [productId, user.org_id];
      let pIdx = 3;

      if (input.name !== undefined) {
        updates.push(`name = $${pIdx++}`);
        values.push(ProductService.sanitizeFormulaInjection(input.name));
      }
      if (input.name_local !== undefined) {
        updates.push(`name_local = $${pIdx++}`);
        values.push(
          input.name_local ? ProductService.sanitizeFormulaInjection(input.name_local) : null
        );
      }
      if (input.sku !== undefined) {
        updates.push(`sku = $${pIdx++}`);
        values.push(input.sku || null);
      }
      if (input.unit !== undefined) {
        updates.push(`unit = $${pIdx++}`);
        values.push(input.unit);
      }
      if (input.price_minor !== undefined) {
        updates.push(`price_minor = $${pIdx++}`);
        values.push(input.price_minor);
      }
      if (input.active !== undefined) {
        updates.push(`active = $${pIdx++}`);
        values.push(input.active);
      }

      await client.query(
        `UPDATE products SET ${updates.join(', ')} WHERE id = $1 AND org_id = $2`,
        values
      );

      // Barcodes replacement if provided
      if (input.barcodes !== undefined) {
        await client.query(`DELETE FROM product_barcodes WHERE product_id = $1 AND org_id = $2`, [
          productId,
          user.org_id,
        ]);
        for (const bc of input.barcodes) {
          const clean = bc.trim();
          if (clean.length > 0) {
            await client.query(
              `INSERT INTO product_barcodes (org_id, product_id, barcode)
               VALUES ($1, $2, $3)
               ON CONFLICT (org_id, barcode) DO NOTHING`,
              [user.org_id, productId, clean]
            );
          }
        }
      }

      // Audit Log
      await client.query(
        `INSERT INTO audit_logs (org_id, actor_id, actor_role, action, entity_type, entity_id, meta)
         VALUES ($1, $2, $3, 'product_updated', 'products', $4, $5)`,
        [user.org_id, user.user_id, user.role, productId, JSON.stringify(input)]
      );

      return ProductService.getProductById(user, productId);
    });
  }

  public static async deleteProduct(
    user: RequestUser,
    productId: string
  ): Promise<{ success: true }> {
    const ctx: TenantContext = {
      orgId: user.org_id,
      userId: user.user_id,
      role: user.role,
      branchIds: user.branch_ids,
    };

    return withTenantTransaction(ctx, async (client) => {
      const res = await client.query(
        `UPDATE products SET active = false, updated_at = now()
         WHERE id = $1 AND org_id = $2`,
        [productId, user.org_id]
      );
      if (res.rowCount === 0) {
        throw new AppApiError({
          code: ErrorCode.NOT_FOUND,
          message: 'Product not found',
          statusCode: 404,
        });
      }

      await client.query(
        `INSERT INTO audit_logs (org_id, actor_id, actor_role, action, entity_type, entity_id, meta)
         VALUES ($1, $2, $3, 'product_deactivated', 'products', $4, '{}')`,
        [user.org_id, user.user_id, user.role, productId]
      );

      return { success: true };
    });
  }

  /**
   * Bulk CSV import with formula injection sanitization and atomic batch insert.
   * Expected CSV Header: name,name_local,sku,unit,price_minor,barcode
   */
  public static async importCsv(
    user: RequestUser,
    csvContent: string
  ): Promise<{ imported: number; errors: Array<{ row: number; error: string }> }> {
    const lines = csvContent
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new AppApiError({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'CSV must contain at least a header and one data row',
        statusCode: 400,
      });
    }

    const headerLine = lines[0] || '';
    const header = headerLine
      .toLowerCase()
      .split(',')
      .map((h) => h.trim());
    const nameIdx = header.indexOf('name');
    const nameLocalIdx = header.indexOf('name_local');
    const skuIdx = header.indexOf('sku');
    const unitIdx = header.indexOf('unit');
    const priceMinorIdx = header.indexOf('price_minor');
    const barcodeIdx = header.indexOf('barcode');

    if (nameIdx === -1 || priceMinorIdx === -1) {
      throw new AppApiError({
        code: ErrorCode.VALIDATION_ERROR,
        message: "CSV header must include 'name' and 'price_minor'",
        statusCode: 400,
      });
    }

    const errors: Array<{ row: number; error: string }> = [];
    const validRows: Array<{
      name: string;
      name_local?: string;
      sku?: string;
      unit: 'piece' | 'kg' | 'litre' | 'pack';
      price_minor: number;
      barcode?: string;
    }> = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i] || '';
      const cols = line.split(',').map((c) => c.trim());
      const rawName = cols[nameIdx] || '';
      const rawPrice = cols[priceMinorIdx] || '';

      if (!rawName || rawName.length === 0) {
        errors.push({ row: i + 1, error: 'Product name cannot be empty' });
        continue;
      }

      const price = Number.parseInt(rawPrice, 10);
      if (Number.isNaN(price) || price < 0) {
        errors.push({ row: i + 1, error: `Invalid price_minor '${rawPrice}'` });
        continue;
      }

      const unitVal = (unitIdx !== -1 && cols[unitIdx] ? cols[unitIdx]!.toLowerCase() : 'piece') as
        'piece' | 'kg' | 'litre' | 'pack';
      const validUnits = ['piece', 'kg', 'litre', 'pack'];
      const unit = validUnits.includes(unitVal) ? unitVal : 'piece';

      validRows.push({
        name: ProductService.sanitizeFormulaInjection(rawName),
        name_local:
          nameLocalIdx !== -1 && cols[nameLocalIdx]
            ? ProductService.sanitizeFormulaInjection(cols[nameLocalIdx]!)
            : undefined,
        sku: skuIdx !== -1 ? cols[skuIdx] : undefined,
        unit,
        price_minor: price,
        barcode: barcodeIdx !== -1 ? cols[barcodeIdx] : undefined,
      });
    }

    const ctx: TenantContext = {
      orgId: user.org_id,
      userId: user.user_id,
      role: user.role,
      branchIds: user.branch_ids,
    };

    let importedCount = 0;
    await withTenantTransaction(ctx, async (client) => {
      for (const row of validRows) {
        const prodRes = await client.query(
          `INSERT INTO products (org_id, name, name_local, sku, unit, price_minor, active)
           VALUES ($1, $2, $3, $4, $5, $6, true)
           RETURNING id`,
          [
            user.org_id,
            row.name,
            row.name_local || null,
            row.sku || null,
            row.unit,
            row.price_minor,
          ]
        );
        const prodId = prodRes.rows[0].id;

        if (row.barcode && row.barcode.trim().length > 0) {
          await client.query(
            `INSERT INTO product_barcodes (org_id, product_id, barcode)
             VALUES ($1, $2, $3)
             ON CONFLICT (org_id, barcode) DO NOTHING`,
            [user.org_id, prodId, row.barcode.trim()]
          );
        }
        importedCount++;
      }

      await client.query(
        `INSERT INTO audit_logs (org_id, actor_id, actor_role, action, entity_type, meta)
         VALUES ($1, $2, $3, 'products_bulk_imported', 'products', $4)`,
        [user.org_id, user.user_id, user.role, JSON.stringify({ count: importedCount })]
      );
    });

    return { imported: importedCount, errors };
  }
}
