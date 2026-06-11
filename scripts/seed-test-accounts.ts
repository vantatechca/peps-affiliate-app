// Seed/refresh the two standard test accounts used in the AFFEXCH handoff.
// Usage: npx tsx --env-file=.env scripts/seed-test-accounts.ts
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

neonConfig.webSocketConstructor = ws;

const ACCOUNTS = [
  {
    email: "admin@affiliatexchange.ca",
    password: "Affx-Admin-2026!",
    role: "admin",
    firstName: "AFFEXCH",
    lastName: "Admin",
    username: "affx_admin",
  },
  {
    email: "demo@affiliatexchange.ca",
    password: "Affx-Demo-2026!",
    role: "creator",
    firstName: "Demo",
    lastName: "Creator",
    username: "demo",
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    for (const a of ACCOUNTS) {
      const hash = await bcrypt.hash(a.password, 10);
      const existing = await pool.query(
        `SELECT id, username FROM users WHERE email=$1 LIMIT 1`,
        [a.email],
      );
      if (existing.rows.length > 0) {
        await pool.query(
          `UPDATE users
             SET password=$1, role=$2, account_status='active',
                 email_verified=true, updated_at=NOW()
           WHERE id=$3`,
          [hash, a.role, existing.rows[0].id],
        );
        console.log(
          `[seed] ${a.email} (existing) → password reset, role=${a.role}, status=active.`,
        );
      } else {
        // Pick a unique username (handle pre-existing username collision)
        let username = a.username;
        let suffix = 1;
        while (true) {
          const r = await pool.query(
            `SELECT id FROM users WHERE username=$1 LIMIT 1`,
            [username],
          );
          if (r.rows.length === 0) break;
          username = `${a.username}_${suffix++}`;
        }
        const id = randomUUID();
        await pool.query(
          `INSERT INTO users
             (id, username, email, password, role, account_status, email_verified,
              first_name, last_name, tos_accepted_at, privacy_accepted_at,
              created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, 'active', true, $6, $7, NOW(), NOW(), NOW(), NOW())`,
          [id, username, a.email, hash, a.role, a.firstName, a.lastName],
        );
        console.log(
          `[seed] ${a.email} (created) → role=${a.role}, username=${username}, id=${id}.`,
        );
      }
    }
    console.log("\nDone. Credentials:");
    for (const a of ACCOUNTS) {
      console.log(`  ${a.email}  /  ${a.password}  (${a.role})`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
