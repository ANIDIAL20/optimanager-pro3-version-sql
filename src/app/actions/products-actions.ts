'use server';

import { db } from '@/db';
import { products, stockMovements, invoiceImports } from '@/db/schema';
import { eq, and, or, ilike, desc, lte, asc, sql } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure, logAudit } from '@/lib/audit-log';
import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import { measurePerformance } from '@/lib/performance';
import { getClientUsageStats } from './adminActions';

// ========================================
// TYPE DEFINITIONS
// ========================================

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
    matiereId?: string;
    couleurId?: string;
}

/**
 * Get all products with optional search
 * ✅ SECURED - Multi-tenant
 */
export const getProducts = secureAction(async (userId, user, searchQuery?: string) => {
    return await measurePerformance(`getProducts-${userId}`, async () => {
        console.log(`📦 Fetching products for user: ${userId} (Drizzle)`);

        try {
            const filters = [
                eq(products.userId, userId),
                sql`${products.deletedAt} IS NULL`
            ];

            if (searchQuery) {
                const search = `%${searchQuery}%`;
                filters.push(or(
                    ilike(products.nom, search),
                    ilike(products.reference, search),
                    ilike(products.categorie, search),
                    ilike(products.marque, search)
                )!);
            }

            const results = await db.select().from(products)
                .where(and(...filters))
                .orderBy(desc(products.createdAt));

            // Transform Drizzle results to frontend interface
            const mappedProducts: Product[] = results.map((p: any) => ({
                id: p.id.toString(),
                reference: p.reference || '',
                nomProduit: p.nom,
                prixAchat: Number(p.prixAchat || 0),
                prixVente: Number(p.prixVente || 0),
                quantiteStock: p.quantiteStock || 0,
                seuilAlerte: p.seuilAlerte || 5,
                categorie: p.categorie || '',
                marque: p.marque || '',
                modele: p.modele || '',
                couleur: p.couleur || '',
                fournisseur: p.fournisseur || '',
                description: p.description || '',
                isActive: p.isActive || false,
                createdAt: p.createdAt ? (typeof p.createdAt === 'string' ? p.createdAt : p.createdAt.toISOString()) : new Date().toISOString(),
                updatedAt: p.updatedAt ? (typeof p.updatedAt === 'string' ? p.updatedAt : p.updatedAt.toISOString()) : undefined,
                matiereId: p.matiereId?.toString(),
                couleurId: p.couleurId?.toString(),
                categorieId: p.categorie,
                marqueId: p.marque,
                type: p.type
            }));

            console.log(`✅ Found ${mappedProducts.length} products (Drizzle)`);
            await logSuccess(userId, 'READ', 'products', 'list', { count: mappedProducts.length, searchQuery });

            return { success: true, data: mappedProducts };

        } catch (error: any) {
            console.error('💥 Error fetching products (Drizzle):', error);
            await logFailure(userId, 'READ', 'products', error.message);
            return { success: false, error: 'Erreur lors de la récupération des produits' };
        }
    }, { userId });
});

/**
 * Optimized Search for POS (Pagination + Filtering)
 */
export const searchProducts = secureAction(async (userId, user, params: { 
    query?: string; 
    type?: string; 
    category?: string; 
    limit?: number;
    offset?: number; 
}) => {
    try {
        const limit = params.limit || 50;
        const offset = params.offset || 0;
        
        const filters = [
            eq(products.userId, userId),
            sql`${products.deletedAt} IS NULL`
        ];

        // Type filter
        if (params.type && params.type !== 'ALL') {
             // Handle 'SOLAIRE' specially if it's not a native type but a category convention
             // Assuming user uses standard types: MONTURE, VERRE, ACCESSOIRE
             if (params.type === 'SOLAIRE') {
                 // Solaire is tricky, usually a category or type. 
                 // If schema has no SOLAIRE type, check category or name
                 filters.push(or(
                     ilike(products.categorie, '%solaire%'),
                     ilike(products.nom, '%solaire%')
                 )!);
             } else {
                 filters.push(eq(products.type, params.type as any));
             }
        }

        // Category filter
        if (params.category && params.category !== 'all') {
            filters.push(eq(products.categorie, params.category));
        }

        // Text search
        if (params.query) {
            const search = `%${params.query}%`;
            filters.push(or(
                ilike(products.nom, search),
                ilike(products.reference, search),
                ilike(products.marque, search)
            )!);
        }

        const results = await db.select().from(products)
            .where(and(...filters))
            .limit(limit)
            .offset(offset)
            .orderBy(desc(products.createdAt));

        const mappedProducts = results.map((p: any) => ({
            id: p.id.toString(),
            reference: p.reference || '',
            nomProduit: p.nom,
            prixAchat: Number(p.prixAchat || 0),
            prixVente: Number(p.prixVente || 0),
            quantiteStock: p.quantiteStock || 0,
            reservedQuantity: p.reservedQuantity || 0,
            availableQuantity: p.availableQuantity || 0,
            seuilAlerte: p.seuilAlerte || 5,
            categorie: p.categorie || '',
            marque: p.marque || '',
            modele: p.modele || '',
            couleur: p.couleur || '',
            type: p.type,
            createdAt: p.createdAt ? (typeof p.createdAt === 'string' ? p.createdAt : p.createdAt.toISOString()) : new Date().toISOString(),
        }));

        return { success: true, data: mappedProducts };

    } catch (error: any) {
        console.error('Error searching products:', error);
        return { success: false, error: error.message };
    }
});

/**
 * Get single product
 */
export const getProduct = secureAction(async (userId, user, productId: string) => {
    try {
        const id = parseInt(productId);
        if (isNaN(id)) return { success: false, error: 'ID produit invalide' };

        const product = await db.query.products.findFirst({
            where: and(eq(products.id, id), eq(products.userId, userId))
        });

        if (!product) return { success: false, error: 'Produit introuvable' };

        // Map Drizzle result to frontend interface
        const mapped: Product = {
            id: product.id.toString(),
            nomProduit: product.nom,
            reference: product.reference || '',
            categorie: product.categorie || '',
            marque: product.marque || '',
            fournisseur: product.fournisseur || '',
            modele: product.modele || '',
            couleur: product.couleur || '',
            prixAchat: Number(product.prixAchat || 0),
            prixVente: Number(product.prixVente || 0),
            quantiteStock: product.quantiteStock || 0,
            seuilAlerte: product.seuilAlerte || 5,
            description: product.description || '',
            isActive: product.isActive || false,
            createdAt: product.createdAt ? (typeof product.createdAt === 'string' ? product.createdAt : product.createdAt.toISOString()) : '',
            updatedAt: product.updatedAt ? (typeof product.updatedAt === 'string' ? product.updatedAt : product.updatedAt.toISOString()) : undefined,
            matiereId: product.matiereId?.toString(),
            couleurId: product.couleurId?.toString(),
            categorieId: product.categorie || '',
            marqueId: product.marque || ''
        };

        await logSuccess(userId, 'READ', 'products', productId);
        return { success: true, data: mapped };

    } catch (error: any) {
        console.error('💥 Error fetching product (Drizzle):', error);
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
    modele?: string;
    couleur?: string;
    isActive?: boolean;
}

export const createProduct = secureAction(async (userId, user, data: ProductInput) => {
    console.log(`📝 Creating product payload (Drizzle):`, JSON.stringify(data, null, 2));

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

        // 1. Check Uniqueness (Drizzle)
        const existing = await db.query.products.findFirst({
            where: and(eq(products.userId, userId), eq(products.reference, reference))
        });

        if (existing) {
             return { success: false, error: 'Cette référence (ou code-barres) existe déjà.' };
        }

        // 2. Create Product
        const [newProduct] = await db.insert(products).values({
            userId,
            nom: data.nomProduit,
            reference: reference,
            categorie: data.categorie || data.categorieId || null, // Use descriptive first, then ID/mapped
            marque: data.marque || data.marqueId || null,
            fournisseur: data.fournisseur || null,
            modele: data.modele || null,
            couleur: data.couleur || null,
            
            // Ensure numeric values
            prixAchat: data.prixAchat ? String(data.prixAchat) : '0',
            prixVente: data.prixVente ? String(data.prixVente) : '0',
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

        // 3. Log Success
        await logSuccess(userId, 'CREATE', 'products', newProduct.id.toString(), { name: newProduct.nom });
        
        revalidatePath('/dashboard/products');
        revalidatePath('/dashboard/stock');
        revalidateTag('products');
        
        return { success: true, data: newProduct };

    } catch (error: any) {
        console.error('Create Product Error (Drizzle):', error);
        
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
        console.log(`📝 Update request for product ${productId} (Drizzle)`, data);
        const id = parseInt(productId);
        if (isNaN(id)) return { success: false, error: 'ID produit invalide' };

        // 1. Fetch current product for version check
        const oldProduct = await db.query.products.findFirst({
            where: and(eq(products.id, id), eq(products.userId, userId))
        });

        if (!oldProduct) return { success: false, error: 'Produit introuvable' };

        // 2. Execute Update (Drizzle)
        await db.update(products)
            .set({
                nom: data.nomProduit !== undefined ? data.nomProduit : undefined,
                reference: data.reference !== undefined ? data.reference : undefined,
                categorie: data.categorie !== undefined ? data.categorie : (data.categorieId !== undefined ? data.categorieId : undefined),
                marque: data.marque !== undefined ? data.marque : (data.marqueId !== undefined ? data.marqueId : undefined),
                fournisseur: data.fournisseur !== undefined ? data.fournisseur : undefined,
                modele: data.modele !== undefined ? data.modele : undefined,
                couleur: data.couleur !== undefined ? data.couleur : undefined,
                matiereId: data.matiereId !== undefined ? (data.matiereId ? parseInt(data.matiereId) : null) : undefined,
                couleurId: data.couleurId !== undefined ? (data.couleurId ? parseInt(data.couleurId) : null) : undefined,
                prixAchat: data.prixAchat !== undefined ? data.prixAchat.toString() : undefined,
                prixVente: data.prixVente !== undefined ? data.prixVente.toString() : undefined,
                quantiteStock: data.quantiteStock !== undefined ? data.quantiteStock : undefined,
                seuilAlerte: data.stockMin !== undefined ? data.stockMin : undefined,
                description: data.description !== undefined ? data.description : undefined,
                isActive: data.isActive !== undefined ? data.isActive : undefined,
                version: sql`${products.version} + 1`,
                updatedAt: new Date().toISOString()
            })
            .where(and(eq(products.id, id), eq(products.userId, userId)));

        // Audit
        await logAudit({
            userId,
            entityType: 'product',
            entityId: productId,
            action: 'UPDATE',
            oldValue: oldProduct,
            newValue: data,
            success: true
        });

        revalidateTag('products');
        revalidatePath('/dashboard/products');
        revalidatePath(`/dashboard/products/${productId}`);
        revalidatePath('/dashboard/stock');
        
        return { success: true, message: 'Produit mis à jour' };

    } catch (error: any) {
        console.error('💥 Update Product Error (Drizzle):', error);
        await logFailure(userId, 'UPDATE', 'products', error.message, productId);
        return { success: false, error: `Erreur lors de la mise à jour: ${error.message}` };
    }
});

/**
 * Update Stock (Increment/Decrement)
 */
export const updateStock = secureAction(async (userId, user, { productId, quantity, type, reason }: { productId: string, quantity: number, type: 'IN' | 'OUT', reason: string }) => {
    return await measurePerformance(`updateStock-${productId}`, async () => {
        const id = parseInt(productId);
        if (isNaN(id)) return { success: false, error: 'ID produit invalide' };

        try {
            return await db.transaction(async (tx: any) => {
                // 1. Get current stock and lock row for update
                // Drizzle doesn't support FOR UPDATE directly in query builder easily without raw SQL or custom extensions in some versions, 
                // but we can use `sql` within select or valid transaction isolation.
                // For simplicity/compatibility in reversion:
                const product = await tx.query.products.findFirst({
                    where: and(eq(products.id, id), eq(products.userId, userId))
                });
                
                if (!product) throw new Error('Produit introuvable');

                const currentStock = Number(product.quantiteStock || 0);
                const newStock = type === 'IN' ? currentStock + quantity : currentStock - quantity;

                if (type === 'OUT' && newStock < 0) {
                    throw new Error('Stock insuffisant pour cette sortie');
                }

                // 2. Update Product Stock
                await tx.update(products)
                    .set({ 
                        quantiteStock: newStock, 
                        updatedAt: new Date().toISOString() 
                    })
                    .where(eq(products.id, id));

                // 3. Record Movement
                await tx.insert(stockMovements).values({
                    userId,
                    productId: id,
                    type,
                    quantite: quantity, // Mapped from quantity
                    notes: reason,      // Mapped from reason
                    // previousStock/newStock not in schema, removed
                    createdAt: new Date().toISOString()
                });

                await logSuccess(userId, 'UPDATE', 'products', `STOCK-${type}`, { productId, quantity, newStock });
                
                revalidatePath('/dashboard/products');
                revalidatePath(`/dashboard/products/${productId}`);
                revalidateTag('products');

                return { success: true, newStock };
            });
        } catch (error: any) {
            console.error('💥 Stock Update Error (Drizzle):', error);
            await logFailure(userId, 'UPDATE', 'products', error.message, productId);
            return { success: false, error: error.message };
        }
    }, { userId });
});

/**
 * Delete Product
 */
export const deleteProduct = secureAction(async (userId, user, productId: string) => {
    try {
        const id = parseInt(productId);
        if (isNaN(id)) return { success: false, error: 'ID produit invalide' };

        console.log(`🗑️ Deleting product ${id} for user ${userId} (Drizzle)`);
        
        const result = await db.update(products)
            .set({ 
                deletedAt: new Date(),
                version: sql`${products.version} + 1` 
            })
            .where(and(eq(products.id, id), eq(products.userId, userId)))
            .returning({ id: products.id });

        if (result.length === 0) {
            return { success: false, error: 'Produit introuvable ou déjà supprimé' };
        }

        await logSuccess(userId, 'DELETE', 'products', productId);
        
        revalidatePath('/dashboard/products');
        revalidatePath('/dashboard/stock');
        revalidateTag('products');
        
        return { success: true };

    } catch (error: any) {
        console.error('💥 Error deleting product (Drizzle):', error);
        await logFailure(userId, 'DELETE', 'products', error.message, productId);
        return { success: false, error: error.message };
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
                sql`${products.deletedAt} IS NULL`,
                // stock <= alert_threshold OR default 5 using SQL COALESCE
                lte(products.quantiteStock, sql`COALESCE(${products.seuilAlerte}, ${threshold || 5})`)
            ))
            .orderBy(asc(products.quantiteStock));

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
/**
 * Get distinct categories from products
 */
export const getCategories = secureAction(async (userId, user) => {
    try {
        const results = await db.selectDistinct({ category: products.categorie })
            .from(products)
            .where(and(
                eq(products.userId, userId),
                sql`${products.categorie} IS NOT NULL`,
                sql`${products.categorie} != ''`
            ))
            .orderBy(asc(products.categorie));

        const categories = results.map((r: any) => ({ 
            id: r.category, 
            name: r.category 
        }));

        return { success: true, data: categories };
    } catch (error: any) {
        console.error('💥 Error fetching categories (Drizzle):', error);
        return { success: false, error: 'Erreur récupération catégories' };
    }
});

/**
 * Get distinct brands (marques) from products
 */
export const getBrands = secureAction(async (userId, user) => {
    try {
        const results = await db.selectDistinct({ brand: products.marque })
            .from(products)
            .where(and(
                eq(products.userId, userId),
                sql`${products.marque} IS NOT NULL`,
                sql`${products.marque} != ''`
            ))
            .orderBy(asc(products.marque));

        const brands = results.map((r: any) => ({ 
            id: r.brand, 
            name: r.brand 
        }));

        return { success: true, data: brands };
    } catch (error: any) {
        console.error('💥 Error fetching brands (Drizzle):', error);
        return { success: false, error: 'Erreur récupération marques' };
    }
});

/**
 * Create Bulk Products (e.g. from Invoice)
 */
export const createBulkProducts = secureAction(async (userId, user, data: { items: ProductInput[], invoiceData?: { fournisseurId?: string, numFacture?: string, dateAchat?: Date } }) => {
    console.log(`📦 Creating ${data.items.length} products in bulk (Drizzle)`);
    
    // 🛡️ CHECK QUOTAS
    const usage = await getClientUsageStats(userId);
    if (usage.products.count + data.items.length > usage.products.limit) {
         return { success: false, error: `L'ajout de ${data.items.length} produits dépasserait votre limite autorisée (${usage.products.limit}).` };
    }

    const startTime = Date.now();

    try {
        const { invoiceData } = data;
        const supplierId = String((invoiceData as any)?.fournisseurId || 'unknown').toLowerCase().trim();
        const invoiceNum = invoiceData?.numFacture?.trim();
        const invoiceDate = invoiceData?.dateAchat || new Date();

        // 1. Idempotency Check
        if (invoiceNum) {
            const results = await db.select().from(invoiceImports)
                .where(and(
                    eq(invoiceImports.userId, userId),
                    eq(invoiceImports.supplierId, supplierId),
                    eq(invoiceImports.invoiceNumber, invoiceNum),
                    invoiceData?.dateAchat ? eq(invoiceImports.invoiceDate, invoiceDate) : undefined
                ))
                .limit(1);

            if (results.length > 0) {
                const existingImport = results[0];
                return { 
                    success: false, 
                    error: 'duplicate',
                    message: `La facture ${invoiceNum} a déjà été importée le ${new Date(existingImport.createdAt!).toLocaleDateString()}.` 
                };
            }
        }

        // 2. Strict Validation & Preparation
        const seenReferences = new Set<string>();
        const validItems = data.items.filter(item => item.nomProduit && item.reference && Number(item.quantiteStock) > 0);
        
        if (validItems.length === 0) {
            return { success: false, error: "Aucun produit valide trouvé dans la liste (référence et quantité obligatoire)." };
        }

        const productsToProcess = validItems.map((item) => {
             const reference = item.reference!.trim();
             if (seenReferences.has(reference)) {
                 throw new Error(`Référence en double détectée dans la liste : ${reference}`);
             }
             seenReferences.add(reference);

             const safeNum = (val: any) => {
                 if (val === null || val === undefined || val === '') return '0';
                 const parsed = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : val;
                 return isNaN(parsed) ? '0' : String(parsed);
             };

             return {
                userId,
                nom: item.nomProduit!.trim(),
                reference: reference,
                categorie: item.categorie || item.categorieId || null,
                marque: item.marque || item.marqueId || null,
                fournisseur: supplierId,
                modele: item.modele || null,
                couleur: item.couleur || null,
                prixAchat: safeNum(item.prixAchat),
                prixVente: safeNum(item.prixVente),
                quantiteStock: Math.max(0, parseInt(String(item.quantiteStock || 0))),
                seuilAlerte: Math.max(0, parseInt(String(item.stockMin || 0))),
                description: item.description || (invoiceNum ? `Facture: ${invoiceNum}` : null),
                isActive: true,
                version: 0,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                deletedAt: null,
             };
        });

        // 3. ATOMIC PROCESS
        let insertedCount = 0;
        let updatedCount = 0;

        await db.transaction(async (tx: any) => {
            const movementsArray: any[] = [];

            for (const item of productsToProcess) {
                const existingResults = await tx.select().from(products)
                    .where(and(
                        eq(products.userId, userId),
                        eq(products.reference, item.reference)
                    ))
                    .limit(1);

                const existing = existingResults[0];
                let productId: number;

                if (existing) {
                    const incomingQty = Number(item.quantiteStock);
                    await tx.update(products)
                        .set({
                            quantiteStock: sql`${products.quantiteStock} + ${incomingQty}`,
                            prixAchat: item.prixAchat,
                            updatedAt: new Date().toISOString(),
                            deletedAt: null
                        })
                        .where(eq(products.id, existing.id));
                    
                    productId = existing.id;
                    updatedCount++;
                } else {
                    const [newProd] = await tx.insert(products).values(item).returning({ id: products.id });
                    productId = newProd.id;
                    insertedCount++;
                }

                movementsArray.push({
                    userId,
                    productId,
                    type: 'IN',
                    quantite: item.quantiteStock,
                    notes: `Import Facture ${invoiceNum || ''}`,
                    createdAt: new Date()
                });
            }

            // ✅ BULK INSERT for movements
            if (movementsArray.length > 0) {
                await tx.insert(stockMovements).values(movementsArray);
            }

            if (invoiceNum) {
                await tx.insert(invoiceImports).values({
                    userId,
                    supplierId,
                    invoiceNumber: invoiceNum,
                    invoiceDate,
                    totalItems: productsToProcess.length,
                    status: 'completed'
                });
            }
        });

        const duration = Date.now() - startTime;
        
        // 4. Log Success with Metrics
        await logSuccess(userId, 'CREATE', 'products', `BULK-PRO`, { 
            inserted: insertedCount,
            updated: updatedCount,
            invoice: invoiceNum,
            duration: `${duration}ms`
        });

        revalidatePath('/dashboard/products');
        revalidatePath('/dashboard/stock');
        revalidatePath('/produits');
        revalidateTag('products');

        return { 
            success: true, 
            count: productsToProcess.length, 
            message: `${insertedCount} nouveaux et ${updatedCount} mis à jour avec succès (${duration}ms).`
        };

    } catch (error: any) {
        const duration = Date.now() - startTime;
        console.error(`Bulk Create Error after ${duration}ms:`, error);
        
        let userMessage = "Erreur système lors de l'ajout groupé.";
        let errCode = 'unknown';

        if (error.code === '23505') {
            userMessage = "Cette facture ou une référence produit existe déjà.";
            errCode = 'duplicate';
        } else if (error.message?.includes('timeout')) {
            userMessage = "L'opération a pris trop de temps.";
            errCode = 'timeout';
        } else if (error.message) {
            userMessage = error.message;
        }

        await logFailure(userId, 'CREATE', 'products', userMessage, `BULK-PRO-${errCode}`);
        return { success: false, error: userMessage, code: errCode };
    }
});
