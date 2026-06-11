// Verify AFFEXCH Phase 3 — inspect the test affiliate's user/profile/promo-code rows
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const email = 'phase3-tester-1@affexch-test.local';

  const userRow = await pool.query(
    `SELECT id, username, email, first_name, last_name, password, role, account_status, email_verified
       FROM users WHERE email = $1;`,
    [email]
  );
  console.log('users row:');
  console.table(userRow.rows);

  if (userRow.rows.length === 0) { await pool.end(); return; }
  const userId = userRow.rows[0].id;

  const profileRow = await pool.query(
    `SELECT user_id, bio, phone, city, affiliate_tier, instagram_url, youtube_url,
            instagram_followers, niches
       FROM creator_profiles WHERE user_id = $1;`,
    [userId]
  );
  console.log('\ncreator_profiles row:');
  console.table(profileRow.rows);

  const codeRow = await pool.query(
    `SELECT id, code, status, creator_id, application_id, created_at
       FROM promo_codes WHERE creator_id = $1;`,
    [userId]
  );
  console.log('\npromo_codes row:');
  console.table(codeRow.rows);

  await pool.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
