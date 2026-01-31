/**
 * Database Seeding Script - Admin User Setup
 * Creates or updates admin user for Google OAuth login
 * Run: npx tsx src/db/seed.ts
 */

import * as dotenv from 'dotenv';
import { db } from './index';
import { users } from './schema';
import { eq } from 'drizzle-orm';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

const ADMIN_EMAIL = 'ousayehamine3002@gmail.com';

async function seedAdminUser() {
  try {
    console.log('🌱 Starting database seeding...\n');

    // Check if user already exists
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, ADMIN_EMAIL))
      .limit(1);

    if (existingUser) {
      console.log('✅ User already exists, updating to admin...');
      
      // Update existing user to admin
      const [updatedUser] = await db
        .update(users)
        .set({
          role: 'admin',
          emailVerified: new Date(),
        })
        .where(eq(users.email, ADMIN_EMAIL))
        .returning();

      console.log('\n✅ Admin user updated successfully!');
      console.log('📧 Email:', updatedUser.email);
      console.log('👤 Name:', updatedUser.name);
      console.log('🔑 Role:', updatedUser.role);
      console.log('✉️  Email Verified:', updatedUser.emailVerified?.toISOString());
    } else {
      console.log('➕ User does not exist, creating new admin...');
      
      // Insert new admin user
      const [newUser] = await db
        .insert(users)
        .values({
          name: 'Oussama Admin',
          email: ADMIN_EMAIL,
          role: 'admin',
          emailVerified: new Date(),
          image: null,
        })
        .returning();

      console.log('\n✅ Admin user created successfully!');
      console.log('📧 Email:', newUser.email);
      console.log('👤 Name:', newUser.name);
      console.log('🔑 Role:', newUser.role);
      console.log('🆔 User ID:', newUser.id);
      console.log('✉️  Email Verified:', newUser.emailVerified?.toISOString());
    }

    console.log('\n🎉 Seeding complete! You can now log in with Google.');
    console.log('🔗 Login URL: http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }

  process.exit(0);
}

seedAdminUser();
