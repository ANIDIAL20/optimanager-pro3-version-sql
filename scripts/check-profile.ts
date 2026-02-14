import * as dotenv from 'dotenv';
import { eq } from 'drizzle-orm';

dotenv.config({ path: '.env.local' });

async function main() {
  try {
    const { db } = await import('../src/db/index');
    const { shopProfiles } = await import('../src/db/schema');
    const userId = 'd7daf565-32ff-482d-b798-63120fd75e66';
    const profile = await db
      .select()
      .from(shopProfiles)
      .where(eq(shopProfiles.userId, userId))
      .limit(1);
    
    console.log('--- SHOP PROFILE ---');
    if (profile.length > 0) {
      const p = profile[0];
      console.log('ID:', p.id);
      console.log('Shop Name:', p.shopName);
      console.log('Logo URL defined:', !!p.logoUrl);
      if (p.logoUrl) {
          console.log('Logo URL start:', p.logoUrl.substring(0, 50));
          console.log('Logo URL length:', p.logoUrl.length);
      }
      console.log('Full Profile:', JSON.stringify(p, null, 2));
    } else {
      console.log('No profile found for user');
    }
  } catch (error) {
    console.error('Error:', error);
  }
}

main();
