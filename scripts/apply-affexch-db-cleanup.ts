// Apply AFFEXCH database cleanup
// Run: npx tsx --env-file=.env scripts/apply-affexch-db-cleanup.ts
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Use --env-file=.env.');
    process.exit(1);
  }

  const sqlPath = join(__dirname, '..', 'migrations', 'affexch_db_cleanup.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log('Applying AFFEXCH database cleanup ...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // Whole file is wrapped in a single transaction — run as one statement
    // so the BEGIN/COMMIT bracketing actually rolls back on partial failure.
    await pool.query(sql);
    console.log('Cleanup applied.');

    // Sanity check: confirm rename took effect.
    const r = await pool.query(`SELECT to_regclass('vendor_profiles') AS exists`);
    console.log('  vendor_profiles exists:', !!r.rows[0]?.exists);

    const r2 = await pool.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_name = 'offers' AND column_name IN ('vendor_id', 'company_id')`,
    );
    console.log('  offers FK column:', r2.rows.map((row: any) => row.column_name).join(', '));

    const r3 = await pool.query(
      `SELECT table_name FROM information_schema.tables
       WHERE table_schema = 'public'
       ORDER BY table_name`,
    );
    console.log(`  ${r3.rows.length} tables remain in public schema.`);
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
