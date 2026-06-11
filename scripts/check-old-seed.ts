import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

async function main() {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const { rows: merchants } = await pool.query<{ count: string }>(
    `SELECT COUNT(*) FROM vendor_profiles WHERE legal_name LIKE '%[affexch-seed]%'`,
  );
  console.log("Merchants tagged [affexch-seed]:", merchants[0].count);

  const { rows: offers } = await pool.query<{ count: string }>(`
    SELECT COUNT(*) FROM offers o
    JOIN vendor_profiles vp ON vp.id = o.vendor_id
    WHERE vp.legal_name LIKE '%[affexch-seed]%'
  `);
  console.log("Offers attached to those merchants:", offers[0].count);

  const { rows: redemptions } = await pool.query<{ count: string }>(`
    SELECT COUNT(*) FROM redemptions r
    JOIN vendor_profiles vp ON vp.id = r.vendor_id
    WHERE vp.legal_name LIKE '%[affexch-seed]%'
  `).catch(() => ({ rows: [{ count: "n/a" }] }));
  console.log("Redemptions referencing those merchants:", redemptions[0].count);

  const { rows: links } = await pool.query<{ count: string }>(`
    SELECT COUNT(*) FROM content_links cl
    JOIN offers o ON o.id = cl.offer_id
    JOIN vendor_profiles vp ON vp.id = o.vendor_id
    WHERE vp.legal_name LIKE '%[affexch-seed]%'
  `).catch(() => ({ rows: [{ count: "n/a" }] }));
  console.log("Content links pointing at those merchants:", links[0].count);

  const { rows: sample } = await pool.query(`
    SELECT legal_name FROM vendor_profiles
    WHERE legal_name LIKE '%[affexch-seed]%'
    ORDER BY legal_name
    LIMIT 6
  `);
  console.log("Sample legal_names:", sample.map((r) => (r as any).legal_name));

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
