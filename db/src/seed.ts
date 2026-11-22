import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runSeed() {
  const connectionString =
    process.env.MIGRATOR_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres_password@localhost:5432/payproof';

  console.log(`Connecting to database for synthetic seed...`);
  const pool = new pg.Pool({ connectionString });

  try {
    const client = await pool.connect();
    console.log('Running synthetic seed...');

    const seedFile = path.resolve(__dirname, '../seed/seed_synthetic.sql');
    const sql = fs.readFileSync(seedFile, 'utf8');

    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');

    console.log('Synthetic seed completed successfully.');
    client.release();
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runSeed();
}

export { runSeed };
