import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

async function main() {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  // Inspect FK constraints from vendor_profiles → users
  const { rows: vp } = await pool.query(`
    SELECT conname, confdeltype
    FROM pg_constraint
    WHERE conrelid = 'vendor_profiles'::regclass AND contype = 'f'
  `);
  console.log("vendor_profiles FK constraints:", vp);

  // Inspect FK constraints from offers → vendor_profiles
  const { rows: of } = await pool.query(`
    SELECT conname, confdeltype
    FROM pg_constraint
    WHERE conrelid = 'offers'::regclass AND contype = 'f'
  `);
  console.log("offers FK constraints:", of);

  // Count orphan vendor_profiles (no matching user)
  const { rows: orphans } = await pool.query(`
    SELECT COUNT(*) FROM vendor_profiles vp
    LEFT JOIN users u ON u.id = vp.user_id
    WHERE u.id IS NULL
  `);
  console.log("orphan vendor_profiles (no user):", orphans[0].count);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
