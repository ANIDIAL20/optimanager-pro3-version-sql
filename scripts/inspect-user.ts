
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

async function main() {
  console.log('🔍 Inspecting Users...');
  try {
    const allUsers = await db.select().from(users);
    allUsers.forEach(u => {
      console.log(`- [${u.id}] ${u.name} (${u.email}) Role: ${u.role}`);
    });
  } catch (error) {
    console.error('❌ Error fetching users:', error);
  }
}

main();
