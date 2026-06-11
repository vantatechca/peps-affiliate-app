// Inspect commission_type enums in live DB
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const enums = await pool.query(
    `SELECT t.typname, array_agg(e.enumlabel ORDER BY e.enumsortorder) AS values
       FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
       WHERE t.typname LIKE '%commission%'
       GROUP BY t.typname
       ORDER BY t.typname;`
  );
  console.log('commission-related enums:');
  console.table(enums.rows);

  const cols = await pool.query(
    `SELECT table_name, column_name, udt_name
       FROM information_schema.columns
       WHERE column_name = 'commission_type'
       ORDER BY table_name;`
  );
  console.log('\ntables with commission_type column:');
  console.table(cols.rows);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
