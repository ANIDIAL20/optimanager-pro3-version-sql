import { db } from '../src/db/index';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

async function diagnoseLogin() {
  console.log('\n' + '='.repeat(70));
  console.log('🔍 LOGIN DIAGNOSTIC TOOL');
  console.log('='.repeat(70));

  const testEmail = 'demo@optimanager.com';
  const testPassword = '123456';

  try {
    // Step 1: Query database
    console.log('\n📊 Step 1: Checking database...');
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, testEmail))
      .limit(1);

    if (!user) {
      console.log('❌ ERROR: User not found in database');
      console.log(`   Email searched: ${testEmail}`);
      console.log('\n💡 Solution: Run this command to create the user:');
      console.log('   npx tsx scripts/create-test-user.ts');
      process.exit(1);
    }

    console.log('✅ User found in database');
    console.log(`   ID:    ${user.id}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   Name:  ${user.name}`);
    console.log(`   Role:  ${user.role}`);

    // Step 2: Check password field
    console.log('\n🔐 Step 2: Checking password hash...');
    if (!user.password) {
      console.log('❌ ERROR: User has no password (NULL)');
      console.log('   This user cannot log in with credentials');
      console.log('\n💡 Solution: Recreate the user with a password:');
      console.log('   npx tsx scripts/create-test-user.ts');
      process.exit(1);
    }

    console.log('✅ Password hash exists');
    console.log(`   Hash length: ${user.password.length} chars`);
    console.log(`   Hash preview: ${user.password.substring(0, 29)}...`);
    console.log(`   Algorithm: ${user.password.startsWith('$2a$') || user.password.startsWith('$2b$') ? 'bcrypt ✅' : 'UNKNOWN ❌'}`);

    // Step 3: Verify bcrypt
    console.log('\n🔒 Step 3: Testing password with bcrypt...');
    console.log(`   Password to test: "${testPassword}"`);
    
    const startTime = Date.now();
    const isMatch = await bcrypt.compare(testPassword, user.password);
    const duration = Date.now() - startTime;
    
    console.log(`   Comparison time: ${duration}ms`);
    console.log(`   Result: ${isMatch ? '✅ MATCH!' : '❌ NO MATCH'}`);

    if (!isMatch) {
      console.log('\n❌ PROBLEM IDENTIFIED: PASSWORD MISMATCH');
      console.log('   The stored hash does NOT match password "123456"');
      console.log('\n   Possible causes:');
      console.log('   1. User was created with a different password');
      console.log('   2. Hash was corrupted');
      console.log('   3. Wrong bcrypt algorithm/rounds used');
      console.log('\n💡 Solution: Recreate user with correct password:');
      console.log('   npx tsx scripts/create-test-user.ts');
      process.exit(1);
    }

    // Success!
    console.log('\n✅ DATABASE VERIFICATION PASSED!');
    console.log('   • User exists');
    console.log('   • Password hash is valid');
    console.log('   • bcrypt.compare returns TRUE');
    console.log('\n📝 Credentials for testing:');
    console.log(`   Email:    ${testEmail}`);
    console.log(`   Password: ${testPassword}`);
    console.log('\n💡 Next step: Try logging in via the UI');
    console.log('   URL: http://localhost:3000/login');
    console.log('\n   If login still fails, the issue is in:');
    console.log('   • Session management (auth.ts)');
    console.log('   • Middleware (auth.config.ts)');
    console.log('   • Or JWT strategy configuration');
    
    console.log('\n' + '='.repeat(70));
    
  } catch (error) {
    console.error('\n💥 ERROR:', error.message);
    console.error('\nStack trace:', error.stack);
    process.exit(1);
  }
  
  process.exit(0);
}

diagnoseLogin();
