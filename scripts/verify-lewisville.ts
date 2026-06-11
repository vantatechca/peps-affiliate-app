import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

async function main() {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: vendor } = await pool.query(
    `SELECT legal_name, website_url FROM vendor_profiles WHERE legal_name LIKE '%Lewisville%'`,
  );
  console.log("Vendor:", vendor[0]);

  const { rows: offers } = await pool.query(
    `SELECT title, product_url FROM offers WHERE vendor_id = (
       SELECT id FROM vendor_profiles WHERE legal_name LIKE '%Lewisville%' LIMIT 1
     )`,
  );
  console.log(`Offers (${offers.length}):`);
  for (const o of offers) console.log(`  ${o.title} → ${o.product_url}`);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
