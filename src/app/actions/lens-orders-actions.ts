'use server';

import { db } from '@/db';
import { 
    lensOrders, 
    clients, 
    prescriptionsLegacy, 
    supplierOrders, 
    suppliers, 
    supplierOrderItems, 
    reminders, 
    products,
    notifications
} from '@/db/schema';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';
import { eq, and, desc, lt, gt, inArray, sql, isNull, gte } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { LensOrderSchema } from '@/lib/validations/optical';
import { redis } from '@/lib/cache/redis';
import { subMonths } from 'date-fns';
import { auditLogs } from '@/db/schema';
import { createNotification } from '@/features/notifications/services/create-notification';

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface LensOrderInput {
  clientId: number;
  prescriptionId?: number | null;
  supplierId?: string | null;
  orderType: 'progressive' | 'bifocal' | 'unifocal' | 'contact';
  lensType: string;
  treatment?: string | null;
  supplierName: string;
  
  // Explicit Eye Prescription (Replacing JSON)
  sphereR?: string | null;
  cylindreR?: string | null;
  axeR?: string | null;
  additionR?: string | null;
  hauteurR?: string | null;
  
  sphereL?: string | null;
  cylindreL?: string | null;
  axeL?: string | null;
  additionL?: string | null;
  hauteurL?: string | null;
  ecartPupillaireR?: string | null;
  ecartPupillaireL?: string | null;
  diameterR?: string | null;
  diameterL?: string | null;

  matiere?: string | null;
  indice?: string | null;
  
  // Professional Pricing Workflow
  sellingPrice: number;           // Prix de vente client (obligatoire)
  estimatedBuyingPrice?: number;  // Prix d'achat estimé (optionnel)
  
  // Legacy fields (kept for compat)
  unitPrice: number;
  quantity: number;
  totalPrice: number;
  
  status?: 'pending' | 'ordered' | 'received' | 'delivered';
  notes?: string;
}

export interface LensOrder {
  id: number;
  userId: string;
  clientId: number;
  prescriptionId: number | null;
  orderType: string;
  lensType: string;
  treatment: string | null;
  supplierName: string;
  // Explicit Eye Prescription
  sphereR: string | null;
  cylindreR: string | null;
  axeR: string | null;
  additionR: string | null;
  hauteurR: string | null;
  
  sphereL: string | null;
  cylindreL: string | null;
  axeL: string | null;
  additionL: string | null;
  hauteurL: string | null;
  ecartPupillaireR: string | null;
  ecartPupillaireL: string | null;
  diameterR: string | null;
  diameterL: string | null;

  matiere: string | null;
  indice: string | null;
  
  // Professional Pricing
  sellingPrice: string;
  estimatedBuyingPrice: string | null;
  finalBuyingPrice: string | null;
  supplierInvoiceRef: string | null;
  deliveryNoteRef: string | null;
  estimatedMargin: string | null;
  finalMargin: string | null;
  
  // Legacy
  unitPrice: string;
  quantity: number;
  totalPrice: string;
  
  status: string;
  orderDate: Date | null;
  receivedDate: Date | null;
  deliveredDate: Date | null;
  notes: string | null;
  amountPaid: string | null; // ✅ Avance versée à la commande
  createdAt: Date | null;
  updatedAt: Date | null;
}

export type BulkReceiveParams = {
  orderIds: number[]
  blNumber: string
  purchasePrices: Record<number, number>
}

export type BulkReceiveResult = {
  success: true
  supplierOrderId: number
  productsCreated: number
  receivedOrders: {
    id: number
    clientName: string
    clientPhone: string
  }[]
}

// ========================================
// LENS ORDER ACTIONS
// ========================================


// Helper for friendly error messages
const getFriendlyErrorMessage = (error: any): string => {
  const msg = error?.message || '';
  if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED') || msg.includes('connection error')) {
    return "Problème de connexion à la base de données. Veuillez vérifier votre connexion internet.";
  }
  return msg;
};

/**
 * Get all lens orders for user
 */
export const getLensOrders = secureAction(async (userId, user) => {
  try {
    const results = await db.select({
      lensOrder: lensOrders,
      client: {
        id: clients.id,
        fullName: clients.fullName,
        phone: clients.phone,
        email: clients.email,
      },
      prescriptionLegacy: prescriptionsLegacy
    })
    .from(lensOrders)
    .leftJoin(clients, eq(lensOrders.clientId, clients.id))
    .leftJoin(prescriptionsLegacy, eq(lensOrders.prescriptionId, prescriptionsLegacy.id))
    .where(eq(lensOrders.userId, userId))
    .orderBy(desc(lensOrders.createdAt));
    
    const mapped = results.map(({ lensOrder, client, prescriptionLegacy }) => ({
      ...lensOrder,
      client: client || null,
      prescriptionLegacy: prescriptionLegacy || null,
      totalPrice: lensOrder.totalPrice?.toString() || '0',
      unitPrice: lensOrder.unitPrice?.toString() || '0',
      sellingPrice: lensOrder.sellingPrice?.toString() || '0',
      orderDate: lensOrder.orderDate instanceof Date ? lensOrder.orderDate.toISOString() : lensOrder.orderDate,
      receivedDate: lensOrder.receivedDate instanceof Date ? lensOrder.receivedDate.toISOString() : lensOrder.receivedDate,
      deliveredDate: lensOrder.deliveredDate instanceof Date ? lensOrder.deliveredDate.toISOString() : lensOrder.deliveredDate,
      createdAt: lensOrder.createdAt instanceof Date ? lensOrder.createdAt.toISOString() : lensOrder.createdAt,
      updatedAt: lensOrder.updatedAt instanceof Date ? lensOrder.updatedAt.toISOString() : lensOrder.updatedAt,
    }));

    await logSuccess(userId, 'READ', 'lens_orders', 'list', { count: results.length });
    return { success: true, data: mapped };

  } catch (error: any) {
    console.error('💥 Error fetching all lens orders:', error);
    await logFailure(userId, 'READ', 'lens_orders', error.message);
    const friendlyMsg = getFriendlyErrorMessage(error);
    return { 
      success: false, 
      error: `Erreur récupération commandes: ${friendlyMsg}` 
    };
  }
});

/**
 * Get lens orders for specific client
 */
export const getClientLensOrders = secureAction(async (userId, user, clientId: string) => {
  try {
    const clientIdNum = parseInt(clientId);
    const results = await db.select({
      lensOrder: lensOrders,
      prescriptionLegacy: prescriptionsLegacy
    })
    .from(lensOrders)
    .leftJoin(prescriptionsLegacy, eq(lensOrders.prescriptionId, prescriptionsLegacy.id))
    .where(and(
      eq(lensOrders.userId, userId),
      eq(lensOrders.clientId, clientIdNum)
    ))
    .orderBy(desc(lensOrders.createdAt));
    
    // ... mapping code ...
    const mapped = results.map(({ lensOrder, prescriptionLegacy }) => ({
      ...lensOrder,
      prescriptionLegacy: prescriptionLegacy || null,
      totalPrice: lensOrder.totalPrice?.toString() || '0',
      unitPrice: lensOrder.unitPrice?.toString() || '0',
      sellingPrice: lensOrder.sellingPrice?.toString() || '0',
      amountPaid: lensOrder.amountPaid?.toString() || '0', // ✅ Avance versée
      orderDate: lensOrder.orderDate instanceof Date ? lensOrder.orderDate.toISOString() : lensOrder.orderDate,
      receivedDate: lensOrder.receivedDate instanceof Date ? lensOrder.receivedDate.toISOString() : lensOrder.receivedDate,
      deliveredDate: lensOrder.deliveredDate instanceof Date ? lensOrder.deliveredDate.toISOString() : lensOrder.deliveredDate,
      createdAt: lensOrder.createdAt instanceof Date ? lensOrder.createdAt.toISOString() : lensOrder.createdAt,
      updatedAt: lensOrder.updatedAt instanceof Date ? lensOrder.updatedAt.toISOString() : lensOrder.updatedAt,
    }));

    console.log('🟢 [getClientLensOrders] Sample amountPaid from DB:', mapped.slice(0, 3).map((o: { id: number; amountPaid: string | null }) => ({ id: o.id, amountPaid: o.amountPaid })));
    
    await logSuccess(userId, 'READ', 'lens_orders', `client-${clientId}`, { clientId, count: results.length });
    return { success: true, data: mapped };

  } catch (error: any) {
    console.error('💥 Error fetching client lens orders:', error);
    const friendlyMsg = getFriendlyErrorMessage(error);
    await logFailure(userId, 'READ', 'lens_orders', error.message, `client-${clientId}`);
    return { 
      success: false, 
      error: `Erreur lors de la récupération: ${friendlyMsg}` 
    };
  }
});

// ... (getLensOrder omitted to save tokens if strictly not needed, or include if you wish)

/**
 * Create lens order
 */
export const createLensOrder = secureAction(async (userId, user, rawInput: LensOrderInput) => {
  try {
    const input: any = LensOrderSchema.parse(rawInput);
    
    if (isNaN(input.sellingPrice)) input.sellingPrice = 0;
    if (isNaN(input.estimatedBuyingPrice)) input.estimatedBuyingPrice = 0;

    const result = await db.transaction(async (tx: any) => {
        const clientExists = await tx.query.clients.findFirst({
            where: and(eq(clients.id, input.clientId), eq(clients.userId, userId)),
            columns: { id: true, fullName: true }
        });
        
        if (!clientExists) {
            throw new Error('Client introuvable');
        }

        let supplierId = input.supplierId || null;
        let supplierOrderId = null;
        let supplierName = input.supplierName || 'A commander';

        if (supplierId) {
            const supplier = await tx.query.suppliers.findFirst({
                where: and(eq(suppliers.id, supplierId), eq(suppliers.userId, userId))
            });
            if (supplier) {
                supplierName = supplier.name;
            }
        } else if (input.supplierName) {
            const supplier = await tx.query.suppliers.findFirst({
                where: and(eq(suppliers.name, input.supplierName), eq(suppliers.userId, userId))
            });
            if (supplier) {
                supplierId = supplier.id;
            }
        }

        if (supplierId) {
            const items = [];
            if (input.sphereR || input.cylindreR || input.axeR) {
                items.push({ 
                    side: 'OD', 
                    type: input.lensType,
                    sphere: input.sphereR,
                    cylindre: input.cylindreR,
                    axe: input.axeR,
                    addition: input.additionR,
                    hauteur: input.hauteurR,
                    ecartPupillaire: input.ecartPupillaireR,
                    diameter: input.diameterR
                });
            }
            if (input.sphereL || input.cylindreL || input.axeL) {
                items.push({ 
                    side: 'OG', 
                    type: input.lensType,
                    sphere: input.sphereL,
                    cylindre: input.cylindreL,
                    axe: input.axeL,
                    addition: input.additionL,
                    hauteur: input.hauteurL,
                    ecartPupillaire: input.ecartPupillaireL,
                    diameter: input.diameterL
                });
            }

            const [so] = await tx.insert(supplierOrders).values({
                userId,
                supplierId,
                fournisseur: supplierName,
                dateCommande: new Date(),
                statut: 'EN_COURS',
                deliveryStatus: 'PENDING',
                orderReference: `LENS-${input.clientId}-${Date.now().toString().slice(-4)}`,
                items: items,
                montantTotal: '0',
                createdAt: new Date()
            }).returning();
            
            supplierOrderId = so.id;
        }

        const [created] = await tx.insert(lensOrders)
            .values({
                userId,
                clientId: input.clientId,
                orderType: input.orderType,
                lensType: input.lensType,
                treatment: input.treatment || null,
                supplierName: supplierName,
                
                sphereR: input.sphereR?.toString() || null,
                cylindreR: input.cylindreR?.toString() || null,
                axeR: input.axeR?.toString() || null,
                additionR: input.additionR?.toString() || null,
                hauteurR: input.hauteurR?.toString() || null,
                sphereL: input.sphereL?.toString() || null,
                cylindreL: input.cylindreL?.toString() || null,
                axeL: input.axeL?.toString() || null,
                additionL: input.additionL?.toString() || null,
                hauteurL: input.hauteurL?.toString() || null,
                ecartPupillaireR: input.ecartPupillaireR?.toString() || null,
                ecartPupillaireL: input.ecartPupillaireL?.toString() || null,
                diameterR: input.diameterR?.toString() || null,
                diameterL: input.diameterL?.toString() || null,
                
                sellingPrice: input.sellingPrice.toString(),
                unitPrice: input.unitPrice.toString(),
                quantity: input.quantity,
                totalPrice: (input.sellingPrice * input.quantity).toString(),
                
                status: 'pending',
                orderDate: new Date(),
                notes: input.notes || null,
                supplierId: supplierId || null,
                supplierOrderId: supplierOrderId || null
            })
            .returning();

        const clientName = clientExists.fullName || 'Client Inconnu';
        
        // 🚀 Atomicité stricte: Notification sauvegardée dans la même transaction
        // Si l'une des deux opérations échoue, TOUT est annulé.
        await createNotification(tx, {
            userId: userId,
            type: 'LENS_ORDER_PENDING',
            title: 'Commande de verres en attente',
            message: `La commande de verres pour le client ${clientName} est en attente de traitement.`,
            priority: 'MEDIUM',
            relatedEntityType: 'lens_order',
            relatedEntityId: created.id
        });

        return { created, clientFullName: clientExists.fullName };
    });
    
    await logSuccess(userId, 'CREATE', 'lens_orders', result.created.id.toString(), {
        clientId: input.clientId,
        orderType: input.orderType,
        supplier: result.created.supplierName,
        price: input.sellingPrice
    });

    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/clients/${input.clientId}`);
    
    return { 
      success: true, 
      message: 'Commande de verres créée avec succès',
      data: result.created 
    };

  } catch (error: any) {
    console.error("❌ Lens Order Creation Failed:", error);
    await logFailure(userId, 'CREATE', 'lens_orders', error.message);
    return { 
      success: false, 
      error: getFriendlyErrorMessage(error)
    };
  }
});

/**
 * Update lens order
 */
export const updateLensOrder = secureAction(
  async (userId, user, orderId: string, input: Partial<LensOrderInput>) => {
    try {
      const orderIdNum = parseInt(orderId);

      const existing = await db.select().from(lensOrders)
        .where(and(eq(lensOrders.id, orderIdNum), eq(lensOrders.userId, userId)))
        .limit(1);
      
      if (existing.length === 0) {
        return { success: false, error: 'Commande de verres introuvable' };
      }

      const updateData: any = { updatedAt: new Date() };
      
      if (input.orderType) updateData.orderType = input.orderType;
      if (input.lensType) updateData.lensType = input.lensType;
      if (input.treatment !== undefined) updateData.treatment = input.treatment;
      if (input.supplierId) updateData.supplierId = input.supplierId;
      if (input.supplierName) updateData.supplierName = input.supplierName;
      
      // Explicit Prescription Update
      if (input.sphereR !== undefined) updateData.sphereR = input.sphereR;
      if (input.cylindreR !== undefined) updateData.cylindreR = input.cylindreR;
      if (input.axeR !== undefined) updateData.axeR = input.axeR;
      if (input.additionR !== undefined) updateData.additionR = input.additionR;
      if (input.hauteurR !== undefined) updateData.hauteurR = input.hauteurR;
      
      if (input.sphereL !== undefined) updateData.sphereL = input.sphereL;
      if (input.cylindreL !== undefined) updateData.cylindreL = input.cylindreL;
      if (input.axeL !== undefined) updateData.axeL = input.axeL;
      if (input.additionL !== undefined) updateData.additionL = input.additionL;
      if (input.hauteurL !== undefined) updateData.hauteurL = input.hauteurL;

      if (input.matiere !== undefined) updateData.matiere = input.matiere;
      if (input.indice !== undefined) updateData.indice = input.indice;

      if (input.unitPrice) updateData.unitPrice = input.unitPrice.toString();
      if (input.quantity) updateData.quantity = input.quantity;
      if (input.totalPrice) updateData.totalPrice = input.totalPrice.toString();
      if (input.status) updateData.status = input.status;
      if (input.notes !== undefined) updateData.notes = input.notes;

      const [updated] = await db.update(lensOrders)
        .set(updateData)
        .where(eq(lensOrders.id, orderIdNum))
        .returning();
      
      await logSuccess(userId, 'UPDATE', 'lens_orders', orderId);

      revalidatePath('/dashboard/clients');
      revalidatePath(`/dashboard/clients/${updated.clientId}`);
      
      return { success: true, message: 'Commande de verres mise à jour', data: updated };

    } catch (error: any) {
      await logFailure(userId, 'UPDATE', 'lens_orders', error.message, orderId);
      return { 
        success: false, 
        error: 'Erreur lors de la mise à jour de la commande' 
      };
    }
  }
);

/**
 * Mark order as received
 */

/**
 * Get billable lens orders for a client (pending/ordered/received AND not billed)
 */
export const getPendingLensOrders = secureAction(async (userId, user, clientId: string) => {
  try {
    const clientIdNum = parseInt(clientId);
    if (isNaN(clientIdNum)) {
        return { success: false, error: 'ID Client invalide' };
    }

    // Commandes non encore facturées (saleId NULL)
    const results = await db.select({
      lensOrder: lensOrders,
      prescriptionLegacy: prescriptionsLegacy
    })
    .from(lensOrders)
    .leftJoin(prescriptionsLegacy, eq(lensOrders.prescriptionId, prescriptionsLegacy.id))
    .where(and(
      eq(lensOrders.userId, userId),
      eq(lensOrders.clientId, clientIdNum),
      isNull(lensOrders.saleId),
    ))
    .orderBy(desc(lensOrders.createdAt));

    const mapped = results.map(({ lensOrder, prescriptionLegacy }) => ({
      ...lensOrder,
      prescriptionLegacy: prescriptionLegacy || null
    }));

    return { success: true, data: mapped };

  } catch (error: any) {
    console.error('❌ [ERROR] getPendingLensOrders:', error);
    return { 
      success: false, 
      error: 'Erreur lors de la récupération des commandes à facturer: ' + error.message 
    };
  }
});

/**
 * Mark order as received (Smart Reception)
 */
export const receiveLensOrder = secureAction(async (userId, user, orderId: string, data?: { blRef: string, finalCost: number }) => {
  try {
    const orderIdNum = parseInt(orderId);

    // 1. Transaction Wrapper for Atomicity
    const result = await db.transaction(async (tx: any) => {
        // 1.1 Fetch current order within transaction to ensure data integrity
        const existingOrder = await tx.query.lensOrders.findFirst({
            where: and(eq(lensOrders.id, orderIdNum), eq(lensOrders.userId, userId)),
            with: {
                client: {
                    columns: { id: true, fullName: true }
                }
            }
        });

        if (!existingOrder) {
            throw new Error('Commande de verres introuvable');
        }

        // 1.2 Prepare Update Data
        const updateData: any = {
            status: 'received',
            receivedDate: new Date(),
            updatedAt: new Date()
        };

        if (data) {
            updateData.supplierInvoiceRef = data.blRef;
            updateData.finalBuyingPrice = data.finalCost.toString();
            
            const sellingPrice = parseFloat(existingOrder.sellingPrice);
            const finalMargin = sellingPrice - data.finalCost;
            updateData.finalMargin = finalMargin.toString();
        }

        // 1.3 Update Lens Order
        const [updated] = await tx.update(lensOrders)
          .set(updateData)
          .where(and(
            eq(lensOrders.id, orderIdNum),
            eq(lensOrders.userId, userId)
          ))
          .returning();
        
        // 1.4 Auto-Create Purchase Record (Supplier Order)
        if (data && updated) {
            const supplier = await tx.query.suppliers.findFirst({
                where: and(eq(suppliers.name, existingOrder.supplierName), eq(suppliers.userId, userId))
            });

            let dueDate: Date | null = null;
            if (supplier?.paymentTerms) {
                const days = typeof supplier.paymentTerms === 'number' ? supplier.paymentTerms : parseInt(supplier.paymentTerms as string);
                if (!isNaN(days)) {
                    dueDate = new Date();
                    dueDate.setDate(dueDate.getDate() + days);
                }
            }

            await tx.insert(supplierOrders).values({
                userId,
                supplierId: supplier?.id || null,
                fournisseur: existingOrder.supplierName,
                orderReference: data.blRef,
                montantTotal: data.finalCost.toString(),
                montantPaye: '0',
                resteAPayer: data.finalCost.toString(),
                statut: 'received', 
                dateCommande: new Date(),
                dueDate: dueDate,
                notes: `Auto-created from Lens Order #${orderIdNum}`
            });
        }

        // 1.5 Auto-Create Product for Global Stock (Robust Inventory)
        if (updated) {
           const productName = `Verres ${updated.lensType} - ${existingOrder.client.fullName}`;
           const description = `
             Client: ${existingOrder.client.fullName}
             Type: ${updated.orderType}
             OD: ${updated.sphereR || ''} ${updated.cylindreR ? `(${updated.cylindreR})` : ''} ${updated.axeR ? `à ${updated.axeR}°` : ''} ${updated.additionR ? `Add ${updated.additionR}` : ''}
             OG: ${updated.sphereL || ''} ${updated.cylindreL ? `(${updated.cylindreL})` : ''} ${updated.axeL ? `à ${updated.axeL}°` : ''} ${updated.additionL ? `Add ${updated.additionL}` : ''}
             EP: OD ${updated.ecartPupillaireR || '-'} / OG ${updated.ecartPupillaireL || '-'}
           `.trim();

           // Check if product already exists (unlikely given unique ID usage, but good practice)
           // Actually, using Order ID makes it unique by definition.
           
           await tx.insert(products).values({
             userId,
             nom: productName,
             type: 'VERRE',
             categorie: 'Verres',
             reference: `VERRE-${updated.id}`,
             designation: description.substring(0, 255),
             description: description,
             prixVente: updated.sellingPrice,
             prixAchat: data?.finalCost ? data.finalCost.toString() : '0',
             quantiteStock: updated.quantity,
             availableQuantity: updated.quantity,
             fournisseur: updated.supplierName,
             // Store Robust Details for Search/Matching
             details: JSON.stringify({
                lensOrderId: updated.id,
                clientId: updated.clientId,
                clientName: existingOrder.client.fullName,
                prescription: {
                    od: { sph: updated.sphereR, cyl: updated.cylindreR, axe: updated.axeR, add: updated.additionR, ep: updated.ecartPupillaireR },
                    og: { sph: updated.sphereL, cyl: updated.cylindreL, axe: updated.axeL, add: updated.additionL, ep: updated.ecartPupillaireL }
                },
                supplierRef: data?.blRef
             })
           });
        }

        return updated;
    });

    await logSuccess(userId, 'UPDATE', 'lens_orders', orderId, { action: 'received', smart: !!data });

    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/clients/${result.clientId}`);
    revalidatePath('/dashboard/stock'); 

    try {
        await redis?.del(`notifications:verres-prets:${userId}`);
    } catch {
        // ignore cache errors
    }
    
    return { 
      success: true, 
      message: 'Commande reçue, achat enregistré et stock mis à jour (Global)',
      data: result 
    };

  } catch (error: any) {
    console.error("Receive Order Error:", error);
    await logFailure(userId, 'UPDATE', 'lens_orders', error.message, orderId);
    return { 
      success: false, 
      error: 'Erreur lors de la réception de la commande: ' + error.message 
    };
  }
});

/**
 * Mark order as delivered
 */
export const deliverLensOrder = secureAction(async (userId, user, orderId: string) => {
  try {
    const orderIdNum = parseInt(orderId);

    const [updated] = await db.update(lensOrders)
      .set({
        status: 'delivered',
        deliveredDate: new Date(),
        updatedAt: new Date()
      })
      .where(and(
        eq(lensOrders.id, orderIdNum),
        eq(lensOrders.userId, userId)
      ))
      .returning();
    
    if (!updated) {
      return { success: false, error: 'Commande de verres introuvable' };
    }
    
    await logSuccess(userId, 'UPDATE', 'lens_orders', orderId, { action: 'delivered' });

    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/clients/${updated.clientId}`);

    try {
      await redis?.del(`notifications:verres-prets:${userId}`);
    } catch {
      // ignore cache errors
    }
    
    return { 
      success: true, 
      message: 'Commande marquée comme livrée',
      data: updated 
    };

  } catch (error: any) {
    await logFailure(userId, 'UPDATE', 'lens_orders', error.message, orderId);
    return { 
      success: false, 
      error: 'Erreur lors de la livraison de la commande' 
    };
  }
});

/**
 * Delete lens order
 */
export const deleteLensOrder = secureAction(async (userId, user, orderId: string) => {
  try {
    const orderIdNum = parseInt(orderId);

    const [deleted] = await db.delete(lensOrders)
      .where(and(
        eq(lensOrders.id, orderIdNum),
        eq(lensOrders.userId, userId)
      ))
      .returning();
    
    if (!deleted) {
      return { success: false, error: 'Commande de verres introuvable' };
    }
    
    await logSuccess(userId, 'DELETE', 'lens_orders', orderId);

    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/clients/${deleted.clientId}`);

    try {
      await redis?.del(`notifications:verres-prets:${userId}`);
    } catch {
      // ignore cache errors
    }
    
    return { 
      success: true, 
      message: 'Commande de verres supprimée',
      data: deleted 
    };

  } catch (error: any) {
    await logFailure(userId, 'DELETE', 'lens_orders', error.message, orderId);
    return { 
      success: false, 
      error: 'Erreur lors de la suppression de la commande' 
    };
  }
});

/**
 * Update lens order status (simplified dedicated function)
 * ✅ SECURED - Auto-injects userId via secureAction
 */
/**
 * Requirement 3: Generate Reminders for Supplier Payments
 */
export const checkSupplierReminders = secureAction(async (userId, user) => {
    try {
        // Find unpaid supplier orders where due date is approaching (within 3 days) or past
        const threeDaysFromNow = new Date();
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3);

        const ordersToWarn = await db.query.supplierOrders.findMany({
            where: and(
                eq(supplierOrders.userId, userId),
                gt(supplierOrders.resteAPayer, '0'),
                lt(supplierOrders.dueDate, threeDaysFromNow)
            )
        });

        const createdCount = 0;
        for (const order of ordersToWarn) {
            // Check if reminder already exists for this order
            const existing = await db.query.reminders.findFirst({
                where: and(
                    eq(reminders.userId, userId),
                    eq(reminders.relatedId, order.id),
                    eq(reminders.relatedType, 'supplier_orders'),
                    eq(reminders.status, 'pending')
                )
            });

            if (!existing) {
                const isOverdue = order.dueDate && order.dueDate < new Date();
                await db.insert(reminders).values({
                    userId,
                    type: 'payment',
                    priority: isOverdue ? 'urgent' : 'important',
                    title: `Paiement Fournisseur: ${order.fournisseur}`,
                    message: `Reste à payer: ${order.resteAPayer} DH. Échéance: ${order.dueDate?.toLocaleDateString('fr-FR')}`,
                    status: 'pending',
                    dueDate: order.dueDate,
                    relatedId: order.id,
                    relatedType: 'supplier_orders'
                });
            }
        }

        return { success: true, count: ordersToWarn.length };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

/**
 * Get all available (received but not delivered/billed) lens orders across all clients
 */
export const getGlobalAvailableLenses = secureAction(async (userId, user) => {
    try {
        const results = await db.query.lensOrders.findMany({
            where: and(
                eq(lensOrders.userId, userId),
                eq(lensOrders.status, 'received'),
                isNull(lensOrders.saleId)
            ),
            columns: {
                id: true,
                lensType: true,
                sellingPrice: true,
                updatedAt: true
            },
            with: {
                client: {
                    columns: {
                        id: true,
                        fullName: true,
                        phone: true
                    }
                }
            },
            orderBy: [desc(lensOrders.updatedAt)]
        });

        return { success: true, data: results };
    } catch (error: any) {
        console.error("💥 Error fetching global available lenses:", error);
        return { success: false, error: error.message };
    }
});
/**
 * Detect automatic advance for a catalog product (Smart Detection)
 */
export const getAdvanceForProduct = secureAction(async (userId, user, clientId: string, productReference: string) => {
    try {
        if (!productReference.startsWith('VERRE-')) return { success: true, data: null };
        
        const lensOrderIdStr = productReference.replace('VERRE-', '');
        const lensOrderIdNum = parseInt(lensOrderIdStr);
        
        if (isNaN(lensOrderIdNum)) return { success: true, data: null };

        // Chercher UNIQUEMENT dans les orders "reçues" avec une avance > 0
        const order = await db.query.lensOrders.findFirst({
            where: and(
                eq(lensOrders.id, lensOrderIdNum),
                eq(lensOrders.userId, userId),
                eq(lensOrders.clientId, parseInt(clientId)),
                inArray(lensOrders.status, ['received', 'reçue', 'Reçue', 'delivered']), // Allow delivered too in case it was marked delivered but not sold
                sql`CAST(${lensOrders.amountPaid} AS NUMERIC) > 0`
            ),
            columns: {
                id: true,
                amountPaid: true,
                status: true,
            }
        });

        if (!order || order.status === 'sold') return { success: true, data: null };

        return {
            success: true,
            data: {
                lensOrderId: order.id,
                advance: parseFloat(order.amountPaid || '0')
            }
        };
    } catch (error: any) {
        console.error('💥 Error in getAdvanceForProduct:', error);
        return { success: false, error: error.message };
    }
});

/**
 * Get all lens orders for a specific supplier
 */
export const getSupplierLensOrders = secureAction(async (userId, user, supplierId: string) => {
    try {
        const results = await db.query.lensOrders.findMany({
            where: and(
                eq(lensOrders.userId, userId),
                eq(lensOrders.supplierId, supplierId)
            ),
            orderBy: [desc(lensOrders.createdAt)],
            with: {
                client: {
                    columns: { id: true, fullName: true, phone: true }
                }
            }
        });
        return { success: true, data: results };
    } catch (error: any) {
        console.error("💥 Error fetching supplier lens orders:", error?.message || error);
        return { success: false, error: error?.message || "Erreur de chargement" };
    }
});

/**
 * Get pending and ordered lens orders for a specific supplier
 */
export const getPendingOrdersBySupplier_OLD = secureAction(async (userId, user, supplierId: string) => {
  try {
    // Filtre de sécurité : Uniquement les commandes des 6 derniers mois
    const sixMonthsAgo = subMonths(new Date(), 6);

    const results = await db.query.lensOrders.findMany({
      where: and(
        eq(lensOrders.userId, userId),
        eq(lensOrders.supplierId, supplierId),
        // Robustesse : Gestion de la casse pour les statuts
        inArray(sql`lower(${lensOrders.status})`, ['pending', 'ordered']),
        // Filtre de date sécurisé
        gte(lensOrders.createdAt, sixMonthsAgo)
      ),
      with: {
        client: {
          columns: { fullName: true, phone: true }
        }
      },
      orderBy: [desc(lensOrders.createdAt)]
    });
    return { success: true, data: results };
  } catch (error) {
    console.error("Erreur lors de la récupération des commandes:", error);
    return { success: false, error: "Échec de la récupération des commandes." };
  }
});


/**
 * Bulk receive lens orders with a delivery note (BL)
 */
export const bulkReceiveLensOrders_OLD = secureAction(async (userId, user, params: BulkReceiveParams) => {
    try {
        const { orderIds, blNumber, purchasePrices } = params;

        if (!orderIds || orderIds.length === 0) {
            return { success: false, error: "Aucune commande sélectionnée" };
        }

        const now = new Date();

        const result = await db.transaction(async (tx) => {
            // 1. Fetch and validate all orders within transaction
            const ordersToReceive = await tx.query.lensOrders.findMany({
                where: and(
                    eq(lensOrders.userId, userId),
                    inArray(lensOrders.id, orderIds)
                ),
                with: {
                    client: {
                        columns: { id: true, fullName: true, phone: true }
                    }
                }
            });

            // Rigorous validation: all must exist and be 'ordered'
            for (const id of orderIds) {
                const order = ordersToReceive.find(o => o.id === id);
                if (!order) {
                    throw new Error(`Commande #${id} introuvable`);
                }
                if (order.status !== 'ordered') {
                    throw new Error(`La commande #${id} ne peut pas être reçue (Statut actuel: ${order.status})`);
                }
            }

            if (ordersToReceive.length === 0) {
                throw new Error("Aucune commande valide trouvée");
            }

            const firstOrder = ordersToReceive[0];
            const supplierId = firstOrder.supplierId;
            const supplierName = firstOrder.supplierName;

            // 2. Create ONE consolidated supplierOrder
            let totalAmount = 0;
            orderIds.forEach(id => {
                totalAmount += purchasePrices[id] || 0;
            });

            // Calculate Due Date if supplier exists
            let dueDate: Date | null = null;
            if (supplierId) {
                const supplier = await tx.query.suppliers.findFirst({
                    where: and(eq(suppliers.id, supplierId), eq(suppliers.userId, userId))
                });
                if (supplier?.paymentTerms) {
                    const days = parseInt(supplier.paymentTerms as string);
                    if (!isNaN(days)) {
                        dueDate = new Date();
                        dueDate.setDate(dueDate.getDate() + days);
                    }
                }
            }

            const [so] = await tx.insert(supplierOrders).values({
                userId,
                supplierId,
                fournisseur: supplierName,
                orderReference: blNumber,
                montantTotal: totalAmount.toString(),
                montantPaye: '0',
                resteAPayer: totalAmount.toString(),
                // Unified Accounting Fields
                amountPaid: '0',
                remainingAmount: totalAmount.toString(),
                paymentStatus: 'unpaid',
                statut: 'received',
                orderDate: now,
                dueDate: dueDate,
                notes: `Réception groupée BL: ${blNumber} (${orderIds.length} verres)`
            }).returning();

            // 3. Process each order
            const productsToInsert: (typeof products.$inferInsert)[] = [];
            const receivedOrdersDetails: any[] = [];

            for (const order of ordersToReceive) {
                const finalCost = purchasePrices[order.id] || 0;
                const sellingPrice = parseFloat(order.sellingPrice);
                const finalMargin = sellingPrice - finalCost;

                // 3a. Update Lens Order (individuel car prix différents)
                await tx.update(lensOrders)
                    .set({
                        status: 'received',
                        receivedDate: now,
                        deliveryNoteRef: blNumber,
                        finalBuyingPrice: finalCost.toString(),
                        finalMargin: finalMargin.toString(),
                        updatedAt: now
                    })
                    .where(eq(lensOrders.id, order.id));

                // 3b. Prepare Product for Batch Insert
                const productName = `Verres ${order.lensType} - ${order.client.fullName}`;
                const description = `
                    Client: ${order.client.fullName}
                    Type: ${order.orderType}
                    OD: ${order.sphereR || ''} ${order.cylindreR ? `(${order.cylindreR})` : ''} ${order.axeR ? `à ${order.axeR}°` : ''} ${order.additionR ? `Add ${order.additionR}` : ''}
                    OG: ${order.sphereL || ''} ${order.cylindreL ? `(${order.cylindreL})` : ''} ${order.axeL ? `à ${order.axeL}°` : ''} ${order.additionL ? `Add ${order.additionL}` : ''}
                    EP: OD ${order.ecartPupillaireR || '-'} / OG ${order.ecartPupillaireL || '-'}
                `.trim();

                productsToInsert.push({
                    userId,
                    nom: productName,
                    type: 'VERRE',
                    categorie: 'Verres',
                    reference: `VERRE-${order.id}`,
                    designation: description.substring(0, 255),
                    description: description,
                    prixVente: order.sellingPrice,
                    prixAchat: finalCost.toString(),
                    quantiteStock: order.quantity,
                    availableQuantity: order.quantity,
                    fournisseur: order.supplierName,
                    details: JSON.stringify({
                        lensOrderId: order.id,
                        clientId: order.client.id,
                        clientName: order.client.fullName,
                        prescription: {
                            od: { sph: order.sphereR, cyl: order.cylindreR, axe: order.axeR, add: order.additionR, ep: order.ecartPupillaireR },
                            og: { sph: order.sphereL, cyl: order.cylindreL, axe: order.axeL, add: order.additionL, ep: order.ecartPupillaireL }
                        },
                        supplierRef: blNumber
                    })
                });

                receivedOrdersDetails.push({
                    id: order.id,
                    clientName: order.client.fullName,
                    clientPhone: order.client.phone || ''
                });
            }

            // Batch insert products
            if (productsToInsert.length > 0) {
                await tx.insert(products).values(productsToInsert);
            }

            // 4. Trace Audit Log
            await tx.insert(auditLogs).values({
                userId,
                action: 'BULK_RECEIVE',
                entityType: 'lens_orders',
                entityId: 'BATCH',
                metadata: { 
                    count: orderIds.length, 
                    blNumber: blNumber,
                    supplierId: supplierId 
                },
            });

            return {
                supplierOrderId: so.id,
                productsCreated: productsToInsert.length,
                receivedOrders: receivedOrdersDetails
            };
        });

        // Revalidate Paths
        revalidatePath('/dashboard/lens-orders');
        revalidatePath('/dashboard/suppliers');
        revalidatePath('/dashboard/stock');

        await logSuccess(userId, 'UPDATE', 'lens_orders', 'bulk_receive', { 
            count: orderIds.length, 
            blNumber,
            supplierOrderId: result.supplierOrderId
        });

        return { 
            success: true, 
            ...result
        };
    } catch (error: any) {
        console.error("💥 Error in bulkReceiveLensOrders:", error);
        await logFailure(userId, 'UPDATE', 'lens_orders', error.message, 'bulk_receive');
        return { 
            success: false, 
            error: error.message || "Erreur lors de la réception groupée" 
        };
    }
});

/**
 * 1. Fetch Pending Orders for a Specific Supplier (Bulk Receive Modal)
 */
export const getPendingOrdersBySupplier = secureAction(async (userId, user, supplierId: string) => {
  try {
    if (!supplierId || typeof supplierId !== 'string') {
      return { success: false, error: 'ID Fournisseur invalide' };
    }

    // Performance Filter: Only last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const results = await db.query.lensOrders.findMany({
      where: and(
        eq(lensOrders.userId, userId),
        eq(lensOrders.supplierId, supplierId),
        inArray(lensOrders.status, ['pending', 'ordered']),
        gt(lensOrders.createdAt, sixMonthsAgo)
      ),
      with: {
        client: { columns: { id: true, fullName: true, phone: true } }
      },
      orderBy: [desc(lensOrders.createdAt)]
    });

    return { success: true, data: results };
  } catch (error: any) {
    console.error("❌ Erreur getPendingOrdersBySupplier:", error);
    return { success: false, error: error.message };
  }
});

/**
 * 2. Process Bulk Reception (Batch Mode)
 */
export const bulkReceiveLensOrders = secureAction(async (userId, user, data: { supplierId: string; selectedOrderIds: number[]; blNumber: string }) => {
  try {
    const { supplierId, selectedOrderIds, blNumber } = data;
    
    if (!selectedOrderIds || selectedOrderIds.length === 0) {
        return { success: false, error: "Aucune commande sélectionnée" };
    }

    let receivedOrdersToReturn: any[] = [];

    await db.transaction(async (tx: any) => {
        // A. Fetch original orders to get pricing and client info
        const ordersToReceive = await tx.query.lensOrders.findMany({
            where: and(
                eq(lensOrders.userId, userId),
                inArray(lensOrders.id, selectedOrderIds)
            ),
            with: { client: { columns: { fullName: true, phone: true } } }
        });

        receivedOrdersToReturn = ordersToReceive.map((o: any) => ({
            id: o.id,
            clientName: o.client?.fullName,
            clientPhone: o.client?.phone
        }));

        // B. Update Lens Orders status in BATCH
        await tx.update(lensOrders)
            .set({ 
                status: 'received', 
                deliveryNoteRef: blNumber,
                receivedDate: new Date(),
                updatedAt: new Date()
            })
            .where(and(
                eq(lensOrders.userId, userId),
                inArray(lensOrders.id, selectedOrderIds)
            ));

        // C. Insert into Products (Stock) in BATCH
        const productsToInsert = ordersToReceive.map((order: any) => {
             const clientName = order.client?.fullName || 'Client Inconnu';
             const description = `Client: ${clientName} | Type: ${order.orderType} | BL: ${blNumber}`;
             
             return {
                userId,
                nom: `Verres ${order.lensType || 'Standard'} - ${clientName}`,
                type: 'VERRE',
                categorie: 'Verres',
                reference: `VERRE-${order.id}`,
                designation: description.substring(0, 255),
                description: description,
                prixVente: order.sellingPrice || '0',
                prixAchat: order.estimatedBuyingPrice || '0',
                quantiteStock: order.quantity || 1,
                availableQuantity: order.quantity || 1,
                fournisseur: order.supplierName,
                details: JSON.stringify({ lensOrderId: order.id, blNumber })
            };
        });

        if (productsToInsert.length > 0) {
            await tx.insert(products).values(productsToInsert);
        }
    });

    revalidatePath('/dashboard/suppliers');
    revalidatePath('/dashboard/lens-orders');
    revalidatePath('/dashboard/stock');

    return { 
        success: true, 
        message: `${selectedOrderIds.length} verres réceptionnés avec succès !`,
        receivedOrders: receivedOrdersToReturn
    };
  } catch (error: any) {
    console.error("❌ Erreur bulkReceiveLensOrders:", error);
    return { success: false, error: error.message };
  }
});
