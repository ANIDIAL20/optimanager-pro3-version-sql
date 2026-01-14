/**
 * Create Initial Admin User
 * Run this script to create your first admin user
 * 
 * Usage: tsx scripts/create-admin-user.ts
 */

import { db } from '../src/db';
import { users } from '../src/db/schema';
import bcrypt from 'bcryptjs';
import { eq } from 'drizzle-orm';

async function createAdminUser() {
  console.log('🔐 Creating admin user...\n');

  // Configuration - CHANGE THESE VALUES
  const adminData = {
    name: 'Admin OptiManager',
    email: 'admin@optimanager.com',
    password: 'admin123456', // ⚠️ CHANGE THIS!
    role: 'admin' as const,
  };

  try {
    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, adminData.email),
    });

    if (existingUser) {
      console.log('❌ User already exists with email:', adminData.email);
      console.log('User ID:', existingUser.id);
      process.exit(1);
    }

    // Hash password
    console.log('🔒 Hashing password...');
    const hashedPassword = await bcrypt.hash(adminData.password, 10);

    // Create user
    console.log('💾 Creating user in database...');
    const [newUser] = await db.insert(users).values({
      name: adminData.name,
      email: adminData.email,
      password: hashedPassword,
      role: adminData.role,
      emailVerified: new Date(), // Auto-verify admin users
    }).returning();

    console.log('\n✅ Admin user created successfully!');
    console.log('─────────────────────────────────────');
    console.log('User ID:', newUser.id);
    console.log('Name:', newUser.name);
    console.log('Email:', newUser.email);
    console.log('Role:', newUser.role);
    console.log('─────────────────────────────────────');
    console.log('\n🔑 Login credentials:');
    console.log('Email:', adminData.email);
    console.log('Password:', adminData.password);
    console.log('\n⚠️  IMPORTANT: Change your password after first login!');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();
