// Verify AFFEXCH Phase 2 state on live DB
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const tables = await pool.query(
    `SELECT table_name FROM information_schema.tables
     WHERE table_name IN ('promo_codes','content_links','code_redemptions')
     ORDER BY table_name;`
  );
  console.log('AFFEXCH tables:');
  console.table(tables.rows);

  for (const t of ['promo_codes', 'content_links', 'code_redemptions']) {
    const cols = await pool.query(
      `SELECT column_name, data_type, udt_name, is_nullable, column_default
         FROM information_schema.columns
         WHERE table_name = $1
         ORDER BY ordinal_position;`,
      [t]
    );
    console.log(`\n${t} columns:`);
    console.table(cols.rows);
  }

  const ctCols = await pool.query(
    `SELECT column_name, data_type, udt_name
       FROM information_schema.columns
       WHERE table_name = 'creator_profiles' AND column_name IN ('affiliate_tier','city');`
  );
  console.log('\ncreator_profiles new columns:');
  console.table(ctCols.rows);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
