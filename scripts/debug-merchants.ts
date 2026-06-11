import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

async function main() {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Group by description to see import sources
  const { rows: byDesc } = await pool.query<{ desc_root: string; count: number }>(`
    SELECT
      CASE
        WHEN description LIKE '%Transfer Monitoring%' THEN 'Transfer Monitoring'
        WHEN description LIKE '%New Stores%' THEN 'New Stores'
        WHEN description LIKE '%manually by admin%' THEN 'AdminDialog'
        ELSE 'other / null'
      END AS desc_root,
      COUNT(*)::int AS count
    FROM vendor_profiles
    GROUP BY desc_root
    ORDER BY count DESC
  `);
  console.log("By source description:", byDesc);

  // Duplicate legal_names?
  const { rows: dups } = await pool.query<{ legal_name: string; count: number }>(`
    SELECT legal_name, COUNT(*)::int AS count
    FROM vendor_profiles
    GROUP BY legal_name
    HAVING COUNT(*) > 1
    ORDER BY count DESC
    LIMIT 5
  `);
  console.log("Duplicate legal_names (top 5):", dups);

  // Recent vs older
  const { rows: ageBuckets } = await pool.query(`
    SELECT
      CASE
        WHEN created_at > NOW() - INTERVAL '1 hour' THEN 'last hour'
        WHEN created_at > NOW() - INTERVAL '1 day' THEN 'last day'
        ELSE 'older'
      END AS age,
      COUNT(*)::int AS count
    FROM vendor_profiles
    GROUP BY age
  `);
  console.log("Age buckets:", ageBuckets);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
