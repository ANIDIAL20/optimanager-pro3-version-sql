import { test, expect } from '@playwright/test';

test.describe('OptiManager Pro 3 - Regression Suite', () => {
  const loginEmail = 'demo@optimanager.com';
  const loginPassword = '123456';

  test.beforeEach(async ({ page }) => {
    // 1. Login
    await page.goto('/login');
    // Using IDs as seen in login-client.tsx
    await page.fill('#email', loginEmail);
    await page.fill('#password', loginPassword);
    // Explicitly target the submit button
    await page.click('button[type="submit"]');
    
    // Wait for navigation - use state for robustness
    await page.waitForURL('**/dashboard', { timeout: 30000 });
  });

  test('Regression Phase 1: POS Sales Flow', async ({ page }) => {
    // Navigate to New Sale page
    await page.goto('/dashboard/ventes/new');
    
    // The "Chargement..." indicator should disappear
    await expect(page.locator('text=Chargement...')).not.toBeVisible({ timeout: 15000 });

    // 1. Select a Client
    const clientSelector = page.locator('input[placeholder*="Rechercher client"]');
    await clientSelector.click();
    await clientSelector.fill('demo'); // Trigger search
    
    // Wait for the dropdown option to appear and click it
    const clientOption = page.locator('button:has-text("demo")').first();
    await clientOption.waitFor({ state: 'visible' });
    await clientOption.click();

    // Small delay to ensure client selection is processed
    await page.waitForTimeout(1000);

    // 2. Add Product to Cart
    // Clear and fill the product search field specifically
    const productSearch = page.locator('input[placeholder*="Rechercher un produit"]');
    await productSearch.click();
    await productSearch.fill('Verre');
    
    // Wait for the specific product "Ajouter" button
    const addBtn = page.locator('div:has-text("Verre")').locator('..').locator('button:has-text("Ajouter")').first();
    await addBtn.waitFor({ state: 'visible' });
    await addBtn.click();

    // 3. Verify Cart Update
    const badge = page.locator('span.bg-secondary:has-text("articles")');
    await expect(badge).not.toHaveText('0 articles');

    // 4. Validate Sale
    const validateBtn = page.locator('button:has-text("Valider la Vente")');
    await validateBtn.click();

    // 5. Check Success - Should redirect to a sale details page with ID
    await page.waitForURL(/.*dashboard\/ventes\/\d+/, { timeout: 20000 });
    await expect(page).toHaveURL(/.*dashboard\/ventes\/\d+/);
  });

  test('Regression Phase 2: Notifications UI', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Locate the notification bell based on NotificationsPopover.tsx
    // It's a Button with visibility:relative and Bell icon
    const bellButton = page.locator('button:has(.lucide-bell)');
    await bellButton.click();

    // The PopoverContent should appear
    const popover = page.locator('div[role="dialog"]'); // Radix Popover uses role="dialog" or similar
    await expect(popover).toBeVisible();
    await expect(popover).toContainText('Notifications');
  });

  test('Regression Phase 3: Reservations Mock Flow', async ({ page }) => {
    // Verify the cron endpoint responds correctly
    const response = await page.request.get('/api/cron/expire-reservations');
    expect(response.status()).toBe(200);
    const result = await response.json();
    expect(result).toHaveProperty('success', true);
  });
});
