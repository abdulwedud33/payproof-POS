import { describe, it, expect } from 'vitest';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL || 'postgres://app_api:CHANGE_ME@localhost:5432/payproof';

describe('Catalog & Sales RLS and Immutability Test Suite', () => {
  const pool = new pg.Pool({ connectionString });

  it.skipIf(!process.env.DATABASE_URL)(
    'verifies all catalog and sales tables enforce RLS with policies',
    async () => {
      const client = await pool.connect();
      try {
        const query = `
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND c.relname IN ('products', 'product_barcodes', 'sales', 'sale_items')
          AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity
               OR NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid));
      `;
        const res = await client.query(query);
        expect(res.rows).toEqual([]);
      } finally {
        client.release();
      }
    }
  );

  it.skipIf(!process.env.DATABASE_URL)(
    'fails closed: returns 0 rows when session context is omitted',
    async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const productsRes = await client.query('SELECT * FROM products');
        expect(productsRes.rows).toEqual([]);

        const salesRes = await client.query('SELECT * FROM sales');
        expect(salesRes.rows).toEqual([]);

        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    }
  );

  it.skipIf(!process.env.DATABASE_URL)('cashier cannot write products (owner only)', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const orgId = '11111111-1111-1111-1111-111111111111';
      const cashierId = '33333333-3333-3333-3333-333333333331';
      const branchId = '22222222-2222-2222-2222-222222222221';

      await client.query(`SET LOCAL app.org_id = '${orgId}'`);
      await client.query(`SET LOCAL app.user_id = '${cashierId}'`);
      await client.query(`SET LOCAL app.role = 'cashier'`);
      await client.query(`SET LOCAL app.branch_ids = '{${branchId}}'`);

      await expect(
        client.query(`
          INSERT INTO products (org_id, name, unit, price_minor)
          VALUES ('${orgId}', 'Illicit Product', 'piece', 5000)
        `)
      ).rejects.toThrow();

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it.skipIf(!process.env.DATABASE_URL)(
    'cashier cannot query sales of other branches or cashiers',
    async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const orgId = '11111111-1111-1111-1111-111111111111';
        const cashier1 = '33333333-3333-3333-3333-333333333331';
        const branch1 = '22222222-2222-2222-2222-222222222221';

        await client.query(`SET LOCAL app.org_id = '${orgId}'`);
        await client.query(`SET LOCAL app.user_id = '${cashier1}'`);
        await client.query(`SET LOCAL app.role = 'cashier'`);
        await client.query(`SET LOCAL app.branch_ids = '{${branch1}}'`);

        const res = await client.query('SELECT * FROM sales');
        for (const row of res.rows) {
          expect(row.cashier_id).toBe(cashier1);
          expect(row.branch_id).toBe(branch1);
        }

        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    }
  );

  it.skipIf(!process.env.DATABASE_URL)(
    'enforces immutability: completed sale rejects edits to amounts',
    async () => {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const orgId = '11111111-1111-1111-1111-111111111111';
        const ownerId = '00000000-0000-0000-0000-000000000001';

        await client.query(`SET LOCAL app.org_id = '${orgId}'`);
        await client.query(`SET LOCAL app.user_id = '${ownerId}'`);
        await client.query(`SET LOCAL app.role = 'owner'`);

        // Find any paid sale or insert test sale
        const saleId = '99999999-9999-9999-9999-999999999999';
        await client.query(`
        INSERT INTO sales (id, org_id, branch_id, cashier_id, status, payment_method, total_minor, subtotal_minor, idempotency_key, client_created_at, completed_at)
        VALUES ('${saleId}', '${orgId}', '22222222-2222-2222-2222-222222222221', '33333333-3333-3333-3333-333333333331', 'paid', 'cash', 15000, 15000, 'idemp-immut-test', now(), now())
      `);

        // Try editing total_minor on paid sale
        await expect(
          client.query(`UPDATE sales SET total_minor = 20000 WHERE id = '${saleId}'`)
        ).rejects.toThrow();

        // Try deleting paid sale
        await expect(client.query(`DELETE FROM sales WHERE id = '${saleId}'`)).rejects.toThrow();

        await client.query('ROLLBACK');
      } finally {
        client.release();
      }
    }
  );
});
