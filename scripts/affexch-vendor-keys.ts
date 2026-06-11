// AFFEXCH Phase 6 — vendor API key management
// Usage:
//   List keyed vendors:           npx tsx --env-file=.env scripts/affexch-vendor-keys.ts list
//   Issue keys for all vendors:   npx tsx --env-file=.env scripts/affexch-vendor-keys.ts issue-all
//   Issue key for one vendor:     npx tsx --env-file=.env scripts/affexch-vendor-keys.ts issue <vendor-id-or-legal-name>
//   Reveal an existing key:       npx tsx --env-file=.env scripts/affexch-vendor-keys.ts show <vendor-id>
//
// The key is stored on company_profiles.tracking_api_key. Re-issuing rotates it.

import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { randomBytes } from "crypto";

neonConfig.webSocketConstructor = ws;

function newKey(): string {
  // afx_ prefix for at-a-glance identification + 32 hex chars (16 bytes entropy) = 36 chars
  return "afx_" + randomBytes(16).toString("hex");
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set. Use --env-file=.env.");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });

  try {
    if (cmd === "list") {
      const r = await pool.query(
        `SELECT id, COALESCE(trade_name, legal_name) AS name, city, country,
                CASE WHEN tracking_api_key IS NULL THEN false ELSE true END AS has_key,
                tracking_api_key_created_at
           FROM company_profiles
           ORDER BY has_key DESC, city, name;`
      );
      console.table(r.rows);
      return;
    }

    if (cmd === "show") {
      if (!arg) { console.error("usage: show <vendor-id>"); process.exit(1); }
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(arg);
      const r = await pool.query(
        isUuid
          ? `SELECT id, COALESCE(trade_name, legal_name) AS name, tracking_api_key, tracking_api_key_created_at FROM company_profiles WHERE id = $1 LIMIT 1;`
          : `SELECT id, COALESCE(trade_name, legal_name) AS name, tracking_api_key, tracking_api_key_created_at FROM company_profiles WHERE legal_name = $1 OR trade_name = $1 LIMIT 1;`,
        [arg]
      );
      if (r.rows.length === 0) { console.error("vendor not found"); process.exit(2); }
      console.table(r.rows);
      return;
    }

    if (cmd === "issue") {
      if (!arg) { console.error("usage: issue <vendor-id-or-legal-name>"); process.exit(1); }
      const key = newKey();
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(arg);
      const r = await pool.query(
        isUuid
          ? `UPDATE company_profiles SET tracking_api_key = $1, tracking_api_key_created_at = NOW(), updated_at = NOW() WHERE id = $2 RETURNING id, COALESCE(trade_name, legal_name) AS name;`
          : `UPDATE company_profiles SET tracking_api_key = $1, tracking_api_key_created_at = NOW(), updated_at = NOW() WHERE legal_name = $2 OR trade_name = $2 RETURNING id, COALESCE(trade_name, legal_name) AS name;`,
        [key, arg]
      );
      if (r.rows.length === 0) { console.error("vendor not found"); process.exit(2); }
      console.log(`Issued key for ${r.rows[0].name} (${r.rows[0].id}):`);
      console.log(`  ${key}`);
      console.log("Store this somewhere safe — it's the only time it's shown.");
      return;
    }

    if (cmd === "issue-all") {
      // Issues a key to every approved peptide vendor that doesn't already have one.
      const r = await pool.query(
        `SELECT id, COALESCE(trade_name, legal_name) AS name FROM company_profiles
           WHERE status = 'approved' AND tracking_api_key IS NULL
             AND industry = 'Peptides & Wellness';`
      );
      console.log(`Issuing keys for ${r.rows.length} vendors...`);
      for (const v of r.rows) {
        const key = newKey();
        await pool.query(
          `UPDATE company_profiles
             SET tracking_api_key = $1, tracking_api_key_created_at = NOW(), updated_at = NOW()
             WHERE id = $2;`,
          [key, v.id]
        );
        console.log(`  ${v.name} (${v.id}) -> ${key}`);
      }
      console.log(`Done. Keys printed above — only time they're shown in plain text.`);
      return;
    }

    console.error(`unknown command: ${cmd}`);
    console.error("Available: list | show <id> | issue <id-or-name> | issue-all");
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
