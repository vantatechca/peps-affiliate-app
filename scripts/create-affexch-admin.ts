// Create an AFFEXCH admin user for testing Phase 7 admin endpoints.
// Usage: npx tsx --env-file=.env scripts/create-affexch-admin.ts <email> <password>
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

neonConfig.webSocketConstructor = ws;

async function main() {
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error("usage: create-affexch-admin.ts <email> <password>");
    process.exit(1);
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    const existing = await pool.query(`SELECT id, role FROM users WHERE email=$1 LIMIT 1`, [email]);
    if (existing.rows.length > 0) {
      const hash = await bcrypt.hash(password, 10);
      await pool.query(
        `UPDATE users SET password=$1, role='admin', account_status='active', email_verified=true, updated_at=NOW() WHERE id=$2`,
        [hash, existing.rows[0].id]
      );
      console.log(`Updated existing user ${email} → admin role + new password.`);
    } else {
      const id = randomUUID();
      const hash = await bcrypt.hash(password, 10);
      const username = email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "_");
      const now = new Date();
      await pool.query(
        `INSERT INTO users (id, username, email, password, role, account_status, email_verified, first_name, last_name, tos_accepted_at, privacy_accepted_at, created_at, updated_at)
         VALUES ($1,$2,$3,$4,'admin','active',true,'AFFEXCH','Admin', NOW(), NOW(), NOW(), NOW())`,
        [id, username, email, hash]
      );
      console.log(`Created admin user ${email} (id=${id}).`);
    }
  } finally {
    await pool.end();
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
