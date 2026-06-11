import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

async function main() {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows } = await pool.query<{ city: string; country: string; count: number }>(`
    SELECT city, country, COUNT(*)::int AS count
    FROM vendor_profiles
    WHERE city IS NOT NULL AND city <> ''
    GROUP BY city, country
    ORDER BY count DESC, city
  `);

  console.log(`Distinct cities: ${rows.length}`);
  console.log("rank | merchants | city | country");
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    console.log(`${String(i + 1).padStart(3, " ")} | ${String(r.count).padStart(3, " ")} | ${r.city} | ${r.country}`);
  }

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
