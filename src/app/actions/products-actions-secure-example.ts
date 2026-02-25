// @ts-nocheck
/**
 * EXAMPLE: Secured Products Actions for Neon Database
 * This shows how to update server actions with the new security system
 */

'use server';

import { db } from '@/db';
import { products } from '@/db/schema';
import { eq, and, like, or } from 'drizzle-orm';
import { secureAction, secureActionWithResponse } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';

/**
 * Get all products for the authenticated user
 * ✅ SECURED - Only returns user's products
 */
export const getProducts = secureAction(async (userId, user) => {
  try {
    const userProducts = await db
      .select()
      .from(products)
      .where(eq(products.userId, userId)) // ⚠️ CRITICAL: Filter by userId
      .orderBy(products.createdAt);
    
    await logSuccess(userId, 'READ', 'products', undefined, { count: userProducts.length });
    
    return userProducts;
  } catch (error: any) {
    await logFailure(userId, 'READ', 'products', error.message);
    throw error;
  }
});

/**
 * Get a single product by ID
 * ✅ SECURED - Verifies ownership
 */
export const getProduct = secureAction(async (userId, user, productId: number) => {
  try {
    const product = await db
      .select()
      .from(products)
      .where(and(
        eq(products.id, productId),
        eq(products.userId, userId) // ⚠️ CRITICAL: Verify ownership
      ))
      .limit(1);
    
    if (product.length === 0) {
      throw new Error('Product not found or access denied');
    }
    
    await logSuccess(userId, 'READ', 'products', productId);
    
    return product[0];
  } catch (error: any) {
    await logFailure(userId, 'READ', 'products', error.message, productId);
    throw error;
  }
});

/**
 * Create a new product
 * ✅ SECURED - Automatically assigns to user
 */
export const createProduct = secureActionWithResponse(async (userId, user, data: {
  nom: string;
  reference?: string;
  prixVente: number;
  prixAchat?: number;
  quantiteStock?: number;
  categorie?: string;
  marque?: string;
}) => {
  const productData = {
    ...data,
    userId, // ⚠️ CRITICAL: Set userId
    prixVente: data.prixVente.toString(),
    prixAchat: data.prixAchat?.toString() || null,
    quantiteStock: data.quantiteStock || 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  const result = await db.insert(products).values(productData).returning();
  
  await logSuccess(userId, 'CREATE', 'products', result[0].id);
  
  return result[0];
});

/**
 * Update a product
 * ✅ SECURED - Verifies ownership before updating
 */
export const updateProduct = secureActionWithResponse(async (userId, user, productId: number, data: Partial<{
  nom: string;
  reference: string;
  prixVente: number;
  prixAchat: number;
  quantiteStock: number;
  categorie: string;
  marque: string;
  isActive: boolean;
}>) => {
  // Verify ownership first
  const existing = await db
    .select()
    .from(products)
    .where(and(
      eq(products.id, productId),
      eq(products.userId, userId) // ⚠️ CRITICAL: Verify ownership
    ))
    .limit(1);
  
  if (existing.length === 0) {
    throw new Error('Product not found or access denied');
  }
  
  // Update the product
  const updateData = {
    ...data,
    prixVente: data.prixVente?.toString(),
    prixAchat: data.prixAchat?.toString(),
    updatedAt: new Date(),
  };
  
  const result = await db
    .update(products)
    .set(updateData)
    .where(eq(products.id, productId))
    .returning();
  
  await logSuccess(userId, 'UPDATE', 'products', productId);
  
  return result[0];
});

/**
 * Delete a product
 * ✅ SECURED - Verifies ownership before deleting
 */
export const deleteProduct = secureActionWithResponse(async (userId, user, productId: number) => {
  // Verify ownership first
  const existing = await db
    .select()
    .from(products)
    .where(and(
      eq(products.id, productId),
      eq(products.userId, userId) // ⚠️ CRITICAL: Verify ownership
    ))
    .limit(1);
  
  if (existing.length === 0) {
    throw new Error('Product not found or access denied');
  }
  
  // Delete the product
  await db
    .delete(products)
    .where(eq(products.id, productId));
  
  await logSuccess(userId, 'DELETE', 'products', productId);
  
  return { success: true };
});

/**
 * Search products
 * ✅ SECURED - Only searches user's products
 */
export const searchProducts = secureAction(async (userId, user, searchTerm: string) => {
  const results = await db
    .select()
    .from(products)
    .where(and(
      eq(products.userId, userId), // ⚠️ CRITICAL: Filter by userId
      or(
        like(products.nom, `%${searchTerm}%`),
        like(products.reference, `%${searchTerm}%`)
      )
    ));
  
  await logSuccess(userId, 'SEARCH', 'products', undefined, { searchTerm, resultCount: results.length });
  
  return results;
});

/**
 * Get low stock products
 * ✅ SECURED - Only user's products
 */
export const getLowStockProducts = secureAction(async (userId, user) => {
  const lowStock = await db
    .select()
    .from(products)
    .where(and(
      eq(products.userId, userId), // ⚠️ CRITICAL: Filter by userId
      eq(products.isActive, true)
    ))
    .orderBy(products.quantiteStock);
  
  // Filter in memory for products below threshold
  const filtered = lowStock.filter(p => (p.quantiteStock || 0) <= (p.seuilAlerte || 5));
  
  await logSuccess(userId, 'READ', 'products', undefined, { type: 'low_stock', count: filtered.length });
  
  return filtered;
});
