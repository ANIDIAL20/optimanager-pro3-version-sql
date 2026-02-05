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
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';

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
    modele?: string;
    couleur?: string;
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
            modele: p.modele || '',
            couleur: p.couleur || '',
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
            nomProduit: product.nom,
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
    shouldRedirect?: boolean;
}

// ...

/**
 * Create Product
 */
export const createProduct = secureAction(async (userId, user, data: ProductInput) => {
    console.log(`📝 Creating product payload:`, JSON.stringify(data, null, 2));

    try {
        // Validation: Allow 0 as a valid price
        if (!data.nomProduit || data.prixVente === undefined || data.prixVente === null) {
            return { success: false, error: 'Nom et prix de vente requis (Données incomplètes)' };
        }

        // ⚡ Raw SQL Insert for stability
        // Explicitly mapping fields to avoid Drizzle query builder issues in this env.
        
        // Prepare values (handle defaults and types)
        const nom = data.nomProduit;
        const reference = data.reference || '';
        const categorie = data.categorie || data.categorieId || '';
        const marque = data.marque || data.marqueId || '';
        const fournisseur = data.fournisseur || '';
        const prixAchat = data.prixAchat || 0;
        const prixVente = data.prixVente;
        const quantiteStock = data.quantiteStock || 0;
        const seuilAlerte = data.stockMin || 5;
        const description = data.description || '';
        const isActive = true; // Default

        // Use parameterized query for safety
        const query = sql`
            INSERT INTO products (
                user_id, 
                nom, 
                reference, 
                categorie, 
                marque, 
                fournisseur, 
                prix_achat, 
                prix_vente, 
                quantite_stock, 
                seuil_alerte, 
                description, 
                is_active,
                created_at,
                updated_at
            ) VALUES (
                ${userId},
                ${nom},
                ${reference},
                ${categorie},
                ${marque},
                ${fournisseur},
                ${prixAchat},
                ${prixVente},
                ${quantiteStock},
                ${seuilAlerte},
                ${description},
                ${isActive},
                NOW(),
                NOW()
            ) RETURNING id
        `;

        const result = await db.execute(query);
        const newId = (result.rows[0] as any).id;

        await logSuccess(userId, 'CREATE', 'products', newId.toString());

        // ⚡ Update cache
        revalidatePath('/produits');

        if (data.shouldRedirect) {
            redirect('/produits');
        }

        return { success: true, data: { id: newId.toString() }, message: 'Produit créé avec succès' };

    } catch (error: any) {
        if (error.digest === 'NEXT_REDIRECT') {
            throw error;
        }

        console.error('💥 Error creating product (Raw SQL):', error);
        console.error('Details:', {
             message: error.message,
             code: error.code
        });
        await logFailure(userId, 'CREATE', 'products', error.message);
        return { success: false, error: `Erreur lors de la création: ${error.message}` };
    }
});

/**
 * Update Product
 */
export const updateProduct = secureAction(async (userId, user, productId: string, data: Partial<ProductInput>) => {
    try {
        console.log(`📝 Update request for product ${productId}`, data);

        // Refactoring to Raw SQL to avoid Drizzle/Type issues and potential ID parsing errors
        const updateParts = [];
        updateParts.push(sql`"updated_at" = NOW()`);
        
        if (data.nomProduit !== undefined) updateParts.push(sql`"nom" = ${data.nomProduit}`);
        if (data.reference !== undefined) updateParts.push(sql`"reference" = ${data.reference}`);
        
        // Handle logic: if data.categorie is set, use it. If not, use categoryId fallback
        const cat = data.categorie || data.categorieId;
        if (cat !== undefined) updateParts.push(sql`"categorie" = ${cat}`);
        
        const brand = data.marque || data.marqueId;
        if (brand !== undefined) updateParts.push(sql`"marque" = ${brand}`);
        
        if (data.fournisseur !== undefined) updateParts.push(sql`"fournisseur" = ${data.fournisseur}`);
        if (data.prixAchat !== undefined) updateParts.push(sql`"prix_achat" = ${data.prixAchat}`);
        if (data.prixVente !== undefined) updateParts.push(sql`"prix_vente" = ${data.prixVente}`);
        if (data.quantiteStock !== undefined) updateParts.push(sql`"quantite_stock" = ${data.quantiteStock}`);
        if (data.stockMin !== undefined) updateParts.push(sql`"seuil_alerte" = ${data.stockMin}`);
        if (data.description !== undefined) updateParts.push(sql`"description" = ${data.description}`);
        
        // Try precise ID matching. If text/uuid:
        const query = sql`
            UPDATE products
            SET ${sql.join(updateParts, sql`, `)}
            WHERE id::text = ${productId} AND user_id = ${userId}
            RETURNING id
        `;
        
        const result = await db.execute(query);
        
        if (result.rowCount === 0) {
             console.warn(`Product update returned 0 rows for ID ${productId}`);
             return { success: false, error: 'Produit introuvable ou modifications échouées' };
        }

        await logSuccess(userId, 'UPDATE', 'products', productId);
        revalidatePath('/produits');
        return { success: true, message: 'Produit mis à jour' };

    } catch (error: any) {
        console.error('Update Product Error:', error);
        await logFailure(userId, 'UPDATE', 'products', error.message, productId);
        return { success: false, error: `Erreur lors de la mise à jour: ${error.message}` };
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
        revalidatePath('/produits');
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
