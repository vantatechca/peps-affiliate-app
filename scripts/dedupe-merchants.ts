// Remove duplicate vendor_profiles (same legal_name) — keep the oldest,
// drop the rest. Also drop any orphan offers whose vendor_id no longer
// matches a vendor_profile, and any orphan users (role='merchant' with
// no matching vendor).

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

async function main() {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // 1. Find duplicate legal_names — keep the row with the EARLIEST created_at.
  const dupeDelete = await pool.query(`
    DELETE FROM vendor_profiles
    WHERE id IN (
      SELECT id FROM (
        SELECT id,
               ROW_NUMBER() OVER (PARTITION BY legal_name ORDER BY created_at ASC, id ASC) AS rn
        FROM vendor_profiles
      ) ranked
      WHERE rn > 1
    )
  `);
  console.log(`[dedupe] dropped ${dupeDelete.rowCount} duplicate vendor_profiles`);

  // 2. Drop offers whose vendor no longer exists.
  const orphanOffers = await pool.query(`
    DELETE FROM offers
    WHERE vendor_id NOT IN (SELECT id FROM vendor_profiles)
  `);
  console.log(`[dedupe] dropped ${orphanOffers.rowCount} orphan offers`);

  // 3. Drop merchant users whose vendor no longer exists.
  const orphanUsers = await pool.query(`
    DELETE FROM users
    WHERE role = 'merchant'
      AND id NOT IN (SELECT user_id FROM vendor_profiles WHERE user_id IS NOT NULL)
  `);
  console.log(`[dedupe] dropped ${orphanUsers.rowCount} orphan merchant users`);

  // Report final state.
  const final = await pool.query<{ vendors: string; offers: string }>(`
    SELECT
      (SELECT COUNT(*) FROM vendor_profiles)::text AS vendors,
      (SELECT COUNT(*) FROM offers)::text AS offers
  `);
  console.log("[dedupe] final:", final.rows[0]);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
