'use server';



import { db } from '@/db';
import { products, stockMovements, invoiceImports, suppliers, brands, colors } from '@/db/schema';
import { eq, and, or, ilike, desc, lte, asc, sql, gt, not, isNull } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure, logAudit } from '@/lib/audit-log';
import { redirect } from 'next/navigation';
import { revalidatePath, revalidateTag } from 'next/cache';
import { measurePerformance } from '@/lib/performance';
import { getClientUsageStats } from './adminActions';
import { calculatePrices } from '@/lib/tva-helpers';
import { redis } from '@/lib/cache/redis';
import { type ProductFormValues } from '@/lib/validations/product';

// ========================================
// TYPE DEFINITION
// ========================================

export interface Product {
    id: string;
    reference: string;
    nomProduit: string;
    nom?: string;
    prixAchat: number;
    prixVente: number;
    quantiteStock: number;
    seuilAlerte: number;
    categorie: string;
    category: string;
    marque: string;
    brand: string;
    productType: 'frame' | 'lens' | 'contact_lens' | 'accessory' | 'service' | string;
    modele?: string;
    couleur?: string;
    fournisseur: string;
    description: string;
    isActive: boolean;
    createdAt: string;
    updatedAt?: string;
    categorieId?: string;
    marqueId?: string;
    matiereId?: string;
    couleurId?: string;
    tvaRate: number;
    isMedical: boolean;
    isStockManaged: boolean;
    type?: string;
    details?: string;
    imageUrl?: string;
    hasTva?: boolean;
    priceType?: 'HT' | 'TTC';
    numFacture?: string;
    fournisseurId?: string;
    fournisseurNom?: string;
    marqueNom?: string;  // Populated brand name from LEFT JOIN with brands table
}

/**
 * Get all products with optional search
 */
export const getProducts = secureAction(async (userId, user, params?: string | { query?: string; page?: number; limit?: number; category?: string; hideOutOfStock?: boolean; clientId?: number }) => {
    return await measurePerformance(`getProducts-${userId}`, async () => {
        const searchQuery = typeof params === 'string' ? params : params?.query;
        const page = (typeof params === 'object' && params?.page) ? params.page : 1;
        const limit = (typeof params === 'object' && params?.limit) ? params.limit : 50;
        const categoryFilter = typeof params === 'object' ? params?.category : undefined;
        const hideOutOfStock = typeof params === 'object' ? params?.hideOutOfStock : false;
        const clientId = typeof params === 'object' ? params?.clientId : undefined;
        const offset = (page - 1) * limit;

        try {
            const filters = [
                eq(products.userId, userId),
                isNull(products.deletedAt)
            ];

            if (searchQuery) {
                const search = `%${searchQuery}%`;
                filters.push(or(
                    ilike(products.nom, search),
                    ilike(products.reference, search),
                    ilike(products.category, search),
                    ilike(products.categorie, search),
                    ilike(products.brand, search),
                    ilike(products.marque, search)
                )!);
            }

            if (categoryFilter && categoryFilter !== 'all') {
                filters.push(or(
                    eq(products.category, categoryFilter),
                    eq(products.categorie, categoryFilter)
                )!);
            }

            if (hideOutOfStock) {
                filters.push(gt(products.quantiteStock, 0));
            }

            if (clientId !== undefined) {
                filters.push(
                    or(
                        not(ilike(products.reference, 'VERRE-%')),
                        and(
                            ilike(products.reference, 'VERRE-%'),
                            eq(products.clientId, clientId)
                        )!
                    )!
                );
            } else {
                filters.push(not(ilike(products.reference, 'VERRE-%')));
            }

            const countResult = await db.select({ count: sql<number>`count(*)` })
                .from(products)
                .where(and(...filters));
            const totalElements = Number(countResult[0]?.count || 0);
            const totalPages = Math.ceil(totalElements / limit);

            const results = await db.select({
                product: products,
                prixVenteCoalesced: sql<string>`COALESCE(${products.prixVente}, '0')`,
                prixAchatCoalesced: sql<string>`COALESCE(${products.prixAchat}, '0')`,
                marqueNom: brands.name
            })
            .from(products)
            .leftJoin(brands, eq(products.marqueId, brands.id))
            .where(and(...filters))
            .orderBy(
                desc(sql`CASE WHEN ${products.quantiteStock} > 0 THEN 1 ELSE 0 END`),
                asc(products.nom),
                desc(products.id)
            )
            .limit(limit)
            .offset(offset);

            const mappedProducts: Product[] = results.map((row: any) => {
                const p = row.product;
                return {
                    id: p.id.toString(),
                    reference: p.reference || '',
                    nomProduit: p.nom,
                    prixAchat: Number(row.prixAchatCoalesced || 0),
                    prixVente: Number(row.prixVenteCoalesced || 0),
                    quantiteStock: p.quantiteStock || 0,
                    seuilAlerte: p.seuilAlerte || 5,
                    category: p.category || p.categorie || '',
                    categorie: p.category || p.categorie || '',
                    brand: row.marqueNom || p.brand || p.marque || '',
                    marque: row.marqueNom || p.brand || p.marque || '',
                    marqueNom: row.marqueNom || '',
                    productType: p.productType || p.type || 'accessory',
                    modele: p.modele || '',
                    couleur: p.couleur || '',
                    fournisseur: p.fournisseur || '',
                    description: p.description || '',
                    isActive: p.isActive || false,
                    createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : '',
                    updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : undefined,
                    tvaRate: Number(p.tvaRate || 20),
                    isMedical: p.isMedical || false,
                    isStockManaged: (p.productType === 'verre' || p.productType === 'lens') ? false : (p.isStockManaged !== false),
                    details: p.details || '',
                    imageUrl: p.imageUrl || '',
                    hasTva: p.hasTva ?? true,
                    priceType: (p.priceType || 'TTC') as 'HT' | 'TTC',
                    fournisseurId: p.fournisseurId || undefined,
                    numFacture: p.numFacture || undefined
                };
            });

            return { 
                success: true, 
                data: mappedProducts,
                meta: {
                    total: totalElements,
                    page,
                    limit,
                    totalPages
                }
            };

        } catch (error: any) {
            console.error('💥 Error fetching products:', error);
            return { success: false, error: 'Erreur lors de la récupération des produits' };
        }
    }, { userId });
});

/**
 * Optimized Search for POS
 */
export const searchProducts = secureAction(async (userId, user, params: { 
    query?: string; 
    type?: string; 
    category?: string; 
    limit?: number;
    offset?: number; 
    clientId?: number;
}) => {
    try {
        const limit = params.limit || 50;
        const offset = params.offset || 0;
        
        const filters = [
            eq(products.userId, userId),
            isNull(products.deletedAt)
        ];

        if (params.clientId !== undefined) {
             filters.push(
                 or(
                     not(ilike(products.reference, 'VERRE-%')),
                     and(
                         ilike(products.reference, 'VERRE-%'),
                         eq(products.clientId, params.clientId)
                     )!
                 )!
             );
        } else {
             filters.push(not(ilike(products.reference, 'VERRE-%')));
        }

        if (params.type && params.type !== 'ALL') {
             if (params.type === 'SOLAIRE') {
                 filters.push(or(
                     ilike(products.category, '%solaire%'),
                     ilike(products.categorie, '%solaire%'),
                     ilike(products.nom, '%solaire%')
                 )!);
             } else {
                 filters.push(or(
                     eq(products.productType, params.type as any),
                     eq(products.type, params.type as any)
                 )!);
             }
        }

        if (params.category && params.category !== 'all') {
            filters.push(or(
                eq(products.category, params.category),
                eq(products.categorie, params.category)
            )!);
        }

        if (params.query) {
            const search = `%${params.query}%`;
            filters.push(or(
                ilike(products.nom, search),
                ilike(products.reference, search),
                ilike(products.brand, search),
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
            category: p.category || p.categorie || '',
            categorie: p.category || p.categorie || '',
            brand: p.brand || p.marque || '',
            marque: p.brand || p.marque || '',
            productType: p.productType || p.type || 'accessory',
            modele: p.modele || '',
            couleur: p.couleur || '',
            createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : '',
            tvaRate: Number(p.tvaRate || 20),
            isMedical: p.isMedical || false,
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

        const results = await db.select({
            product: products,
            supplierName: suppliers.name,
            marqueNom: brands.name,
            couleurNom: colors.name
        })
        .from(products)
        .leftJoin(suppliers, eq(products.fournisseurId, suppliers.id))
        .leftJoin(brands, eq(products.marqueId, brands.id))
        .leftJoin(colors, eq(products.couleurId, colors.id))
        .where(and(
            eq(products.id, id), 
            eq(products.userId, userId),
            isNull(products.deletedAt)
        ))
        .limit(1);

        const row = results[0];
        if (!row) return { success: false, error: 'Produit introuvable' };

        const product = row.product;
        const mapped: Product = {
            id: product.id.toString(),
            nomProduit: product.nom,
            reference: product.reference || '',
            category: product.category || product.categorie || '',
            categorie: product.category || product.categorie || '',
            brand: row.marqueNom || product.brand || product.marque || '',
            marque: row.marqueNom || product.brand || product.marque || '',
            marqueNom: row.marqueNom || '',
            couleurNom: row.couleurNom || '',
            couleur: row.couleurNom || product.couleur || '',
            productType: product.productType || product.type || 'accessory',
            fournisseur: product.fournisseur || '',
            fournisseurId: product.fournisseurId || undefined,
            fournisseurNom: row.supplierName || product.fournisseur || '',
            modele: product.modele || '',
            couleur: product.couleur || '',
            prixAchat: Number(product.prixAchat || 0),
            prixVente: Number(product.prixVente || 0),
            quantiteStock: product.quantiteStock || 0,
            seuilAlerte: product.seuilAlerte || 5, // Important: keep for consistency
            description: product.numFacture ? (product.description || '') : (product.description?.startsWith('Facture: ') ? '' : (product.description || '')),
            isActive: product.isActive || false,
            createdAt: product.createdAt ? new Date(product.createdAt).toISOString() : '',
            updatedAt: product.updatedAt ? new Date(product.updatedAt).toISOString() : undefined,
            matiereId: product.matiereId?.toString(),
            couleurId: product.couleurId?.toString(),
            categorieId: product.category || product.categorie || '',
            marqueId: (product.marqueId || '').toString(),
            tvaRate: Number(product.tvaRate || 20),
            isMedical: product.isMedical || false,
            isStockManaged: product.isStockManaged !== false,
            details: product.details || '',
            imageUrl: product.imageUrl || '',
            hasTva: product.hasTva ?? true,
            priceType: (product.priceType || 'TTC') as 'HT' | 'TTC',
            numFacture: product.numFacture || (product.description?.startsWith('Facture: ') ? product.description.replace('Facture: ', '') : ''),
            // @ts-ignore - map to form field
            stockMin: product.seuilAlerte || 5 
        };

        return { success: true, data: mapped };

    } catch (error: any) {
        console.error('💥 Error fetching product:', error);
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
    categorieId: string; 
    marqueId: string;
    matiereId?: string;
    couleurId?: string;
    prixAchat?: number;
    prixVente: number;
    quantiteStock: number;
    stockMin?: number; 
    description?: string;
    imageUrl?: string;
    imageHint?: string;
    category?: string;
    marque?: string; 
    brand?: string;
    productType?: string;
    fournisseur?: string; 
    fournisseurId?: string;
    details?: string; 
    numFacture?: string;
    modele?: string;
    couleur?: string;
    isActive?: boolean;
    hasTva?: boolean;
    tvaRate?: number;
    exemptionNote?: string;
    priceType?: 'HT' | 'TTC'; 
    isMedical?: boolean;
    isStockManaged?: boolean;
}

export const createProduct = secureAction(async (userId, user, data: ProductInput) => {
    try {
        if (!data.nomProduit || data.prixVente === undefined || data.prixVente === null) {
            return { success: false, error: 'Nom et prix de vente requis' };
        }

        const usage = await getClientUsageStats(userId);
        if (usage.products.count >= usage.products.limit) {
             return { success: false, error: `Limite atteinte (${usage.products.limit}).` };
        }

        const reference = data.reference && data.reference.trim() !== '' ? data.reference : `REF-${Date.now()}`;
        const existing = await db.query.products.findFirst({
            where: and(eq(products.userId, userId), eq(products.reference, reference))
        });

        if (existing) return { success: false, error: 'Référence déjà utilisée.' };

        const financials = calculatePrices(Number(data.prixVente), data.priceType || 'TTC', data.hasTva ?? true);
        const categoryVal = data.category || data.categorie || data.categorieId || 'OPTIQUE';
        const brandVal = data.brand || data.marque || data.marqueId || null;

        const [newProduct] = await db.insert(products).values({
            userId,
            nom: data.nomProduit,
            reference: reference,
            category: categoryVal,
            categorie: categoryVal, 
            brand: brandVal,
            marque: brandVal,
            productType: (data.productType as any) || 'accessory',
            fournisseur: data.fournisseur || null,
            fournisseurId: data.fournisseurId || null,
            marqueId: data.marqueId ? parseInt(data.marqueId) : null,
            numFacture: data.numFacture || null,
            modele: data.modele || null,
            couleur: data.couleur || null,
            prixAchat: data.prixAchat ? String(data.prixAchat) : '0',
            prixVente: String(financials.ttc), 
            hasTva: data.hasTva ?? true,
            tvaRate: data.tvaRate ? String(data.tvaRate) : '20.00',
            priceType: data.priceType || 'TTC',
            exemptionNote: data.exemptionNote || null,
            salePriceHT: String(financials.ht),
            salePriceTVA: String(financials.tva),
            salePriceTTC: String(financials.ttc),
            quantiteStock: data.quantiteStock || 0,
            seuilAlerte: data.stockMin || 5,
            description: data.description || null,
            details: data.details || null,
            matiereId: data.matiereId ? parseInt(data.matiereId) : null,
            couleurId: data.couleurId ? parseInt(data.couleurId) : null,
            isActive: true,
            isMedical: data.isMedical || false,
            isStockManaged: data.productType === 'verre' || data.productType === 'lens' ? false : (data.isStockManaged !== false),
            version: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();

        await logSuccess(userId, 'CREATE', 'products', newProduct.id.toString());
        revalidatePath('/dashboard/products', 'page');
        revalidateTag('products');
        return { success: true, data: newProduct };

    } catch (error: any) {
        console.error('Create Error:', error);
        return { success: false, error: error.message };
    }
});

/**
 * Update Product
 */
export const updateProduct = secureAction(async (userId, user, productId: string, data: Partial<ProductFormValues>) => {
    try {
        const id = parseInt(productId);
        if (isNaN(id)) return { success: false, error: 'ID produit invalide' };

        const oldProduct = await db.query.products.findFirst({
            where: and(eq(products.id, id), eq(products.userId, userId))
        });

        if (!oldProduct) return { success: false, error: 'Produit introuvable' };

        const currentPriceVente = data.prixVente !== undefined ? Number(data.prixVente) : Number(oldProduct.prixVente);
        const currentHasTva = data.hasTva !== undefined ? data.hasTva : oldProduct.hasTva;
        const currentPriceType = (data.priceType || (oldProduct as any).priceType || 'TTC') as 'HT' | 'TTC';
        const financials = calculatePrices(currentPriceVente, currentPriceType, currentHasTva);
        
        const categoryVal = data.category || data.categorie || data.categorieId;
        const brandVal = data.brand || data.marque || data.marqueId;

        await db.update(products)
            .set({
                nom: data.nomProduit,
                reference: data.reference,
                category: categoryVal,
                categorie: categoryVal,
                brand: brandVal,
                marque: brandVal,
                productType: data.productType as any,
                fournisseur: data.fournisseur,
                modele: data.modele,
                couleur: data.couleur,
                fournisseurId: data.fournisseurId,
                marqueId: data.marqueId ? parseInt(data.marqueId) : (data.marqueId === null ? null : undefined),
                numFacture: data.numFacture,
                matiereId: data.matiereId ? parseInt(data.matiereId) : (data.matiereId === null ? null : undefined),
                couleurId: data.couleurId ? parseInt(data.couleurId) : (data.couleurId === null ? null : undefined),
                prixAchat: data.prixAchat !== undefined ? data.prixAchat.toString() : undefined,
                prixVente: String(financials.ttc), 
                hasTva: currentHasTva,
                tvaRate: data.tvaRate !== undefined ? String(data.tvaRate) : undefined,
                exemptionNote: data.exemptionNote,
                priceType: currentPriceType,
                salePriceHT: String(financials.ht),
                salePriceTVA: String(financials.tva),
                salePriceTTC: String(financials.ttc),
                quantiteStock: data.quantiteStock,
                seuilAlerte: data.stockMin !== undefined ? data.stockMin : undefined, // Explicit mapping
                description: data.description,
                details: data.details,
                imageUrl: data.imageUrl,
                isActive: data.isActive,
                isMedical: data.isMedical,
                isStockManaged: data.productType === 'verre' || data.productType === 'lens' ? false : data.isStockManaged,
                version: sql`${products.version} + 1`,
                updatedAt: new Date()
            })
            .where(and(eq(products.id, id), eq(products.userId, userId)));

        await logAudit({ userId, entityType: 'product', entityId: productId, action: 'UPDATE', oldValue: oldProduct, newValue: data, success: true });
        revalidatePath('/dashboard/products', 'page');
        revalidatePath(`/dashboard/products/${productId}`, 'page');
        revalidateTag('products');
        return { success: true, message: 'Produit mis à jour' };

    } catch (error: any) {
        console.error('Update Error:', error);
        return { success: false, error: error.message };
    }
});

/**
 * Update Stock
 */
export const updateStock = secureAction(async (userId, user, { productId, quantity, type, reason }: { productId: string, quantity: number, type: 'IN' | 'OUT', reason: string }) => {
    const id = parseInt(productId);
    if (isNaN(id)) return { success: false, error: 'ID produit invalide' };

    try {
        return await db.transaction(async (tx: any) => {
            const product = await tx.query.products.findFirst({
                where: and(eq(products.id, id), eq(products.userId, userId))
            });
            
            if (!product) throw new Error('Produit introuvable');
            const currentStock = Number(product.quantiteStock || 0);
            const newStock = type === 'IN' ? currentStock + quantity : currentStock - quantity;
            if (type === 'OUT' && newStock < 0) throw new Error('Stock insuffisant');

            await tx.update(products).set({ quantiteStock: newStock, updatedAt: new Date() }).where(eq(products.id, id));
            await tx.insert(stockMovements).values({ userId, productId: id, type, quantite: quantity, notes: reason, createdAt: new Date() });
            
            revalidatePath('/dashboard/products', 'page');
            revalidateTag('products');
            return { success: true, newStock };
        });
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Delete Product
 */
export const deleteProduct = secureAction(async (userId, user, productId: string) => {
    try {
        const id = parseInt(productId);
        if (isNaN(id)) return { success: false, error: 'ID produit invalide' };

        await db.update(products).set({ deletedAt: new Date(), version: sql`${products.version} + 1` }).where(and(eq(products.id, id), eq(products.userId, userId)));
        
        revalidatePath('/dashboard/products', 'page');
        revalidateTag('products');
        return { success: true };
    } catch (error: any) {
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
            .where(
                and(
                    eq(products.userId, userId), 
                    isNull(products.deletedAt),
                    eq(products.isStockManaged, true),
                    lte(products.quantiteStock, sql`COALESCE(${products.seuilAlerte}, ${threshold || 5})`)
                )
            )
            .orderBy(asc(products.quantiteStock));
        const mapped = results.map((p: any) => ({ id: p.id.toString(), name: p.nom, stock: p.quantiteStock, minStock: p.seuilAlerte }));
        return { success: true, data: mapped };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Get categories
 */
export const getCategories = secureAction(async (userId, user) => {
    try {
        const results = await db.selectDistinct({ category: products.categorie }).from(products).where(and(eq(products.userId, userId), isNull(products.deletedAt), sql`${products.categorie} IS NOT NULL AND ${products.categorie} != ''`)).orderBy(asc(products.categorie));
        return { success: true, data: results.map((r: any) => ({ id: r.category, name: r.category })) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Get brands
 */
export const getBrands = secureAction(async (userId, user) => {
    try {
        const results = await db.selectDistinct({ brand: products.marque }).from(products).where(and(eq(products.userId, userId), isNull(products.deletedAt), sql`${products.marque} IS NOT NULL AND ${products.marque} != ''`)).orderBy(asc(products.marque));
        return { success: true, data: results.map((r: any) => ({ id: r.brand, name: r.brand })) };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Create Bulk Products
 */
export const createBulkProducts = secureAction(async (userId, user, data: { items: ProductInput[], invoiceData?: { fournisseurId?: string, numFacture?: string, dateAchat?: Date } }) => {
    try {
        const { invoiceData } = data;
        const supplierId = String((invoiceData as any)?.fournisseurId || 'unknown').toLowerCase().trim();
        const invoiceNum = invoiceData?.numFacture?.trim();
        const invoiceDate = invoiceData?.dateAchat || new Date();

        await db.transaction(async (tx: any) => {
            for (const item of data.items) {
                const reference = item.reference || `REF-${Date.now()}-${Math.random()}`;
                const financials = calculatePrices(Number(item.prixVente), item.priceType || 'TTC', item.hasTva ?? true);
                
                await tx.insert(products).values({
                    userId,
                    nom: item.nomProduit,
                    reference,
                    categorie: item.categorie || item.categorieId,
                    category: item.categorie || item.categorieId,
                    marque: item.marque,
                    brand: item.marque,
                    modele: item.modele,
                    couleur: item.couleur,
                    fournisseur: item.fournisseur || null,
                    fournisseurId: (invoiceData?.fournisseurId && invoiceData.fournisseurId !== 'unknown') ? invoiceData.fournisseurId : null,
                    marqueId: item.marqueId ? parseInt(item.marqueId) : null,
                    numFacture: invoiceNum || null,
                    prixAchat: String(item.prixAchat || 0),
                    prixVente: String(financials.ttc),
                    salePriceHT: String(financials.ht),
                    salePriceTVA: String(financials.tva),
                    salePriceTTC: String(financials.ttc),
                    hasTva: item.hasTva ?? true,
                    priceType: item.priceType || 'TTC',
                    quantiteStock: Number(item.quantiteStock || 0),
                    seuilAlerte: item.stockMin || 5,
                    description: item.description || null,
                    details: item.details || null,
                    matiereId: item.matiereId ? parseInt(item.matiereId) : null,
                    couleurId: item.couleurId ? parseInt(item.couleurId) : null,
                    isActive: true,
                    isMedical: item.isMedical || false,
                    isStockManaged: item.productType === 'verre' || item.productType === 'lens' ? false : (item.isStockManaged !== false),
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    version: 0
                });
            }
            if (invoiceNum) {
                await tx.insert(invoiceImports).values({ userId, supplierId, invoiceNumber: invoiceNum, invoiceDate, totalItems: data.items.length, status: 'completed' });
            }
        });

        revalidatePath('/dashboard/products', 'page');
        revalidateTag('products');
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Inventory Stats
 */
export const getInventoryStats = secureAction(async (userId, user) => {
    try {
        const stats = await db.select({
            totalProducts: sql<number>`count(*)::int`,
            totalStockValue: sql<number>`COALESCE(sum(CAST(${products.prixAchat} AS decimal) * ${products.quantiteStock}), 0)::float`,
            lowStockCount: sql<number>`count(*) filter (where 
                ${products.isStockManaged} = true AND 
                ${products.quantiteStock} <= COALESCE(${products.seuilAlerte}, 5)
            )::int`,
            outOfStockCount: sql<number>`count(*) filter (where 
                ${products.isStockManaged} = true AND 
                ${products.quantiteStock} <= 0
            )::int`,
        }).from(products).where(and(eq(products.userId, userId), isNull(products.deletedAt)));
        return { success: true, data: stats[0] };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});
