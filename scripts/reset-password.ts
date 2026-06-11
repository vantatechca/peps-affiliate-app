/* One-shot password reset against the live DATABASE_URL.
   Usage: tsx --env-file=.env scripts/reset-password.ts <email> <newPassword>
   Hashes with bcrypt (rounds 10) and updates the users row in place. */
import 'dotenv/config';
import bcrypt from 'bcrypt';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const email = process.argv[2];
  const newPassword = process.argv[3];
  if (!email || !newPassword) {
    console.error('Usage: tsx scripts/reset-password.ts <email> <newPassword>');
    process.exit(1);
  }

  const existing = await db.select({ id: users.id, email: users.email })
    .from(users).where(eq(users.email, email)).limit(1);

  if (existing.length === 0) {
    console.error(`[reset] no user found with email ${email}`);
    process.exit(2);
  }

  const hash = await bcrypt.hash(newPassword, 10);
  await db.update(users)
    .set({ password: hash, updatedAt: new Date() })
    .where(eq(users.id, existing[0].id));

  console.log(`[reset] ✓ password updated for ${email} (id ${existing[0].id})`);
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
