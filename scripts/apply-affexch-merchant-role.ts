// Apply AFFEXCH merchant-role migration
// Run: npx tsx --env-file=.env scripts/apply-affexch-merchant-role.ts
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

  const sqlPath = join(__dirname, '..', 'migrations', 'affexch_merchant_role.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  console.log('Applying AFFEXCH merchant-role migration ...');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    // PG requires `ALTER TYPE ... ADD VALUE` to commit before being usable in the
    // same transaction as the UPDATE. Split into two queries.
    const parts = sql.split(/\n\n/).filter((p) => p.trim().length > 0);
    for (const stmt of parts) {
      await pool.query(stmt);
    }
    const r = await pool.query("SELECT role, COUNT(*)::int AS n FROM users GROUP BY role ORDER BY role");
    console.log("User role counts:");
    console.table(r.rows);
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
