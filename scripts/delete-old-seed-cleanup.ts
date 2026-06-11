// Continue the old-seed cleanup. The live DB doesn't enforce the FK cascade
// Drizzle declared, so we have to drop offers + vendor_profiles ourselves.

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

async function main() {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  const before = await pool.query<{ vendors: string; offers: string }>(`
    SELECT
      (SELECT COUNT(*) FROM vendor_profiles)::text AS vendors,
      (SELECT COUNT(*) FROM offers)::text AS offers
  `);
  console.log("[cleanup] before:", before.rows[0]);

  // Drop offers first (no cascade in live DB).
  const offerRes = await pool.query(`
    DELETE FROM offers
    WHERE vendor_id IN (
      SELECT id FROM vendor_profiles WHERE legal_name LIKE '%[affexch-seed]%'
    )
  `);
  console.log(`[cleanup] deleted offers: ${offerRes.rowCount}`);

  // Then the vendor_profiles.
  const vendorRes = await pool.query(`
    DELETE FROM vendor_profiles WHERE legal_name LIKE '%[affexch-seed]%'
  `);
  console.log(`[cleanup] deleted vendor_profiles: ${vendorRes.rowCount}`);

  const after = await pool.query<{ vendors: string; offers: string }>(`
    SELECT
      (SELECT COUNT(*) FROM vendor_profiles)::text AS vendors,
      (SELECT COUNT(*) FROM offers)::text AS offers
  `);
  console.log("[cleanup] after:", after.rows[0]);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
