'use server';

import { db } from '@/db';
import { lensOrders, clients, prescriptions } from '@/db/schema';
import { secureAction } from '@/lib/secure-action';
import { logSuccess, logFailure } from '@/lib/audit-log';
import { eq, and, desc } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';

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
  rightEye?: any;
  leftEye?: any;
  
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
  rightEye: any | null;
  leftEye: any | null;
  
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
export const createLensOrder = secureAction(async (userId, user, input: LensOrderInput) => {
  try {
    // Verify client ownership
    const clientExists = await db.query.clients.findFirst({
      where: and(eq(clients.id, input.clientId), eq(clients.userId, userId))
    });
    
    if (!clientExists) {
      return { success: false, error: 'Client introuvable' };
    }

    // Verify prescription ownership if provided
    if (input.prescriptionId) {
      const prescriptionExists = await db.query.prescriptions.findFirst({
        where: and(
          eq(prescriptions.id, input.prescriptionId),
          eq(prescriptions.userId, userId)
        )
      });
      
      if (!prescriptionExists) {
        return { success: false, error: 'Ordonnance introuvable' };
      }
    }

    // Calculate estimated margin if buying price provided
    const estimatedMargin = input.estimatedBuyingPrice 
      ? input.sellingPrice - input.estimatedBuyingPrice 
      : null;

    const [created] = await db.insert(lensOrders)
      .values({
        userId,
        clientId: input.clientId,
        prescriptionId: input.prescriptionId || null,
        orderType: input.orderType,
        lensType: input.lensType,
        treatment: input.treatment || null,
        supplierName: input.supplierName,
        rightEye: input.rightEye || null,
        leftEye: input.leftEye || null,
        
        // Professional Pricing
        sellingPrice: input.sellingPrice.toString(),
        estimatedBuyingPrice: input.estimatedBuyingPrice?.toString() || null,
        estimatedMargin: estimatedMargin?.toString() || null,
        
        // Legacy pricing
        unitPrice: input.unitPrice.toString(),
        quantity: input.quantity,
        totalPrice: (input.sellingPrice * input.quantity).toString(), // Use sellingPrice for total
        
        status: input.status || 'pending',
        orderDate: new Date(),
        notes: input.notes || null
      })
      .returning();
    
    await logSuccess(userId, 'CREATE', 'lens_orders', created.id.toString());

    revalidatePath('/dashboard/clients');
    revalidatePath(`/dashboard/clients/${input.clientId}`);
    
    return { 
      success: true, 
      message: 'Commande de verres créée',
      data: created 
    };

  } catch (error: any) {
    await logFailure(userId, 'CREATE', 'lens_orders', error.message);
    return { 
      success: false, 
      error: 'Erreur lors de la création de la commande de verres' 
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
      if (input.rightEye !== undefined) updateData.rightEye = input.rightEye;
      if (input.leftEye !== undefined) updateData.leftEye = input.leftEye;
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
// Add purchases to imports at the top (Line 4)
import { purchases, suppliers } from '@/db/schema'; // Ensure these are imported

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
        // Find supplier ID by name if possible (best effort), or store name
        // Ideally lensOrder should store supplierId, but it stores name currently.
        // We will try to find the supplier.
        const supplier = await db.query.suppliers.findFirst({
            where: and(eq(suppliers.name, existingOrder.supplierName), eq(suppliers.userId, userId))
        });

        await db.insert(purchases).values({
            userId,
            supplierId: supplier?.id, // Link if found
            supplierName: existingOrder.supplierName, // Always store name
            type: 'LENS_ORDER',
            reference: data.blRef,
            totalAmount: data.finalCost.toString(),
            status: 'UNPAID', // Default to debt
            date: new Date(),
            notes: `Commande verres #${orderIdNum} - Client: ${existingOrder.clientId}` // We don't have client name easily here without join, using ID
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
