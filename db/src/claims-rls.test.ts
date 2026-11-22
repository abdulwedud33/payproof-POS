import { describe, it, expect } from 'vitest';
import pg from 'pg';

describe('Payment Accounts, Consumed Payments & Verification RLS Policies', () => {
  const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres_password@localhost:5432/payproof';

  it.skipIf(!process.env.TEST_DB)('verifies cashier cannot insert or modify payment accounts', async () => {
    const client = new pg.Client({ connectionString: dbUrl });
    await client.connect();

    try {
      await client.query('BEGIN');
      // Set session to cashier
      await client.query("SELECT set_config('app.role', 'cashier', true)");
      await client.query("SELECT set_config('app.org_id', '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b', true)");

      // Attempt payment account insert as cashier -> must fail RLS
      await expect(
        client.query(`
          INSERT INTO payment_accounts (org_id, branch_id, provider, display_label, holder_name, holder_name_normalized, account_ref_enc, account_ref_last4)
          VALUES ('018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b', '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6c', 'telebirr', 'Fake', 'Fake', 'fake', decode('1234', 'hex'), '1234')
        `)
      ).rejects.toThrow();

      await client.query('ROLLBACK');
    } finally {
      await client.end();
    }
  });

  it.skipIf(!process.env.TEST_DB)('verifies consumed_payments immutability trigger rejects UPDATE and DELETE', async () => {
    const client = new pg.Client({ connectionString: dbUrl });
    await client.connect();

    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.role', 'owner', true)");
      await client.query("SELECT set_config('app.org_id', '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b', true)");

      // Update on consumed_payments must fail
      await expect(
        client.query(`
          UPDATE consumed_payments SET amount_minor = 999999 WHERE provider_txn_id = 'TXN_TEST'
        `)
      ).rejects.toThrow(/immutable/i);

      await client.query('ROLLBACK');
    } finally {
      await client.end();
    }
  });

  it.skipIf(!process.env.TEST_DB)('verifies chk_verified_integrity check constraint on payment_verifications', async () => {
    const client = new pg.Client({ connectionString: dbUrl });
    await client.connect();

    try {
      await client.query('BEGIN');
      await client.query("SELECT set_config('app.role', 'owner', true)");
      await client.query("SELECT set_config('app.org_id', '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b', true)");

      // Attempting to set verdict = 'verified' with receiver_match = false must violate check constraint
      await expect(
        client.query(`
          INSERT INTO payment_verifications (org_id, sale_id, attempt_no, verdict, receiver_match, amount_ok, time_ok)
          VALUES ('018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6b', '018f3a2b-4c5d-7e8f-9a0b-1c2d3e4f5a6d', 1, 'verified', false, true, true)
        `)
      ).rejects.toThrow(/chk_verified_integrity/);

      await client.query('ROLLBACK');
    } finally {
      await client.end();
    }
  });
});
