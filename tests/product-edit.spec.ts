import { test, expect } from '@playwright/test';
import { db } from '../src/db/index';
import { products, users, brands, categories } from '../src/db/schema';
import { eq, and } from 'drizzle-orm';

const TEST_REF = 'TEST-EDIT-REF';
const TEST_BRAND_NAME = 'BrandForTest';
const TEST_CAT_NAME = 'CatForTest';

test.describe('Product Edit Flow', () => {
  let userId: string;
  let brandId: number;
  let catId: number;
  let productId: number;

  test.beforeAll(async () => {
    // 1. Get User
    const [user] = await db.select().from(users).where(eq(users.email, 'demo@optimanager.com')).limit(1);
    // If running in CI/Test env, ensure user exists or create one. Assuming demo exists.
    if (!user) {
        // Fallback: Create demo user if not exists (for robustness)
        const [u] = await db.insert(users).values({
            email: 'demo@optimanager.com',
            password: 'hashed_password_here', // Ideally verify bcrypt
            role: 'ADMIN',
            isActive: true
        }).returning();
        userId = u.id;
    } else {
        userId = user.id;
    }

    // 2. Clean up previous test data
    await db.delete(products).where(eq(products.reference, TEST_REF));
    // Also clean up brands/categories if unique constraint? Actually name is not unique in schema but practical unique.
    // Let's delete by name for cleanup.
    await db.delete(brands).where(and(eq(brands.name, TEST_BRAND_NAME), eq(brands.userId, userId)));
    await db.delete(categories).where(and(eq(categories.name, TEST_CAT_NAME), eq(categories.userId, userId)));

    // 3. Create Brand
    const [brand] = await db.insert(brands).values({
        userId,
        name: TEST_BRAND_NAME,
        active: true
    }).returning();
    brandId = brand.id;

    // 4. Create Category
    const [cat] = await db.insert(categories).values({
        userId,
        name: TEST_CAT_NAME,
        active: true
    }).returning();
    catId = cat.id;

    // 5. Create Product
    const [product] = await db.insert(products).values({
        userId,
        nom: 'Original Product Name',
        reference: TEST_REF,
        marque: TEST_BRAND_NAME,
        categorie: TEST_CAT_NAME, // Schema stores Name
        prixVente: "150.00",
        quantiteStock: 10,
        isActive: true,
        version: 0
    }).returning();
    productId = product.id;
    
    console.log(`Test Product Created: ID=${productId}, Ref=${TEST_REF}`);
  });

  test('Should edit product details successfully', async ({ page }) => {
    // 1. Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'demo@optimanager.com');
    await page.fill('input[name="password"]', '123456');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');

    // 2. Go to Product Details
    await page.goto(`http://localhost:3000/produits/${productId}`);
    
    // Check initial state
    await expect(page.locator('h1')).toContainText('Original Product Name');
    
    // 3. Click Edit
    // There needs to be a link. Let's find by href or icon.
    // Assuming the "Modifier" button directs to `/produits/[id]/edit`
    // Wait for the button to appear
    const editLink = page.locator(`a[href="/produits/${productId}/edit"]`);
    await expect(editLink).toBeVisible();
    await editLink.click();
    
    // 4. Verify Form Pre-fill
    await expect(page).toHaveURL(/\/edit/);
    
    // Check Name input
    const nameInput = page.locator('input[name="items.0.nomProduit"]');
    await expect(nameInput).toHaveValue('Original Product Name');
    
    // Check Reference
    await expect(page.locator('input[name="items.0.reference"]')).toHaveValue(TEST_REF);
    
    // 5. Modify Product
    const newName = 'Modified Product Name';
    await nameInput.fill(newName);
    
    const priceInput = page.locator('input[name="items.0.prixVente"]');
    await priceInput.fill('200');

    // 6. Submit
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();
    
    // 7. Verify Redirect and Update
    await page.waitForURL(`http://localhost:3000/produits/${productId}`);
    await expect(page.locator('h1')).toContainText(newName);
    
    // 8. Verify DB update via API/direct DB
    const [updatedProduct] = await db.select().from(products).where(eq(products.id, productId));
    expect(updatedProduct.nom).toBe(newName);
    expect(Number(updatedProduct.prixVente)).toBe(200);
  });
});
