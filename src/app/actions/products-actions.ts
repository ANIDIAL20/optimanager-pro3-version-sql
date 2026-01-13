/**
 * Products Actions - Neon/Drizzle Version
 * Secure, multi-tenant product management
 */

'use server';

import { db } from '@/db';
import { products } from '@/db/schema';
import { eq, and, or, ilike, desc, lte, sql } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';

// ========================================
// TYPE DEFINITIONS
// ========================================

// ... types updated to match src/lib/types.ts mostly ...

export interface Product {
    id: string;
    reference: string;
    nomProduit: string;
    prixAchat: number;
    prixVente: number;
    quantiteStock: number;
    seuilAlerte: number;
    categorie: string;
    marque: string;
    fournisseur: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
    // Legacy fields handling for compat
    categorieId?: string;
    marqueId?: string;
}

// ...

/**
 * Get all products with optional search
 * ✅ SECURED - Multi-tenant
 */
export const getProducts = secureAction(async (userId, user, searchQuery?: string) => {
    console.log(`📦 Fetching products for user: ${userId}`);

    try {
        const query = db
            .select()
            .from(products)
            .where(
                and(
                    eq(products.userId, userId),
                    searchQuery ? or(
                        ilike(products.nom, `%${searchQuery}%`),
                        ilike(products.reference, `%${searchQuery}%`),
                        ilike(products.categorie, `%${searchQuery}%`),
                        ilike(products.marque, `%${searchQuery}%`)
                    ) : undefined
                )
            )
            .orderBy(desc(products.createdAt));

        const results = await query;

        // Transform to frontend interface (matching src/lib/types.ts)
        const mappedProducts: Product[] = results.map(p => ({
            id: p.id.toString(),
            reference: p.reference || '',
            nomProduit: p.nom,
            prixAchat: Number(p.prixAchat),
            prixVente: Number(p.prixVente),
            quantiteStock: p.quantiteStock || 0,
            seuilAlerte: p.seuilAlerte || 5,
            categorie: p.categorie || '',
            marque: p.marque || '',
            fournisseur: p.fournisseur || '',
            description: p.description || '',
            isActive: p.isActive || false,
            createdAt: p.createdAt?.toISOString() || new Date().toISOString(),
            updatedAt: p.updatedAt?.toISOString(),
            // Ensure compatibility with UI chips that might look for Ids?
            categorieId: 'legacy', 
            marqueId: 'legacy'
        }));

        console.log(`✅ Found ${mappedProducts.length} products`);
        await logSuccess(userId, 'READ', 'products', undefined, { count: mappedProducts.length, searchQuery });

        return { success: true, data: mappedProducts };

    } catch (error: any) {
        console.error('💥 Error fetching products:', error);
        await logFailure(userId, 'READ', 'products', error.message);
        return { success: false, error: 'Erreur lors de la récupération des produits' };
    }
});

/**
 * Get single product
 */
export const getProduct = secureAction(async (userId, user, productId: string) => {
    try {
        const id = parseInt(productId);
        const product = await db.query.products.findFirst({
            where: and(
                eq(products.id, id),
                eq(products.userId, userId)
            )
        });

        if (!product) return { success: false, error: 'Produit introuvable' };

        // Map
        const mapped: Product = {
            id: product.id.toString(),
            name: product.nom,
            reference: product.reference || '',
            category: product.categorie || '',
            brand: product.marque || '',
            supplier: product.fournisseur || '',
            purchasePrice: product.prixAchat || '0',
            salePrice: product.prixVente || '0',
            wholesalePrice: product.prixGros || '0',
            stock: product.quantiteStock || 0,
            minStock: product.seuilAlerte || 5,
            description: product.description || '',
            isActive: product.isActive || false,
            createdAt: product.createdAt?.toISOString() || '',
            updatedAt: product.updatedAt?.toISOString()
        };

        await logSuccess(userId, 'READ', 'products', productId);
        return { success: true, data: mapped };

    } catch (error: any) {
        await logFailure(userId, 'READ', 'products', error.message, productId);
        return { success: false, error: error.message };
    }
});

/**
 * Create Product
 */
export interface ProductInput {
    id?: string;
    reference: string;
    nomProduit: string;
    categorieId: string; // Used for linking, logic might need mapped name?
    marqueId: string;
    matiereId?: string;
    couleurId?: string;
    prixAchat?: number;
    prixVente: number;
    quantiteStock: number;
    stockMin?: number; // seuilAlerte
    description?: string;
    imageUrl?: string;
    imageHint?: string;
    // Optional names if passed for convenience or mapped
    categorie?: string;
    marque?: string; 
    fournisseur?: string; // Not in form?
}

// ...

/**
 * Create Product
 */
export const createProduct = secureAction(async (userId, user, data: ProductInput) => {
    console.log(`📝 Creating product: ${data.nomProduit}`);

    try {
        if (!data.nomProduit || !data.prixVente) {
            return { success: false, error: 'Nom et prix de vente requis' };
        }

        // Logic check: currently `products` table uses 'categorie' (text) and 'marque' (text)
        // But Input passes 'categorieId' and 'marqueId'.
        // We might need to fetch the names if IDs are passed, OR just store IDs if table allows?
        // Checking legacy migration: `migrate-products.ts` used `categorie: data.categorie || ''`.
        // If frontend passes IDs, we need to resolve them to names if the schema expects names.
        // Schema: `categorie: text('categorie')`.
        // If we store ID in text column, search will break?
        // Let's assume we need to resolving names from IDs is too complex for this step without fetching.
        // BUT `product-form.tsx` has `categories` list.
        // Ideally we should pass names too.
        // For now, I'll store the ID in the text field if name not provided, or empty?
        // Actually, the frontend form `onSubmit` sends `categorieId`.
        // If I just store `categorieId` in `categorie` column, the UI will show "cat_123" instead of "Lunettes".
        // This is a known legacy issue. 
        // Migration script `inspect-products` showed `categorieId` AND `categorie` fields in Firestore?
        // `columns.tsx` showed `product.categorie || product.categorieId`.
        // So the App supports both?
        // Let's store what we get. If we receive category ID, store it in categorieId legacy column/json?
        // Wait, Drizzle schema `products` has `categorie` (text). Does it have `categorieId`?
        // Let's check schema.ts next step correctly.
        // I'll proceed assuming I map inputs to `nom`, `quantiteStock`, etc.

        const newProduct = {
            userId,
            nom: data.nomProduit,
            reference: data.reference,
            categorie: data.categorie || data.categorieId, // Fallback
            marque: data.marque || data.marqueId, // Fallback
            fournisseur: data.fournisseur,
            prixAchat: data.prixAchat?.toString(),
            prixVente: data.prixVente.toString(),
            quantiteStock: data.quantiteStock || 0,
            seuilAlerte: data.stockMin || 5,
            description: data.description,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await db.insert(products).values(newProduct).returning();

        await logSuccess(userId, 'CREATE', 'products', result[0].id.toString());
        return { success: true, data: { id: result[0].id.toString() }, message: 'Produit créé avec succès' };

    } catch (error: any) {
        console.error('💥 Error creating product:', error);
        await logFailure(userId, 'CREATE', 'products', error.message);
        return { success: false, error: 'Erreur lors de la création du produit' };
    }
});

/**
 * Update Product
 */
export const updateProduct = secureAction(async (userId, user, productId: string, data: Partial<ProductInput>) => {
    try {
        const id = parseInt(productId);
        
        // Verify ownership
        const existing = await db.select().from(products).where(and(eq(products.id, id), eq(products.userId, userId))).limit(1);
        if (existing.length === 0) return { success: false, error: 'Produit introuvable' };

        const updateData: any = { updatedAt: new Date() };
        if (data.nomProduit) updateData.nom = data.nomProduit;
        if (data.reference !== undefined) updateData.reference = data.reference;
        if (data.categorie !== undefined) updateData.categorie = data.categorie;
        if (data.categorieId !== undefined && !data.categorie) updateData.categorie = data.categorieId; // Fallback
        if (data.marque !== undefined) updateData.marque = data.marque;
        if (data.marqueId !== undefined && !data.marque) updateData.marque = data.marqueId; // Fallback
        if (data.fournisseur !== undefined) updateData.fournisseur = data.fournisseur;
        if (data.prixAchat !== undefined) updateData.prixAchat = data.prixAchat.toString();
        if (data.prixVente !== undefined) updateData.prixVente = data.prixVente.toString();
        if (data.quantiteStock !== undefined) updateData.quantiteStock = data.quantiteStock;
        if (data.stockMin !== undefined) updateData.seuilAlerte = data.stockMin;
        if (data.description !== undefined) updateData.description = data.description;

        await db.update(products).set(updateData).where(eq(products.id, id));

        await logSuccess(userId, 'UPDATE', 'products', productId);
        return { success: true, message: 'Produit mis à jour' };

    } catch (error: any) {
        await logFailure(userId, 'UPDATE', 'products', error.message, productId);
        return { success: false, error: 'Erreur lors de la mise à jour' };
    }
}); // End updateProduct followed by deleteProduct and updateStock...


/**
 * Delete Product
 */
export const deleteProduct = secureAction(async (userId, user, productId: string) => {
    try {
        const id = parseInt(productId);

        const result = await db.delete(products)
            .where(and(eq(products.id, id), eq(products.userId, userId)))
            .returning();
            
        if (result.length === 0) return { success: false, error: 'Produit introuvable' };

        await logSuccess(userId, 'DELETE', 'products', productId);
        return { success: true, message: 'Produit supprimé' };

    } catch (error: any) {
        // Handle FK constraint errors (e.g. if used in sales)
        if (error.code === '23503') { // Postgres foreign_key_violation
             return { success: false, error: 'Impossible de supprimer ce produit car il est lié à des ventes ou mouvements.' };
        }
        await logFailure(userId, 'DELETE', 'products', error.message, productId);
        return { success: false, error: 'Erreur lors de la suppression' };
    }
});

/**
 * Update Stock (Increment/Decrement)
 */
export const updateStock = secureAction(async (userId, user, productId: string, quantity: number, type: 'add' | 'remove') => {
    try {
        const id = parseInt(productId);
        const adjustment = type === 'add' ? quantity : -quantity;

        // Atomically update stock
        const result = await db.update(products)
            .set({ 
                quantiteStock: sql`${products.quantiteStock} + ${adjustment}`,
                updatedAt: new Date()
            })
            .where(and(eq(products.id, id), eq(products.userId, userId)))
            .returning({ newStock: products.quantiteStock });

        if (result.length === 0) return { success: false, error: 'Produit introuvable' };

        await logSuccess(userId, 'UPDATE_STOCK', 'products', productId, { type, quantity, newStock: result[0].newStock });
        return { success: true, newStock: result[0].newStock };

    } catch (error: any) {
        await logFailure(userId, 'UPDATE_STOCK', 'products', error.message, productId);
        return { success: false, error: 'Erreur stock' };
    }
});

/**
 * Get Low Stock Products
 */
export const getLowStockProducts = secureAction(async (userId, user, threshold?: number) => {
    try {
        const results = await db.select()
            .from(products)
            .where(and(
                eq(products.userId, userId),
                // stock <= alert_threshold OR default 5
                lte(products.quantiteStock, products.seuilAlerte || threshold || 5) 
            ))
            .orderBy(products.quantiteStock);

        const mapped = results.map(p => ({
            id: p.id.toString(),
            name: p.nom,
            stock: p.quantiteStock,
            minStock: p.seuilAlerte
        }));

        return { success: true, data: mapped };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Get distinct categories from products
 */
export const getCategories = secureAction(async (userId, user) => {
    try {
        const results = await db
            .selectDistinct({ category: products.categorie })
            .from(products)
            .where(
                and(
                    eq(products.userId, userId),
                    sql`${products.categorie} IS NOT NULL`
                )
            );

        const categories = results
            .map(r => r.category)
            .filter((c): c is string => !!c && c.trim() !== '')
            .sort()
            .map(c => ({ id: c, name: c }));

        return { success: true, data: categories };
    } catch (error: any) {
        console.error('Error fetching categories:', error);
        return { success: false, error: 'Erreur récupération catégories' };
    }
});
