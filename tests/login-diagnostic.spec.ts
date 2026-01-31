import { test, expect } from '@playwright/test';
import { db } from '../src/db/index';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

test.describe('Login Diagnostic Test - Database + UI', () => {
  // Store database verification results
  let dbUser: any = null;
  let bcryptMatch: boolean = false;
  let diagnosticReport: string[] = [];

  test('Step 1: Verify Database User and Hash', async () => {
    diagnosticReport.push('='.repeat(60));
    diagnosticReport.push('🔍 DATABASE DIAGNOSTIC REPORT');
    diagnosticReport.push('='.repeat(60));

    const testEmail = 'demo@optimanager.com';
    const testPassword = '123456';

    try {
      // Query the database
      diagnosticReport.push('\n📊 Querying database for user...');
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, testEmail))
        .limit(1);

      if (!user) {
        diagnosticReport.push(`❌ ERROR: User '${testEmail}' NOT FOUND in database`);
        diagnosticReport.push('   → User needs to be created first!');
        console.log(diagnosticReport.join('\n'));
        throw new Error('User not found in database');
      }

      dbUser = user;
      diagnosticReport.push('✅ User found in database');
      diagnosticReport.push('\n📋 User Data:');
      diagnosticReport.push(`   ID:            ${user.id}`);
      diagnosticReport.push(`   Email:         ${user.email}`);
      diagnosticReport.push(`   Name:          ${user.name}`);
      diagnosticReport.push(`   Role:          ${user.role}`);
      diagnosticReport.push(`   Email Verified: ${user.emailVerified}`);
      diagnosticReport.push(`   Created:       ${user.createdAt}`);
      
      // Check password field
      if (!user.password) {
        diagnosticReport.push('\n❌ CRITICAL: Password field is NULL or empty!');
        diagnosticReport.push('   → This user cannot log in with credentials');
        console.log(diagnosticReport.join('\n'));
        throw new Error('User has no password');
      }

      diagnosticReport.push(`\n🔐 Password Hash:`);
      diagnosticReport.push(`   Full Hash:     ${user.password}`);
      diagnosticReport.push(`   Hash Length:   ${user.password.length} chars`);
      diagnosticReport.push(`   Hash Preview:  ${user.password.substring(0, 29)}...`);
      diagnosticReport.push(`   Algorithm:     ${user.password.startsWith('$2a$') ? 'bcrypt' : 'UNKNOWN'}`);

      // Verify bcrypt hash
      diagnosticReport.push(`\n🔒 Bcrypt Verification:`);
      diagnosticReport.push(`   Testing password: '${testPassword}'`);
      
      const startTime = Date.now();
      bcryptMatch = await bcrypt.compare(testPassword, user.password);
      const duration = Date.now() - startTime;
      
      diagnosticReport.push(`   Comparison time: ${duration}ms`);
      diagnosticReport.push(`   Result: ${bcryptMatch ? '✅ MATCH!' : '❌ NO MATCH'}`);

      if (!bcryptMatch) {
        diagnosticReport.push('\n❌ PROBLEM IDENTIFIED:');
        diagnosticReport.push('   The stored hash does NOT match password "123456"');
        diagnosticReport.push('   Possible causes:');
        diagnosticReport.push('   1. Password was hashed with different input');
        diagnosticReport.push('   2. Hash was corrupted during storage');
        diagnosticReport.push('   3. Wrong password being tested');
      } else {
        diagnosticReport.push('\n✅ Database hash is VALID and matches password!');
      }

      // Print report
      console.log('\n' + diagnosticReport.join('\n'));
      
      // Assertions
      expect(user).toBeTruthy();
      expect(user.password).toBeTruthy();
      expect(bcryptMatch).toBe(true);

    } catch (error) {
      diagnosticReport.push(`\n💥 ERROR: ${error.message}`);
      console.log('\n' + diagnosticReport.join('\n'));
      throw error;
    }
  });

  test('Step 2: Test UI Login Flow', async ({ page }) => {
    const uiReport: string[] = [];
    const consoleMessages: string[] = [];
    const networkRequests: { url: string; status: number; method: string }[] = [];
    const errors: string[] = [];

    uiReport.push('\n' + '='.repeat(60));
    uiReport.push('🖥️  UI LOGIN DIAGNOSTIC');
    uiReport.push('='.repeat(60));

    // Capture console messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(`[${msg.type()}] ${text}`);
      
      // Log important auth messages immediately
      if (text.includes('AUTHORIZE') || text.includes('Session') || text.includes('Auth')) {
        console.log(`🔔 [Console] ${text}`);
      }
    });

    // Capture network requests
    page.on('response', async (response) => {
      const url = response.url();
      if (url.includes('/api/auth')) {
        networkRequests.push({
          url: url,
          status: response.status(),
          method: response.request().method(),
        });
        console.log(`🌐 [Network] ${response.request().method()} ${url} → ${response.status()}`);
      }
    });

    // Capture errors
    page.on('pageerror', (error) => {
      errors.push(error.message);
      console.log(`❌ [Page Error] ${error.message}`);
    });

    try {
      // Navigate to login
      uiReport.push('\n📍 Step 1: Navigating to /login');
      await page.goto('http://localhost:3000/login');
      await page.waitForLoadState('networkidle');
      uiReport.push('   ✓ On login page');

      // Fill credentials
      uiReport.push('\n📝 Step 2: Filling credentials');
      await page.fill('input[name="email"]', 'demo@optimanager.com');
      await page.fill('input[name="password"]', '123456');
      uiReport.push('   ✓ Credentials filled');

      // Click login
      uiReport.push('\n🔘 Step 3: Clicking login button');
      const loginButton = page.locator('button[type="submit"]');
      await loginButton.click();
      uiReport.push('   ✓ Login button clicked');

      // Wait and observe
      uiReport.push('\n⏳ Step 4: Waiting for navigation...');
      await page.waitForTimeout(3000);

      const finalUrl = page.url();
      uiReport.push(`   Final URL: ${finalUrl}`);

      // Analyze result
      const isOnDashboard = finalUrl.includes('/dashboard');
      const isOnLogin = finalUrl.includes('/login');

      uiReport.push('\n📊 RESULT:');
      if (isOnDashboard) {
        uiReport.push('   ✅ SUCCESS: Redirected to dashboard!');
      } else if (isOnLogin) {
        uiReport.push('   ❌ FAILED: Still on login page (redirect loop)');
      } else {
        uiReport.push(`   ⚠️  UNEXPECTED: On ${finalUrl}`);
      }

      // Print network summary
      uiReport.push('\n🌐 Network Requests:');
      networkRequests.forEach(req => {
        uiReport.push(`   ${req.method} ${req.url.split('?')[0]} → ${req.status}`);
      });

      // Print relevant console logs
      const authLogs = consoleMessages.filter(msg => 
        msg.includes('AUTHORIZE') || 
        msg.includes('Session') || 
        msg.includes('Auth') ||
        msg.includes('getCurrentUser')
      );
      
      if (authLogs.length > 0) {
        uiReport.push('\n💬 Auth Console Logs:');
        authLogs.forEach(log => {
          uiReport.push(`   ${log}`);
        });
      }

      // Print errors
      if (errors.length > 0) {
        uiReport.push('\n❌ JavaScript Errors:');
        errors.forEach(err => {
          uiReport.push(`   ${err}`);
        });
      }

      // Final diagnostic comparison
      uiReport.push('\n' + '='.repeat(60));
      uiReport.push('🔬 DIAGNOSTIC SUMMARY');
      uiReport.push('='.repeat(60));
      uiReport.push(`Database Hash Valid: ${bcryptMatch ? '✅ YES' : '❌ NO'}`);
      uiReport.push(`UI Login Success:    ${isOnDashboard ? '✅ YES' : '❌ NO'}`);
      
      if (bcryptMatch && !isOnDashboard) {
        uiReport.push('\n⚠️  DIAGNOSIS:');
        uiReport.push('   Database hash is CORRECT, but UI login FAILED');
        uiReport.push('   → Issue is in the authentication flow, not the password');
        uiReport.push('   → Check server-side auth logs above');
      } else if (!bcryptMatch) {
        uiReport.push('\n⚠️  DIAGNOSIS:');
        uiReport.push('   Database hash does NOT match password');
        uiReport.push('   → Need to recreate user with correct hash');
      }

      // Print full report
      console.log('\n' + uiReport.join('\n'));

      // Assertion
      expect(isOnDashboard).toBe(true);

    } catch (error) {
      console.log('\n' + uiReport.join('\n'));
      throw error;
    }
  });
});
