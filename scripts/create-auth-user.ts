/**
 * Migrate existing Firebase user to Auth.js
 * Run this once to create your initial user in the Auth.js users table
 */

import { db } from '../src/db';
import { users } from '../src/db/schema';
import bcrypt from 'bcryptjs';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function migrateUser() {
  try {
    // Replace with your actual email
    const email = process.env.ADMIN_EMAIL || 'your-email@example.com';
    const password = process.env.ADMIN_PASSWORD || 'changeme123';
    const name = 'Admin User';

    console.log('🔄 Creating Auth.js user...');

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user in Auth.js users table
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name,
        password: hashedPassword,
        role: 'admin',
        emailVerified: new Date(),
      })
      .returning();

    console.log('✅ User created successfully!');
    console.log('📧 Email:', newUser.email);
    console.log('🔑 User ID:', newUser.id);
    console.log('\n🎉 You can now log in with:');
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log('\n⚠️  Remember to change your password after first login!');

  } catch (error: any) {
    if (error.code === '23505') {
      console.log('⚠️  User already exists in the database.');
    } else {
      console.error('❌ Error creating user:', error);
    }
  }

  process.exit(0);
}

migrateUser();
