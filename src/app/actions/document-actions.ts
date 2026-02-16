/**
 * Document Actions (Invoices & Quotes)
 * Handles creation, retrieval, and status updates for normalized sales documents.
 */
'use server';

import { db } from '@/db';
import { 
  sales, 
  saleItems, 
  saleLensDetails, 
  saleContactLensDetails, 
  clients, 
  products 
} from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';
import { revalidatePath } from 'next/cache';

// ========================================
// TYPES
// ========================================

export interface CreateDocumentItem {
  productId?: number;
  label: string;
  qty: number;
  price: number; // Unit Price TTC (Input is usually TTC in this system)
  productType: 'frame' | 'lens' | 'contact_lens' | 'accessory' | 'service';
  category?: string;
  tvaRate?: number; // Default 20
  
  // Optical Details
  lensDetails?: {
    eye: 'OD' | 'OG';
    sphere?: string;
    cylinder?: string;
    axis?: string;
    addition?: string;
    index?: string;
    diameter?: string;
    material?: string;
    treatment?: string;
    lensType?: string;
  }[];
  
  contactLensDetails?: {
    eye: 'OD' | 'OG' | 'BOTH';
    power?: string;
    baseCurve?: string;
    diameter?: string;
    duration?: string;
    cylinder?: string;
    axis?: string;
    addition?: string;
  }[];
}

export interface CreateDocumentInput {
  type: 'INVOICE' | 'QUOTE';
  clientId: number;
  date?: Date;
  items: CreateDocumentItem[];
  paymentMethod?: string;
  notes?: string;
  validUntil?: Date; // For quotes
}

// ========================================
// HELPERS
// ========================================

async function generateDocumentNumber(userId: string, type: 'INVOICE' | 'QUOTE', tx: any) {
  const year = new Date().getFullYear();
  // Prefix: FAC-2024-XXXX or DEV-2024-XXXX
  // Adjust prefix logic if user wants continuous numbering or specific format
  const prefix = type === 'INVOICE' ? `FAC-${year}-` : `DEV-${year}-`;
  
  const lastDoc = await tx.query.sales.findFirst({
    where: and(
      eq(sales.userId, userId),
      eq(sales.type, type),
      sql`${sales.saleNumber} LIKE ${prefix + '%'}`
    ),
    orderBy: [desc(sales.saleNumber)],
    columns: { saleNumber: true }
  });

  let nextNum = 1;
  if (lastDoc && lastDoc.saleNumber) {
    const parts = lastDoc.saleNumber.replace(prefix, '');
    const num = parseInt(parts);
    if (!isNaN(num)) {
      nextNum = num + 1;
    }
  }

  return `${prefix}${nextNum.toString().padStart(4, '0')}`;
}

function calculateLineFinancials(qty: number, unitTTC: number, rate: number) {
  // Prevent division by zero
  const safeRate = rate || 0;
  
  // HT = TTC / (1 + rate/100)
  const unitHT = unitTTC / (1 + safeRate / 100);
  const unitTVA = unitTTC - unitHT;
  
  return {
    unitHT: Number(unitHT.toFixed(2)),
    unitTVA: Number(unitTVA.toFixed(2)),
    unitTTC: Number(unitTTC.toFixed(2)),
    lineTotalHT: Number((unitHT * qty).toFixed(2)),
    lineTotalTVA: Number((unitTVA * qty).toFixed(2)),
    lineTotalTTC: Number((unitTTC * qty).toFixed(2)),
  };
}

// ========================================
// ACTIONS
// ========================================

/**
 * Create a new Document (Invoice or Quote)
 */
export const createDocumentAction = secureAction(async (userId, user, input: CreateDocumentInput) => {
  try {
    if (!input.items || input.items.length === 0) {
      return { success: false, error: "Aucun article sélectionné." };
    }

    return await db.transaction(async (tx) => {
      // 1. Generate Number
      const docNumber = await generateDocumentNumber(userId, input.type, tx);
      
      // 2. Client Info Snapshot
      const client = await tx.query.clients.findFirst({
        where: eq(clients.id, input.clientId),
      });
      
      if (!client) throw new Error("Client introuvable");
      
      // 3. Prepare Items & Calculate Totals
      const docItems = [];
      let totalHT = 0;
      let totalTVA = 0;
      let totalTTC = 0;
      
      for (const item of input.items) {
        const rate = item.tvaRate ?? 20; // Default 20%
        const financials = calculateLineFinancials(item.qty, item.price, rate);
        
        docItems.push({
          ...item,
          ...financials,
          tvaRate: rate,
        });
        
        totalHT += financials.lineTotalHT;
        totalTVA += financials.lineTotalTVA;
        totalTTC += financials.lineTotalTTC;
      }
      
      // 4. Insert Sale (Header)
      const [newSale] = await tx.insert(sales).values({
        userId,
        firebaseId: crypto.randomUUID(), // Compatibility
        saleNumber: docNumber,
        type: input.type, // 'INVOICE' | 'QUOTE'
        clientId: input.clientId,
        clientName: client.fullName,
        clientPhone: client.phone,
        clientAddress: client.address,
        
        status: input.type === 'QUOTE' ? 'pending' : 'impaye', // Initial status
        
        totalHT: totalHT.toFixed(2),
        totalTVA: totalTVA.toFixed(2),
        totalTTC: totalTTC.toFixed(2),
        totalNet: totalTTC.toFixed(2),
        resteAPayer: totalTTC.toFixed(2),
        
        paymentMethod: input.paymentMethod,
        notes: input.notes,
        date: input.date || new Date(),
        
        // Legacy JSON field (optional, can store simplified items for view compatibility)
        items: input.items.map(i => ({
            label: i.label,
            qty: i.qty,
            total: i.price * i.qty
        })), 
      }).returning();
      
      const saleId = newSale.id;
      
      // 5. Insert Sale Items & Details
      for (const item of docItems) {
        // Insert Item
        const [newItem] = await tx.insert(saleItems).values({
          saleId,
          productId: item.productId,
          label: item.label,
          qty: item.qty,
          
          category: item.category,
          productType: item.productType,
          
          unitPriceHT: item.unitHT.toString(),
          unitPriceTVA: item.unitTVA.toString(),
          unitPriceTTC: item.unitTTC.toString(),
          tvaRate: item.tvaRate.toString(),
          
          lineTotalHT: item.lineTotalHT.toString(),
          lineTotalTVA: item.lineTotalTVA.toString(),
          lineTotalTTC: item.lineTotalTTC.toString(),
        }).returning();
        
        // Insert Lens Details
        if (item.productType === 'lens' && item.lensDetails) {
          for (const detail of item.lensDetails) {
            await tx.insert(saleLensDetails).values({
              saleItemId: newItem.id,
              eye: detail.eye,
              sphere: detail.sphere,
              cylinder: detail.cylinder,
              axis: detail.axis,
              addition: detail.addition,
              index: detail.index,
              diameter: detail.diameter,
              material: detail.material,
              treatment: detail.treatment,
              lensType: detail.lensType,
            });
          }
        }
        
        // Insert Contact Lens Details
        if (item.productType === 'contact_lens' && item.contactLensDetails) {
          for (const detail of item.contactLensDetails) {
            await tx.insert(saleContactLensDetails).values({
              saleItemId: newItem.id,
              eye: detail.eye,
              power: detail.power,
              baseCurve: detail.baseCurve,
              diameter: detail.diameter,
              duration: detail.duration,
              cylinder: detail.cylinder,
              axis: detail.axis,
              addition: detail.addition,
            });
          }
        }
      }
      
      // Revalidate
      revalidatePath('/dashboard/ventes');
      revalidatePath('/dashboard/devis');
      
      return { success: true, docId: saleId, docNumber };
    });
    
  } catch (error: any) {
    console.error("Error creating document:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Get Document Details (with Items and Relations)
 */
export const getDocumentAction = secureAction(async (userId, user, docId: number) => {
  try {
    const doc = await db.query.sales.findFirst({
        where: and(eq(sales.id, docId), eq(sales.userId, userId)),
        with: {
            client: true,
            saleItems: {
                with: {
                    lensDetails: true,
                    contactLensDetails: true,
                    product: true // Get original product info if needed
                }
            }
        }
    });
    
    if (!doc) return { success: false, error: "Document introuvable" };
    
    return { success: true, document: doc };
  } catch (error: any) {
    console.error("Error fetching document:", error);
    return { success: false, error: error.message };
  }
});

/**
 * Convert Quote to Invoice
 */
export const convertQuoteToInvoiceAction = secureAction(async (userId, user, quoteId: number) => {
    try {
        return await db.transaction(async (tx) => {
            // 1. Get Quote
            const quote = await tx.query.sales.findFirst({
                where: and(
                    eq(sales.id, quoteId), 
                    eq(sales.userId, userId),
                    eq(sales.type, 'QUOTE')
                )
            });
            
            if (!quote) throw new Error("Devis introuvable");
            
            // 2. Check if already converted? (Optional logic)
            if (quote.status === 'converted') throw new Error("Ce devis est déjà converti");

            // 3. Generate New Invoice Number
            const invoiceNumber = await generateDocumentNumber(userId, 'INVOICE', tx);
            
            // 4. Create New Invoice (Duplicate Quote) OR Update Quote (Change type)
            // Strategy: Update Quote to be an Invoice is riskier if we want to keep history.
            // Strategy: Create New Invoice from Quote is cleaner.
            
            // Fetch Items
            const items = await tx.query.saleItems.findMany({
                where: eq(saleItems.saleId, quoteId),
                with: {
                    lensDetails: true,
                    contactLensDetails: true
                }
            });
            
            // Insert Invoice Header
            const [newInvoice] = await tx.insert(sales).values({
                userId,
                firebaseId: crypto.randomUUID(),
                saleNumber: invoiceNumber,
                type: 'INVOICE', // Converted
                clientId: quote.clientId,
                clientName: quote.clientName,
                clientPhone: quote.clientPhone,
                clientAddress: quote.clientAddress,
                
                status: 'impaye',
                
                totalHT: quote.totalHT,
                totalTVA: quote.totalTVA,
                totalTTC: quote.totalTTC,
                totalNet: quote.totalNet,
                resteAPayer: quote.totalTTC,
                
                notes: `Converti depuis le devis ${quote.saleNumber}`,
                date: new Date(),
                items: quote.items, // Copy legacy snapshot
            }).returning();
            
            // Copy Items
            for (const item of items) {
                const [newItem] = await tx.insert(saleItems).values({
                    saleId: newInvoice.id,
                    productId: item.productId,
                    label: item.label,
                    qty: item.qty,
                    category: item.category,
                    productType: item.productType,
                    unitPriceHT: item.unitPriceHT,
                    unitPriceTVA: item.unitPriceTVA,
                    unitPriceTTC: item.unitPriceTTC,
                    tvaRate: item.tvaRate,
                    lineTotalHT: item.lineTotalHT,
                    lineTotalTVA: item.lineTotalTVA,
                    lineTotalTTC: item.lineTotalTTC,
                }).returning();
                
                // Copy Details
                for (const d of item.lensDetails) {
                    await tx.insert(saleLensDetails).values({
                        ...d,
                        id: undefined, // Let DB generate ID
                        saleItemId: newItem.id
                    });
                }
                 for (const d of item.contactLensDetails) {
                    await tx.insert(saleContactLensDetails).values({
                        ...d,
                        id: undefined, 
                        saleItemId: newItem.id
                    });
                }
            }
            
            // 5. Update Quote Status
            await tx.update(sales)
                .set({ status: 'converted' })
                .where(eq(sales.id, quoteId));
                
            revalidatePath('/dashboard/ventes');
            return { success: true, invoiceId: newInvoice.id, invoiceNumber };
        });
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});
