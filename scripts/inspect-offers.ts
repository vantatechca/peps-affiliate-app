import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

async function main() {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: total } = await pool.query("SELECT COUNT(*)::int AS count FROM offers");
  console.log("Total offers:", total[0].count);

  const { rows: status } = await pool.query(
    "SELECT status, COUNT(*)::int AS count FROM offers GROUP BY status",
  );
  console.log("By status:", status);

  const { rows: perVendor } = await pool.query(`
    SELECT (SELECT COUNT(*)::int FROM offers WHERE vendor_id = vp.id) AS offers_count,
           COUNT(*)::int AS merchant_count
    FROM vendor_profiles vp
    GROUP BY 1
    ORDER BY 1
  `);
  console.log("Merchants grouped by offer count:");
  for (const r of perVendor) console.log(`  ${r.offers_count} offers → ${r.merchant_count} merchants`);

  const { rows: products } = await pool.query(
    "SELECT DISTINCT product_name FROM offers WHERE product_name IS NOT NULL ORDER BY 1 LIMIT 20",
  );
  console.log("Sample distinct product_name values (first 20):", products.map((r) => r.product_name));

  const { rows: sample } = await pool.query(`
    SELECT o.title, o.product_name, o.average_order_value, o.commission_percentage, vp.legal_name
    FROM offers o
    JOIN vendor_profiles vp ON vp.id = o.vendor_id
    LIMIT 3
  `);
  console.log("Sample offers:", sample);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
