import { db } from '../server/db';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

async function checkUsers() {
  try {
    console.log('Checking user authentication methods...\n');

    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      username: users.username,
      role: users.role,
      googleId: users.googleId,
      hasPassword: users.password,
    }).from(users).limit(10);

    console.log('Sample users:');
    console.log('='.repeat(80));

    for (const user of allUsers) {
      const authMethod = user.googleId ? '🔵 Google OAuth' : (user.hasPassword ? '🔑 Email/Password' : '\u274C No Auth');
      console.log(`${authMethod} | ${user.role?.padEnd(8)} | ${user.email}`);
    }

    console.log('='.repeat(80));
    console.log('\nLegend:');
    console.log('🔵 Google OAuth users - Password change NOT visible (correct)');
    console.log('🔑 Email/Password users - Password change SHOULD be visible');
    console.log('\u274C No Auth - Invalid state\n');

    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkUsers();
