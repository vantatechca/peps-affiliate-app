import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
async function main() {
  neonConfig.webSocketConstructor = ws;
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  for (const t of ["applications", "analytics"]) {
    try {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS c FROM ${t}`);
      console.log(`${t}: ${rows[0].c} rows`);
    } catch (e: any) {
      console.log(`${t}: ERR ${e?.message}`);
    }
  }
  await pool.end();
}
main().catch(e => { console.error(e); process.exit(1); });
