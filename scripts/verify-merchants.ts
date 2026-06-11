import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

async function main() {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const { rows: total } = await pool.query("SELECT COUNT(*) FROM vendor_profiles");
  const { rows: byStatus } = await pool.query(
    "SELECT status, COUNT(*)::int AS count FROM vendor_profiles GROUP BY status",
  );
  const { rows: byCountry } = await pool.query(
    "SELECT country, COUNT(*)::int AS count FROM vendor_profiles GROUP BY country ORDER BY count DESC",
  );
  const { rows: recent } = await pool.query(
    "SELECT legal_name, city, country FROM vendor_profiles ORDER BY created_at DESC LIMIT 5",
  );
  console.log("Total merchants:", total[0].count);
  console.log("By status:", byStatus);
  console.log("By country:", byCountry);
  console.log("Recent 5 inserts:", recent);
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
