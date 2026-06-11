// Apply the legacy peps_affiliate schema bridge (promo_codes legacy columns +
// legacy_orders / legacy_order_commissions / legacy_commission_splits tables).
// Run: npx tsx --env-file=.env scripts/apply-legacy-peps-migration.ts
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function splitStatements(sql: string): string[] {
  const out: string[] = [];
  let buf = '';
  let inDollar = false;
  for (const line of sql.split('\n')) {
    const trimmed = line.trim();
    if (trimmed.startsWith('--')) continue;
    if (!trimmed) {
      if (buf.trim()) buf += '\n';
      continue;
    }
    if (line.includes('$$')) {
      const occurrences = (line.match(/\$\$/g) || []).length;
      for (let i = 0; i < occurrences; i++) inDollar = !inDollar;
    }
    buf += line + '\n';
    if (!inDollar && trimmed.endsWith(';')) {
      out.push(buf.trim());
      buf = '';
    }
  }
  if (buf.trim()) out.push(buf.trim());
  return out;
}

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL is not set. Use --env-file=.env.');
    process.exit(1);
  }

  const sqlPath = join(__dirname, '..', 'migrations', 'legacy_peps_migration.sql');
  const sql = readFileSync(sqlPath, 'utf-8');
  const statements = splitStatements(sql);

  console.log(`Applying ${statements.length} statements from migrations/legacy_peps_migration.sql ...`);

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      const preview = stmt.replace(/\s+/g, ' ').slice(0, 100);
      console.log(`[${i + 1}/${statements.length}] ${preview}${stmt.length > 100 ? '...' : ''}`);
      try {
        await pool.query(stmt);
      } catch (err: any) {
        console.error(`  FAILED: ${err.message}`);
        throw err;
      }
    }
    console.log('Legacy peps schema bridge applied.');
  } finally {
    await pool.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
