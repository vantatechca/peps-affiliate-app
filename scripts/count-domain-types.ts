import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

async function main() {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows } = await pool.query<{ bucket: string; count: number }>(`
    SELECT
      CASE
        WHEN website_url IS NULL OR website_url = '' THEN 'empty'
        WHEN website_url LIKE '%.example%' THEN '.example placeholder'
        WHEN website_url LIKE '%.ca' THEN '.ca real / derived'
        ELSE 'other'
      END AS bucket,
      COUNT(*)::int AS count
    FROM vendor_profiles
    GROUP BY bucket
    ORDER BY count DESC
  `);
  console.log("Domain-URL breakdown:");
  for (const r of rows) console.log(`  ${r.count} → ${r.bucket}`);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
