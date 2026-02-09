'use server';

import { db } from '@/db';
import { lensOrders, clients, prescriptions, supplierOrders, suppliers, supplierOrderItems } from '@/db/schema';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { LensOrderSchema } from '@/lib/validations/optical';

// ========================================
// TYPE DEFINITIONS
// ========================================

export interface LensOrderInput {
  clientId: number;
  prescriptionId?: number | null;
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

  matiere: string | null;
  indice: string | null;
  
  // Professional Pricing
  sellingPrice: string;
  estimatedBuyingPrice: string | null;
  finalBuyingPrice: string | null;
  supplierInvoiceRef: string | null;
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
  createdAt: Date | null;
  updatedAt: Date | null;
}

// ========================================
// LENS ORDER ACTIONS
// ========================================

/**
 * Get all lens orders for user
 */
export const getLensOrders = secureAction(async (userId, user) => {
  try {
    const results = await db.query.lensOrders.findMany({
      where: eq(lensOrders.userId, userId),
      orderBy: [desc(lensOrders.createdAt)],
      with: {
        client: true,
        prescription: true
      }
    });
    
    await logSuccess(userId, 'READ', 'lens_orders', undefined, { count: results.length });
    return { success: true, data: results };

  } catch (error: any) {
    await logFailure(userId, 'READ', 'lens_orders', error.message);
    return { 
      success: false, 
      error: 'Erreur lors de la récupération des commandes de verres' 
    };
  }
});

/**
 * Get lens orders for specific client
 */
export const getClientLensOrders = secureAction(async (userId, user, clientId: string) => {
  try {
    const clientIdNum = parseInt(clientId);
    const results = await db.query.lensOrders.findMany({
      where: and(
        eq(lensOrders.userId, userId),
        eq(lensOrders.clientId, clientIdNum)
      ),
      orderBy: [desc(lensOrders.createdAt)],
      with: {
        prescription: true
      }
    });
    
    await logSuccess(userId, 'READ', 'lens_orders', undefined, { clientId, count: results.length });
    return { success: true, data: results };

  } catch (error: any) {
    await logFailure(userId, 'READ', 'lens_orders', error.message);
    return { 
      success: false, 
      error: 'Erreur lors de la récupération des commandes de verres du client' 
    };
  }
});

/**
 * Get single lens order
 */
export const getLensOrder = secureAction(async (userId, user, orderId: string) => {
  try {
    const orderIdNum = parseInt(orderId);
    const result = await db.query.lensOrders.findFirst({
      where: and(
        eq(lensOrders.id, orderIdNum),
        eq(lensOrders.userId, userId)
      ),
      with: {
        client: true,
        prescription: true
      }
    });
    
    if (!result) {
      return { success: false, error: 'Commande de verres introuvable' };
    }
    
    return { success: true, data: result };

  } catch (error: any) {
    return { 
      success: false, 
      error: error.message || 'Erreur lors de la récupération de la commande' 
    };
  }
});

/**
 * Create lens order
 */
export const createLensOrder = secureAction(async (userId, user, rawInput: LensOrderInput) => {
  try {
    // 1. Validate & Coerce Data with Zod
    const input = LensOrderSchema.parse(rawInput);

    // 2. Perform Atomic Transaction
    const result = await db.transaction(async (tx: any) => {
        // Verify client ownership
        const clientExists = await tx.query.clients.findFirst({
            where: and(eq(clients.id, input.clientId), eq(clients.userId, userId))
        });
        
        if (!clientExists) {
            throw new Error('Client introuvable');
        }

        let supplierId = null;
        let supplierOrderId = null;

        if (input.supplierName) {
            const supplier = await tx.query.suppliers.findFirst({
                where: and(eq(suppliers.name, input.supplierName), eq(suppliers.userId, userId))
            });
            supplierId = supplier?.id;

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
                        hauteur: input.hauteurR
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
                        hauteur: input.hauteurL
                    });
                }

                const [so] = await tx.insert(supplierOrders).values({
                    userId,
                    supplierId,
                    fournisseur: input.supplierName,
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
        }

        const [created] = await tx.insert(lensOrders)
            .values({
                userId,
                clientId: input.clientId,
                orderType: input.orderType,
                lensType: input.lensType,
                treatment: input.treatment || null,
                supplierName: input.supplierName,
                
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

        return created;
    });
    
    // 3. Log Success with Action Tracking Context
    await logSuccess(userId, 'CREATE', 'lens_orders', result.id.toString(), {
        clientId: input.clientId,
        orderType: input.orderType,
        supplier: input.supplierName,
        price: input.sellingPrice
    });

    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/clients/${input.clientId}`);
    
    return { 
      success: true, 
      message: 'Commande de verres créée avec succès',
      data: result 
    };

  } catch (error: any) {
    console.error("❌ Lens Order Creation Failed:", error);
    await logFailure(userId, 'CREATE', 'lens_orders', error.message);
    return { 
      success: false, 
      error: error.message || 'Erreur lors de la création de la commande' 
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
import { isNull } from 'drizzle-orm';

/**
 * Get billable lens orders for a client (pending/ordered/received AND not billed)
 */
export const getPendingLensOrders = secureAction(async (userId, user, clientId: string) => {
  try {
    const clientIdNum = parseInt(clientId);
    const results = await db.query.lensOrders.findMany({
      where: and(
        eq(lensOrders.userId, userId),
        eq(lensOrders.clientId, clientIdNum),
        isNull(lensOrders.saleId), // Not yet billed
        // Optional: filter by status if we only want 'received' orders to be billable?
        // For now, let's allow billing even if just ordered.
      ),
      orderBy: [desc(lensOrders.createdAt)],
      with: {
        prescription: true
      }
    });
    
    return { success: true, data: results };

  } catch (error: any) {
    return { 
      success: false, 
      error: 'Erreur lors de la récupération des commandes à facturer' 
    };
  }
});

/**
 * Mark order as received (Smart Reception)
 */
export const receiveLensOrder = secureAction(async (userId, user, orderId: string, data?: { blRef: string, finalCost: number }) => {
  try {
    const orderIdNum = parseInt(orderId);

    // 1. Fetch current order to check existence and get details
    const existingOrder = await db.query.lensOrders.findFirst({
        where: and(eq(lensOrders.id, orderIdNum), eq(lensOrders.userId, userId)),
    });

    if (!existingOrder) {
        return { success: false, error: 'Commande de verres introuvable' };
    }

    // 2. Prepare Update Data
    const updateData: any = {
        status: 'received',
        receivedDate: new Date(),
        updatedAt: new Date()
    };

    // If Smart Reception data provided
    if (data) {
        updateData.supplierInvoiceRef = data.blRef;
        updateData.finalBuyingPrice = data.finalCost.toString();
        
        // Calculate realized margin
        const sellingPrice = parseFloat(existingOrder.sellingPrice);
        const finalMargin = sellingPrice - data.finalCost;
        updateData.finalMargin = finalMargin.toString();
    }

    // 3. Update Lens Order
    const [updated] = await db.update(lensOrders)
      .set(updateData)
      .where(and(
        eq(lensOrders.id, orderIdNum),
        eq(lensOrders.userId, userId)
      ))
      .returning();
    
    // 4. Auto-Create Purchase Record (Debt)
    if (data && updated) {
        // Find supplier ID by name (best effort)
        const supplier = await db.query.suppliers.findFirst({
            where: and(eq(suppliers.name, existingOrder.supplierName), eq(suppliers.userId, userId))
        });

        // Consolidate into Supplier Order
        await db.insert(supplierOrders).values({
            userId,
            supplierId: supplier?.id || null,
            fournisseur: existingOrder.supplierName,
            orderReference: data.blRef,
            // Use date.finalCost for total amount. Assuming paid amount = 0 initially (debt).
            montantTotal: data.finalCost.toString(),
            montantPaye: '0',
            resteAPayer: data.finalCost.toString(),
            statut: 'received', 
            
            dateCommande: new Date(),
            notes: `Auto-created from Lens Order #${orderIdNum}`
        });
    }

    await logSuccess(userId, 'UPDATE', 'lens_orders', orderId, { action: 'received', smart: !!data });

    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/clients/${updated.clientId}`);
    
    return { 
      success: true, 
      message: 'Commande reçue et achat enregistré',
      data: updated 
    };

  } catch (error: any) {
    console.error("Receive Order Error:", error);
    await logFailure(userId, 'UPDATE', 'lens_orders', error.message, orderId);
    return { 
      success: false, 
      error: 'Erreur lors de la réception de la commande' 
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
export const updateLensOrderStatus = secureAction(
  async (userId: string, user: any, orderId: number, status: string) => {
    try {
      // Verify ownership
      const existing = await db.select().from(lensOrders)
        .where(and(eq(lensOrders.id, orderId), eq(lensOrders.userId, userId)))
        .limit(1);

      if (existing.length === 0) {
        return { success: false, error: 'Commande introuvable' };
      }

      // Update only status and updatedAt
      const [updated] = await db.update(lensOrders)
        .set({
          status,
          updatedAt: new Date()
        })
        .where(eq(lensOrders.id, orderId))
        .returning();

      await logSuccess(userId, 'UPDATE', 'lens_orders', orderId.toString(), { status });

      // Revalidate relevant paths
      revalidatePath(`/dashboard/clients/${updated.clientId}`);
      revalidatePath('/dashboard/clients');
      revalidatePath('/dashboard/lens-orders');

      return {
        success: true,
        message: 'Statut mis à jour',
        data: updated
      };

    } catch (error: any) {
      console.error('❌ Error updating lens order status:', error);
      await logFailure(userId, 'UPDATE', 'lens_orders', error.message, orderId.toString());
      return {
        success: false,
        error: 'Erreur lors de la mise à jour du statut'
      };
    }
  }
);
