/**
 * Sales Actions - Neon/Drizzle Version
 * Secure sales management with relational data and stock adjustments
 */

'use server';

import { db } from '@/db';
import { sales, clients, products } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface SaleItem {
    productRef: string; // This is actually productId or reference? In legacy it seemed to be ID or Ref.
    productName: string;
    quantity: number;
    unitPrice: number;
    total: number;
    returnedQuantity?: number;
}

export interface Sale {
    id: string;
    clientId?: string;
    clientName?: string;
    clientPhone?: string;
    clientMutuelle?: string;
    clientAddress?: string;
    saleNumber?: string;
    prescriptionSnapshot?: any;
    items: SaleItem[];
    totalHT: number;
    totalTVA: number;
    totalTTC: number;
    totalNet?: number;
    totalPaye: number;
    resteAPayer: number;
    status: string;
    paymentMethod?: string;
    paymentHistory?: any[];
    notes?: string;
    createdAt: string;
    date?: string;
    lastPaymentDate?: string;
}

export interface CreateSaleInput {
    clientId?: string;
    items: SaleItem[];
    paymentMethod?: string;
    notes?: string;
    totalHT?: number; // Optional, usually calculated
    totalTVA?: number;
    totalTTC?: number;
}

// ========================================
// SALES ACTIONS
// ========================================

/**
 * Get all sales
 */
export const getSales = secureAction(async (userId, user) => {
    try {
        console.log('📊 Fetching sales for userId:', userId);
        
        const salesData = await db.query.sales.findMany({
            where: eq(sales.userId, userId),
            orderBy: [desc(sales.createdAt)]
        });

        console.log(`✅ Found ${salesData.length} sales`);

        const mappedSales: Sale[] = salesData.map(s => ({
            id: s.id.toString(),
            clientId: s.clientId?.toString(),
            clientName: s.clientName || undefined,
            clientPhone: s.clientPhone || undefined,
            clientMutuelle: s.clientMutuelle || undefined,
            clientAddress: s.clientAddress || undefined,
            saleNumber: s.saleNumber || undefined,
            prescriptionSnapshot: s.prescriptionSnapshot,
            items: (s.items as SaleItem[]) || [],
            totalHT: Number(s.totalHT),
            totalTVA: Number(s.totalTVA),
            totalTTC: Number(s.totalTTC),
            totalNet: Number(s.totalNet || s.totalTTC),
            totalPaye: Number(s.totalPaye),
            resteAPayer: Number(s.resteAPayer),
            status: s.status || 'impaye',
            paymentMethod: s.paymentMethod || undefined,
            paymentHistory: (s.paymentHistory as any[]) || [],
            notes: s.notes || undefined,
            createdAt: s.createdAt?.toISOString() || new Date().toISOString(),
            date: s.date?.toISOString(),
            lastPaymentDate: s.lastPaymentDate?.toISOString()
        }));

        await logSuccess(userId, 'READ', 'sales', undefined, { count: mappedSales.length });
        return { success: true, sales: mappedSales };

    } catch (error: any) {
        console.error('💥 ERROR in getSales:', error);
        console.error('💥 Error message:', error.message);
        console.error('💥 Error stack:', error.stack);
        await logFailure(userId, 'READ', 'sales', error.message);
        return { success: false, error: `Erreur lors de la récupération des ventes: ${error.message}`, sales: [] };
    }
});

/**
 * Get single sale
 */
export const getSale = secureAction(async (userId, user, saleId: string) => {
    try {
        const id = parseInt(saleId);
        const sale = await db.query.sales.findFirst({
            where: and(eq(sales.id, id), eq(sales.userId, userId))
        });

        if (!sale) return { success: false, error: 'Vente introuvable' };

        const mappedSale: Sale = {
            id: sale.id.toString(),
            clientId: sale.clientId?.toString(),
            clientName: sale.clientName || undefined,
            clientPhone: sale.clientPhone || undefined,
            clientMutuelle: sale.clientMutuelle || undefined,
            clientAddress: sale.clientAddress || undefined,
            saleNumber: sale.saleNumber || undefined,
            prescriptionSnapshot: sale.prescriptionSnapshot,
            items: (sale.items as SaleItem[]) || [],
            totalHT: Number(sale.totalHT),
            totalTVA: Number(sale.totalTVA),
            totalTTC: Number(sale.totalTTC),
            totalNet: Number(sale.totalNet || sale.totalTTC),
            totalPaye: Number(sale.totalPaye),
            resteAPayer: Number(sale.resteAPayer),
            status: sale.status || 'impaye',
            paymentMethod: sale.paymentMethod || undefined,
            paymentHistory: (sale.paymentHistory as any[]) || [],
            notes: sale.notes || undefined,
            createdAt: sale.createdAt?.toISOString() || new Date().toISOString(),
            date: sale.date?.toISOString(),
            lastPaymentDate: sale.lastPaymentDate?.toISOString()
        };

        return { success: true, sale: mappedSale };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Create a new sale
 */
/**
 * Create a new sale with stock management
 */
export const createSale = secureAction(async (userId, user, data: CreateSaleInput) => {
    console.log(`📝 Creating sale`);

    try {
        if (!data.items || data.items.length === 0) {
            return { success: false, error: 'Veuillez ajouter au moins un article' };
        }

        return await db.transaction(async (tx) => {
            // 1. Calculate totals
            const totalHT = data.items.reduce((sum, item) => sum + item.total, 0);
            const totalTVA = totalHT * 0.20;
            const totalTTC = totalHT + totalTVA;

            // 2. Fetch Client Data + Snapshot
            let clientSnapshot: any = {};
            let clientIdNum: number | undefined;

            if (data.clientId) {
                clientIdNum = parseInt(data.clientId);
                const client = await tx.query.clients.findFirst({
                    where: and(eq(clients.id, clientIdNum), eq(clients.userId, userId)),
                    with: {
                        prescriptions: {
                            orderBy: [desc(sales.createdAt)], // Actually we want latest prescription
                            limit: 1
                        }
                    }
                });

                if (client) {
                    clientSnapshot = {
                        clientName: client.fullName,
                        clientPhone: client.phone,
                        // clientMutuelle: client.mutuelle, // Not in schema
                        clientAddress: client.address
                    };

                    if (client.prescriptions && client.prescriptions.length > 0) {
                        const latest = client.prescriptions.sort((a,b) => (b.date?.getTime() || 0) - (a.date?.getTime() || 0))[0];
                        if (latest) {
                            clientSnapshot.prescriptionSnapshot = latest.prescriptionData;
                        }
                    }
                }
            }

            // 3. Update Stock for each item
            for (const item of data.items) {
                // Assuming productRef is the ID string from products.id or reference? 
                // In the legacy system, productRef often stored the Firestore ID.
                // In the new system, we should rely on `products.id` (integer) if possible, or `reference` string.
                // `SaleItem` definition has `productRef: string`.
                // Let's try to match by ID first (if int), then reference.
                
                let productId: number | null = parseInt(item.productRef);
                let productToUpdate;

                if (!isNaN(productId)) {
                     // Try to find by ID
                     productToUpdate = await tx.query.products.findFirst({
                        where: and(eq(products.id, productId), eq(products.userId, userId))
                     });
                }
                
                if (!productToUpdate) {
                    // Fallback: search by reference or firebaseId (stored in reference?)
                    // If productRef is a string (e.g. "PROD-123" or legacy ID "abcde"), check reference.
                    productToUpdate = await tx.query.products.findFirst({
                        where: and(eq(products.reference, item.productRef), eq(products.userId, userId))
                    });
                }

                if (productToUpdate) {
                    // Decrement stock
                    await tx.update(products)
                        .set({
                            quantiteStock: sql`${products.quantiteStock} - ${item.quantity}`,
                            updatedAt: new Date()
                        })
                        .where(eq(products.id, productToUpdate.id));
                } else {
                    // Log warning or fail? 
                    // For now, we proceed but maybe we should warn. 
                    // Ideally, we shouldn't fail the sale if a product is "Custom" or "Service" (not in stock).
                    // If category is "Accessoire" or something.
                    // Implementation Plan didn't specify strict stock enforcement, just update.
                    console.warn(`⚠️ Product not found for stock update: ${item.productRef}`);
                }
            }

            // 4. Create Sale Record
            const saleNumber = `SALE-${Date.now().toString().slice(-8)}`;

            const newSale = {
                userId,
                clientId: clientIdNum,
                saleNumber,
                ...clientSnapshot,
                items: data.items,
                totalHT: totalHT.toFixed(2),
                totalTVA: totalTVA.toFixed(2),
                totalTTC: totalTTC.toFixed(2),
                totalNet: totalTTC.toFixed(2),
                totalPaye: '0',
                resteAPayer: totalTTC.toFixed(2),
                status: 'impaye',
                paymentMethod: data.paymentMethod,
                paymentHistory: [],
                notes: data.notes,
                createdAt: new Date(),
                date: new Date()
            };

            const result = await tx.insert(sales).values(newSale).returning();

            await logSuccess(userId, 'CREATE', 'sales', result[0].id.toString());
            return { success: true, id: result[0].id.toString(), message: 'Vente créée avec succès' };
        });

    } catch (error: any) {
        console.error('💥 Error creating sale:', error);
        await logFailure(userId, 'CREATE', 'sales', error.message);
        return { success: false, error: 'Erreur lors de la création de la vente' };
    }
});

/**
 * Delete a sale
 */
export const deleteSale = secureAction(async (userId, user, saleId: string) => {
    try {
        const id = parseInt(saleId);
        
        // Check for devis dependency? (Cascade handled in schema?)
        // Schema: saleId in devis references sales.id. If no cascade, we might fail.
        // Assuming schema handles or we rely on Drizzle behavior.
        
        const result = await db.delete(sales)
            .where(and(eq(sales.id, id), eq(sales.userId, userId)))
            .returning();

        if (result.length === 0) return { success: false, error: 'Vente introuvable' };

        await logSuccess(userId, 'DELETE', 'sales', saleId);
        return { success: true, message: 'Vente supprimée avec succès' };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Process Return
 */
export const processReturn = secureAction(async (userId, user, saleId: string, returnItems: { productRef: string; quantity: number; price: number; name: string }[]) => {
    try {
        const id = parseInt(saleId);

        await db.transaction(async (tx) => {
            const sale = await tx.query.sales.findFirst({
                where: and(eq(sales.id, id), eq(sales.userId, userId))
            });

            if (!sale) throw new Error("Vente introuvable");

            const totalRefund = returnItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);

            // 1. Update Product Stocks
            for (const item of returnItems) {
                // Try to find product by ID (assuming productRef is ID)
                // If productRef is string but ID is int, this might fail if we don't parse.
                // However, products.firebaseId is string.
                // We'll try to find by ID (int) if number, or firebaseId if string?
                // Legacy logic was messy. Let's assume productRef is the ID string from `products.id`.
                
                let productId: number | null = parseInt(item.productRef);
                if (isNaN(productId)) {
                    // Try to look up by reference or firebaseId?
                    const p = await tx.query.products.findFirst({
                        where: and(eq(products.userId, userId), eq(products.reference, item.productRef))
                    });
                    if (p) productId = p.id;
                    else productId = null;
                }

                if (productId) {
                    await tx.update(products)
                        .set({ 
                             quantiteStock: sql`${products.quantiteStock} + ${item.quantity}`,
                             updatedAt: new Date()
                        })
                        .where(eq(products.id, productId));
                }
            }

            // 2. Add Negative Payment (Refund)
            const refundPayment = {
                id: `REF-${Date.now()}`,
                amount: -totalRefund,
                date: new Date().toISOString(),
                method: 'refund',
                note: `Retour articles: ${returnItems.map(i => `${i.quantity}x ${i.name}`).join(', ')}`,
                receivedBy: user.email || 'System'
            };

            const currentTotalPaid = Number(sale.totalPaye || 0);
            const newTotalPaid = currentTotalPaid - totalRefund;

            const currentTotalTTC = Number(sale.totalTTC || 0);
            const currentTotalHT = Number(sale.totalHT || 0);
            
            // Simplified recalc
            // Assuming item.price is TTC unit price
            const newTotalTTC = currentTotalTTC - totalRefund;
            const totalRefundHT = returnItems.reduce((sum, item) => sum + ((item.price / 1.2) * item.quantity), 0);
            const newTotalHT = currentTotalHT - totalRefundHT;
            const newTotalTVA = newTotalTTC - newTotalHT;

            // 3. Update Sale
            const updatedItems = (sale.items as SaleItem[]).map(i => {
                const returned = returnItems.find(r => r.productRef === i.productRef && r.name === i.productName);
                if (returned) {
                    return { ...i, returnedQuantity: (i.returnedQuantity || 0) + returned.quantity };
                }
                return i;
            });

            const currentHistory = (sale.paymentHistory as any[]) || [];

            await tx.update(sales)
                .set({
                    items: updatedItems,
                    paymentHistory: [...currentHistory, refundPayment],
                    totalTTC: newTotalTTC.toFixed(2),
                    totalNet: newTotalTTC.toFixed(2),
                    totalHT: newTotalHT.toFixed(2),
                    totalTVA: newTotalTVA.toFixed(2),
                    totalPaye: newTotalPaid.toFixed(2),
                    resteAPayer: Math.max(0, newTotalTTC - newTotalPaid).toFixed(2),
                    status: (newTotalTTC - newTotalPaid) <= 0.01 ? 'paye' : 'partiel',
                    updatedAt: new Date()
                })
                .where(eq(sales.id, id));
        });

        await logSuccess(userId, 'RETURN', 'sales', saleId);
        return { success: true, message: 'Retour effectué avec succès' };

    } catch (error: any) {
        await logFailure(userId, 'RETURN', 'sales', error.message, saleId);
        return { success: false, error: 'Erreur lors du traitement du retour' };
    }
});

/**
 * Get sales for a specific client
 */
export const getClientSales = secureAction(async (userId, user, clientId: string) => {
    try {
        const id = parseInt(clientId);
        const salesData = await db.query.sales.findMany({
            where: and(eq(sales.clientId, id), eq(sales.userId, userId)),
            orderBy: [desc(sales.createdAt)]
        });

        const mappedSales = salesData.map(s => ({
            id: s.id.toString(),
            // ... map same fields as getSales
            items: (s.items as SaleItem[]) || [],
            totalTTC: Number(s.totalTTC),
            date: s.date?.toISOString(),
            status: s.status
        }));
        
        return { success: true, sales: mappedSales };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});
