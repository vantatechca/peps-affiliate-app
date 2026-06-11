import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

async function main() {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: dups } = await pool.query(`
    SELECT legal_name, COUNT(*)::int AS count
    FROM vendor_profiles
    GROUP BY legal_name
    HAVING COUNT(*) > 1
    ORDER BY count DESC, legal_name
  `);
  console.log(`Duplicate legal_names: ${dups.length} rows`);
  console.log("Top 10 duplicates:", dups.slice(0, 10));

  // Timestamps — when were rows inserted? Bucket into 30-second buckets.
  const { rows: buckets } = await pool.query(`
    SELECT
      date_trunc('minute', created_at) AS minute,
      COUNT(*)::int AS count
    FROM vendor_profiles
    GROUP BY minute
    ORDER BY minute
  `);
  console.log("Insert timeline:");
  for (const r of buckets) console.log(`  ${r.minute}  +${r.count}`);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
