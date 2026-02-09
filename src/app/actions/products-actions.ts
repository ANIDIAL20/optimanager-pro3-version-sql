/**
 * Products Actions - Neon/Drizzle Version
 * Secure, multi-tenant product management
 */

'use server';

import { db } from '@/db';
import { products } from '@/db/schema';
import { eq, and, or, ilike, desc, lte, sql } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure, logAudit } from '@/lib/audit-log';
import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import { measurePerformance } from '@/lib/performance';
import { getClientUsageStats } from './adminActions';

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
    return await measurePerformance(`getProducts-${userId}`, async () => {
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
            const mappedProducts: Product[] = results.map((p: any) => ({
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
                createdAt: p.createdAt ? (typeof p.createdAt === 'string' ? p.createdAt : (p.createdAt as Date).toISOString()) : new Date().toISOString(),
                updatedAt: p.updatedAt ? (typeof p.updatedAt === 'string' ? p.updatedAt : (p.updatedAt as Date).toISOString()) : undefined,
                // Ensure compatibility with UI chips that might look for Ids?
                categorieId: 'legacy', 
                marqueId: 'legacy'
            }));

            console.log(`✅ Found ${mappedProducts.length} products`);
            await logSuccess(userId, 'READ', 'products', 'list', { count: mappedProducts.length, searchQuery });

            return { success: true, data: mappedProducts };

        } catch (error: any) {
            console.error('💥 Error fetching products:', error);
            if (error.cause) {
                console.error('🔍 Error Cause Detail:', error.cause);
            }
            await logFailure(userId, 'READ', 'products', error.message);
            return { success: false, error: 'Erreur lors de la récupération des produits' };
        }
    }, { userId });
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
            categorie: product.categorie || '',
            marque: product.marque || '',
            fournisseur: product.fournisseur || '',
            prixAchat: Number(product.prixAchat || 0),
            prixVente: Number(product.prixVente || 0),
            quantiteStock: product.quantiteStock || 0,
            seuilAlerte: product.seuilAlerte || 5,
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
    details?: string; // Back to simple string storage
    shouldRedirect?: boolean;
}

// ...

/**
 * Create Product
 */
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

        // 🛡️ CHECK QUOTAS
        const usage = await getClientUsageStats(userId);
        if (usage.products.count >= usage.products.limit) {
             return { success: false, error: `Vous avez atteint la limite de produits pour votre plan (${usage.products.limit}). Veuillez mettre à niveau votre abonnement.` };
        }

        // Handle defaults
        const reference = data.reference && data.reference.trim() !== '' 
                ? data.reference 
                : `REF-${Date.now()}`;

        // Drizzle Insert
        const [newProduct] = await db.insert(products).values({
            userId,
            nom: data.nomProduit,
            reference: reference,
            categorie: data.categorie || data.categorieId || null,
            marque: data.marque || data.marqueId || null,
            fournisseur: data.fournisseur || null,
            
            // Decimal handling
            prixAchat: data.prixAchat ? String(data.prixAchat) : '0',
            prixVente: String(data.prixVente),
            prixGros: '0', // Default
            
            quantiteStock: data.quantiteStock || 0,
            seuilAlerte: data.stockMin || 5,
            
            description: data.description || null,
            details: data.details || null,
            
            matiereId: data.matiereId ? parseInt(data.matiereId) : null,
            couleurId: data.couleurId ? parseInt(data.couleurId) : null,
            
            isActive: true,
            version: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        }).returning();

        await logSuccess(userId, 'CREATE', 'products', newProduct.id.toString());

        revalidateTag('products');
        revalidatePath('/dashboard/products');
        revalidatePath('/dashboard/stock');
        
        if (data.shouldRedirect) {
            redirect('/produits');
        }

        return { success: true, data: { id: newProduct.id.toString() }, message: 'Produit créé avec succès' };

    } catch (error: any) {
        if (error.digest === 'NEXT_REDIRECT') {
            throw error;
        }

        console.error('💥 Error creating product:', error);
        
        // Handle Unique Constraint on Reference
        if (error.code === '23505') {
             return { success: false, error: 'Cette référence produit existe déjà.' };
        }

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
        const id = parseInt(productId);
        if (isNaN(id)) return { success: false, error: 'ID produit invalide' };

        // 1. Fetch current product for version check
        const oldProduct = await db.query.products.findFirst({
            where: and(eq(products.id, id), eq(products.userId, userId))
        });

        if (!oldProduct) return { success: false, error: 'Produit introuvable' };

        // 2. Prepare Update Payload
        const updatePayload: any = {
            updatedAt: new Date(),
            version: oldProduct.version + 1, // Optimistic Locking
        };

        if (data.nomProduit !== undefined) updatePayload.nom = data.nomProduit;
        if (data.reference !== undefined) updatePayload.reference = data.reference;
        
        if (data.categorie || data.categorieId) updatePayload.categorie = data.categorie || data.categorieId;
        if (data.marque || data.marqueId) updatePayload.marque = data.marque || data.marqueId;
        if (data.fournisseur !== undefined) updatePayload.fournisseur = data.fournisseur;
        
        if (data.prixAchat !== undefined) updatePayload.prixAchat = String(data.prixAchat);
        if (data.prixVente !== undefined) updatePayload.prixVente = String(data.prixVente);
        
        if (data.quantiteStock !== undefined) updatePayload.quantiteStock = data.quantiteStock;
        if (data.stockMin !== undefined) updatePayload.seuilAlerte = data.stockMin;
        
        if (data.description !== undefined) updatePayload.description = data.description;
        if (data.details !== undefined) updatePayload.details = data.details;
        
        if (data.matiereId !== undefined) updatePayload.matiereId = data.matiereId ? parseInt(data.matiereId) : null;
        if (data.couleurId !== undefined) updatePayload.couleurId = data.couleurId ? parseInt(data.couleurId) : null;

        // 3. Execute Update
        const [updatedProduct] = await db.update(products)
            .set(updatePayload)
            .where(and(
                eq(products.id, id), 
                eq(products.userId, userId),
                eq(products.version, oldProduct.version) 
            ))
            .returning();
        
        if (!updatedProduct) {
             return { success: false, error: 'Erreur de concurrence: Le produit a été modifié par un autre utilisateur. Veuillez rafraîchir.' };
        }

        // Audit
        await logAudit({
            userId,
            entityType: 'product',
            entityId: productId,
            action: 'UPDATE',
            oldValue: oldProduct,
            newValue: updatedProduct,
            success: true
        });

        revalidateTag('products');
        revalidatePath('/dashboard/products');
        revalidatePath(`/dashboard/products/${productId}`);
        revalidatePath('/dashboard/stock');
        
        return { success: true, message: 'Produit mis à jour' };

    } catch (error: any) {
        console.error('Update Product Error:', error);
        await logFailure(userId, 'UPDATE', 'products', error.message, productId);
        return { success: false, error: `Erreur lors de la mise à jour: ${error.message}` };
    }
});
 // End updateProduct followed by deleteProduct and updateStock...


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

        revalidateTag('products', 'page');
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

        const mapped = results.map((p: any) => ({
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
            .map((r: any) => r.category)
            .filter((c: any): c is string => !!c && c.trim() !== '')
            .sort()
            .map((c: any) => ({ id: c, name: c }));

        return { success: true, data: categories };
    } catch (error: any) {
        console.error('Error fetching categories:', error);
        return { success: false, error: 'Erreur récupération catégories' };
    }
});
/**
 * Create Bulk Products (e.g. from Invoice)
 */
export const createBulkProducts = secureAction(async (userId, user, data: { items: ProductInput[], invoiceData?: { fournisseurId?: string, numFacture?: string, dateAchat?: Date } }) => {
    console.log(`📦 Creating ${data.items.length} products in bulk`);
    
    // 🛡️ CHECK QUOTAS
    const usage = await getClientUsageStats(userId);
    if (usage.products.count + data.items.length > usage.products.limit) {
         return { success: false, error: `L'ajout de ${data.items.length} produits dépasserait votre limite autorisée (${usage.products.limit}).` };
    }

    try {
        const { invoiceData } = data;

        // 1. Prepare and Validate Data
        const productsToInsert = data.items.map(item => {
             // Validation: Ensure nom exists
             if (!item.nomProduit) {
                 throw new Error("Le nom du produit est obligatoire pour tous les articles.");
             }

             // Handle Reference: Generate if missing to avoid constraints issues if we add unique later, or just keep empty
             const reference = item.reference && item.reference.trim() !== '' 
                ? item.reference 
                : `REF-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

             return {
                userId,
                nom: item.nomProduit,
                reference: reference,
                categorie: item.categorie || item.categorieId || null,
                marque: item.marque || item.marqueId || null,
                fournisseur: item.fournisseur || invoiceData?.fournisseurId || null,
                
                // Ensure numeric values
                prixAchat: item.prixAchat ? String(item.prixAchat) : '0',
                prixVente: item.prixVente ? String(item.prixVente) : '0',
                quantiteStock: item.quantiteStock || 0,
                seuilAlerte: item.stockMin || 5,
                
                description: item.description || (invoiceData?.numFacture ? `Facture: ${invoiceData.numFacture}` : null),
                details: item.details || null,
                
                matiereId: item.matiereId ? parseInt(item.matiereId) : null,
                couleurId: item.couleurId ? parseInt(item.couleurId) : null,
                
                isActive: true,
                version: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
             };
        });

        // 2. Execute Batch Insert with Transaction 🛡️
        const results = await db.transaction(async (tx: any) => {
             const inserted = await tx.insert(products)
                .values(productsToInsert)
                .returning({ id: products.id, nom: products.nom });
             
             // Optional: If we had to link stock movements or other tables, we would do it here using `tx`
             return inserted;
        });

        // 3. Log Success
        await logSuccess(userId, 'CREATE', 'products', `BULK-${results.length}`, { 
            count: results.length, 
            invoice: invoiceData?.numFacture
        });
        
        revalidatePath('/dashboard/products');
        revalidatePath('/dashboard/stock');
        revalidateTag('products');
        
        return { 
            success: true, 
            count: results.length, 
            message: `${results.length} produits ajoutés avec succès.` 
        };

    } catch (error: any) {
        console.error('Bulk Create Error:', error);
        
        // Enhance error message for end-users
        let userMessage = "Erreur lors de l'ajout groupé.";
        if (error.code === '23505') userMessage = "Une référence produit existe déjà."; // Unique constraint
        if (error.message.includes("nom du produit")) userMessage = error.message;

        await logFailure(userId, 'CREATE', 'products', error.message, 'BULK');
        return { success: false, error: userMessage };
    }
});
