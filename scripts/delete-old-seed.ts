// AFFEXCH — remove the original [affexch-seed]-marked merchants.
// Deletes the stub users — cascade through vendor_profiles → offers takes
// care of the dependent rows.

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
  console.log("[delete-old-seed] before:", before.rows[0]);

  // Collect the stub user IDs that own the seeded vendors.
  const { rows: ids } = await pool.query<{ user_id: string }>(`
    SELECT user_id FROM vendor_profiles WHERE legal_name LIKE '%[affexch-seed]%'
  `);
  console.log(`[delete-old-seed] removing ${ids.length} stub users (cascades to vendors + offers)`);

  if (ids.length === 0) {
    console.log("[delete-old-seed] nothing to remove");
    await pool.end();
    return;
  }

  // One bulk DELETE — Postgres resolves the subquery before the cascade,
  // so this safely removes the users referenced by [affexch-seed] vendors.
  // FK ON DELETE CASCADE then drops vendor_profiles → offers.
  const res = await pool.query(`
    DELETE FROM users
    WHERE id IN (
      SELECT user_id FROM vendor_profiles WHERE legal_name LIKE '%[affexch-seed]%'
    )
  `);
  console.log(`[delete-old-seed] deleted users rows: ${res.rowCount}`);

  const after = await pool.query<{ vendors: string; offers: string }>(`
    SELECT
      (SELECT COUNT(*) FROM vendor_profiles)::text AS vendors,
      (SELECT COUNT(*) FROM offers)::text AS offers
  `);
  console.log("[delete-old-seed] after:", after.rows[0]);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
