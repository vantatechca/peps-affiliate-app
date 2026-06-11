/* Quick login diagnostic: checks DB connection and looks up the user
   identified by the email passed as the first CLI arg.
   Run: npm run diag:user -- admin@affiliatexchange.ca
*/
import 'dotenv/config';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq, ilike } from 'drizzle-orm';

async function main() {
  const target = process.argv[2];
  if (!target) {
    console.error('Usage: tsx scripts/diag-user.ts <email>');
    process.exit(1);
  }

  console.log(`[diag] DB host: ${(process.env.DATABASE_URL || '').replace(/^.*@/, '').split('/')[0] || 'unknown'}`);
  console.log(`[diag] looking up: ${target}`);

  // Exact match
  const exact = await db.select({
    id: users.id,
    email: users.email,
    username: users.username,
    role: users.role,
    hasPassword: users.password,
    twoFactorEnabled: users.twoFactorEnabled,
    createdAt: users.createdAt,
  }).from(users).where(eq(users.email, target)).limit(1);

  if (exact.length === 0) {
    console.log('[diag] no exact match. Trying case-insensitive...');
    const ci = await db.select({
      id: users.id,
      email: users.email,
      username: users.username,
      role: users.role,
    }).from(users).where(ilike(users.email, target)).limit(5);
    console.log('[diag] case-insensitive matches:', ci);

    console.log('[diag] first 10 user emails in DB:');
    const some = await db.select({
      email: users.email,
      username: users.username,
      role: users.role,
    }).from(users).limit(10);
    console.table(some);

    const total = await db.select({ id: users.id }).from(users);
    console.log(`[diag] total users in DB: ${total.length}`);
  } else {
    const u = exact[0];
    console.log('[diag] FOUND:');
    console.table([{
      id: u.id,
      email: u.email,
      username: u.username,
      role: u.role,
      passwordSet: !!u.hasPassword,
      passwordLen: u.hasPassword ? (u.hasPassword as string).length : 0,
      passwordPrefix: u.hasPassword ? (u.hasPassword as string).slice(0, 7) : null,
      twoFactorEnabled: u.twoFactorEnabled,
      createdAt: u.createdAt,
    }]);
    if (!u.hasPassword) {
      console.log('[diag] ⚠️  This user has NO password set (likely Google OAuth only).');
    } else if (!String(u.hasPassword).startsWith('$2')) {
      console.log('[diag] ⚠️  Password does not look bcrypt-hashed (starts with):', String(u.hasPassword).slice(0, 7));
    } else {
      console.log('[diag] ✓ password is bcrypt-hashed.');
    }
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
