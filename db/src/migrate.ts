import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigrations() {
  const connectionString =
    process.env.MIGRATOR_DATABASE_URL ||
    process.env.DATABASE_URL ||
    'postgres://postgres:postgres_password@localhost:5432/payproof';

  console.log('Connecting to database for migrations...');
  const pool = new pg.Pool({ connectionString });

  try {
    const client = await pool.connect();
    const migrationsDir = path.resolve(__dirname, '../migrations');
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith('.sql'))
      .sort();

    console.log(`Found ${files.length} migration(s): ${files.join(', ')}`);

    for (const file of files) {
      console.log(`Applying migration: ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log(`✓ Applied ${file}`);
    }

    console.log('All migrations completed successfully.');
    client.release();
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runMigrations();
}

export { runMigrations };
