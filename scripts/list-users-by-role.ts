import 'dotenv/config';
import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function main() {
  const roles = ['admin', 'creator', 'company'] as const;
  for (const role of roles) {
    const rows = await db.select({
      id: users.id,
      email: users.email,
      username: users.username,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users).where(eq(users.role, role));
    console.log(`\n=== role: ${role} (${rows.length}) ===`);
    console.table(rows);
  }
  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });
