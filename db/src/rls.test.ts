import { describe, it, expect } from 'vitest';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString =
  process.env.DATABASE_URL || 'postgres://app_api:CHANGE_ME@localhost:5432/payproof';

describe('Row Level Security (RLS) Policy Test Suite', () => {
  const pool = new pg.Pool({ connectionString });

  // Only run against a live database instance
  it.skipIf(!process.env.DATABASE_URL)('verifies all public tables enforce RLS and have policies', async () => {
    const client = await pool.connect();
    try {
      const query = `
        SELECT c.relname
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind = 'r'
          AND (NOT c.relrowsecurity OR NOT c.relforcerowsecurity
               OR NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid));
      `;
      const res = await client.query(query);
      expect(res.rows).toEqual([]);
    } finally {
      client.release();
    }
  });

  it.skipIf(!process.env.DATABASE_URL)('fails closed: returns 0 rows when session context is omitted', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // No SET LOCAL called
      const usersRes = await client.query('SELECT * FROM users');
      expect(usersRes.rows).toEqual([]);

      const branchesRes = await client.query('SELECT * FROM branches');
      expect(branchesRes.rows).toEqual([]);

      const orgsRes = await client.query('SELECT * FROM organizations');
      expect(orgsRes.rows).toEqual([]);

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });

  it.skipIf(!process.env.DATABASE_URL)('prevents cross-tenant access between orgs', async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const orgA = '11111111-1111-4111-a111-111111111111';
      const userA = '22222222-2222-4222-a222-222222222222';
      await client.query(`SET LOCAL app.org_id = '${orgA}'`);
      await client.query(`SET LOCAL app.user_id = '${userA}'`);
      await client.query(`SET LOCAL app.role = 'owner'`);

      const res = await client.query('SELECT org_id FROM users');
      for (const row of res.rows) {
        expect(row.org_id).toBe(orgA);
      }

      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  });
});
