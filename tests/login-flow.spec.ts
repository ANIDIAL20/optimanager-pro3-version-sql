import { test, expect } from '@playwright/test';

test.describe('Login Flow - Debug Login Loop', () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear all cookies and storage before each test
    await context.clearCookies();
    await page.goto('http://localhost:3000');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('should login successfully and redirect to dashboard without loop', async ({ page }) => {
    const navigationEvents: string[] = [];
    const consoleMessages: string[] = [];
    const errors: string[] = [];

    // Track all navigation events
    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        navigationEvents.push(`Navigation: ${url}`);
        console.log(`📍 Navigated to: ${url}`);
      }
    });

    // Track console messages
    page.on('console', (msg) => {
      const text = msg.text();
      consoleMessages.push(text);
      console.log(`💬 Console [${msg.type()}]:`, text);
    });

    // Track errors
    page.on('pageerror', (error) => {
      errors.push(error.message);
      console.log(`❌ Page Error:`, error.message);
    });

    // Step 1: Navigate to login page
    console.log('\n🔵 Step 1: Navigating to /login');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    
    // Verify we're on login page
    await expect(page).toHaveURL(/\/login/);
    console.log('✅ On login page');

    // Step 2: Fill in credentials
    console.log('\n🔵 Step 2: Filling credentials');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    console.log('✅ Credentials filled');

    // Step 3: Click login button
    console.log('\n🔵 Step 3: Clicking login button');
    const loginButton = page.locator('button[type="submit"]');
    await expect(loginButton).toBeVisible();
    
    // Wait for navigation after clicking login
    const navigationPromise = page.waitForURL('**/dashboard*', { timeout: 10000 });
    await loginButton.click();
    console.log('✅ Login button clicked');

    // Step 4: Wait for navigation and check URL
    console.log('\n🔵 Step 4: Waiting for navigation...');
    try {
      await navigationPromise;
      console.log('✅ Navigation completed');
    } catch (error) {
      console.log('⚠️ Navigation timeout - current URL:', page.url());
    }

    // Wait a bit more to see if there's a redirect loop
    await page.waitForTimeout(2000);
    
    const currentUrl = page.url();
    console.log('\n📊 Final URL:', currentUrl);

    // Step 5: Assertions
    console.log('\n🔵 Step 5: Running assertions');
    
    // Check if we're on dashboard
    const isDashboard = currentUrl.includes('/dashboard');
    const isLoginLoop = currentUrl.includes('/login');

    if (isLoginLoop) {
      console.log('❌ FAILED: Redirected back to login (login loop detected)');
      console.log('\n📋 Navigation History:', navigationEvents);
      console.log('\n💬 Console Messages:', consoleMessages.slice(-20)); // Last 20 messages
      console.log('\n❌ Errors:', errors);
      
      // Check for specific console patterns
      const sessionLogs = consoleMessages.filter(msg => 
        msg.includes('Session') || msg.includes('session') || 
        msg.includes('auth') || msg.includes('Auth')
      );
      console.log('\n🔍 Session-related logs:', sessionLogs);
    }

    // Primary assertion
    expect(currentUrl).toContain('/dashboard');
    expect(currentUrl).not.toContain('/login');
    
    // Verify dashboard rendered
    await expect(page.locator('text=Dashboard')).toBeVisible({ timeout: 5000 });
    console.log('✅ Dashboard is visible');

    // Check for auth session cookie
    const cookies = await page.context().cookies();
    const authCookie = cookies.find(c => 
      c.name.includes('session') || 
      c.name.includes('auth') ||
      c.name.includes('next-auth')
    );
    console.log('\n🍪 Auth Cookie:', authCookie ? authCookie.name : 'NOT FOUND');

    // Final report
    console.log('\n📊 Test Summary:');
    console.log('- Navigation events:', navigationEvents.length);
    console.log('- Console messages:', consoleMessages.length);
    console.log('- Errors:', errors.length);
    console.log('- Final URL:', currentUrl);
    console.log('- Auth cookie present:', !!authCookie);
  });

  test('should detect redirect loop pattern', async ({ page }) => {
    let redirectCount = 0;
    const maxRedirects = 5;
    const urls: string[] = [];

    page.on('framenavigated', (frame) => {
      if (frame === page.mainFrame()) {
        const url = frame.url();
        urls.push(url);
        
        // Check for loop pattern: /dashboard -> /login -> /dashboard
        if (urls.length >= 3) {
          const last3 = urls.slice(-3);
          const hasDashboard = last3.some(u => u.includes('/dashboard'));
          const hasLogin = last3.some(u => u.includes('/login'));
          
          if (hasDashboard && hasLogin) {
            redirectCount++;
            console.log(`🔄 Redirect loop detected! Count: ${redirectCount}`);
            console.log('Last 3 URLs:', last3);
          }
        }

        if (redirectCount >= maxRedirects) {
          console.log('❌ CRITICAL: Multiple redirect loops detected!');
          console.log('Full navigation history:', urls);
          throw new Error(`Redirect loop detected: ${redirectCount} loops`);
        }
      }
    });

    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Wait and check
    await page.waitForTimeout(5000);
    
    expect(redirectCount).toBe(0);
    expect(page.url()).toContain('/dashboard');
  });
});
