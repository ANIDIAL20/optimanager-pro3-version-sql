'use server';

import { db } from '@/db';
import { lensOrders, products } from '@/db/schema'; // Ensure lensOrders is exported as such in schema
import { eq, and, isNull, desc } from 'drizzle-orm';
import { secureAction } from '@/lib/secure-action';

export const getClientAvailableLenses = secureAction(async (userId, user, clientId: string) => {
  try {
    const clientIdNum = parseInt(clientId);
    if (isNaN(clientIdNum)) throw new Error('Invalid Client ID');

    // Récupérer les commandes de verres du client DISPONIBLES pour la vente:
    // - saleId: NULL (pas encore facturées)
    // - On enlève la restriction 'received' car le client peut vouloir facturer avant réception physique
    
    console.log(`🔍 Fetching available lenses for client ${clientId} (User: ${userId})`);

    const availableLenses = await db.query.lensOrders.findMany({
      where: and(
        eq(lensOrders.userId, userId),
        eq(lensOrders.clientId, clientIdNum),
        isNull(lensOrders.saleId)
      ),
      with: {
        client: true,
      },
      orderBy: [desc(lensOrders.createdAt)],
    });
    
    // Pour chaque lens order, récupérer le produit associé
    // We look for a product with reference 'VERRE-{id}'
    const lensesWithProducts = await Promise.all(
      availableLenses.map(async (lensOrder) => {
        // Chercher le produit créé lors de la réception
        const product = await db.query.products.findFirst({
          where: and(
            eq(products.userId, userId),
            eq(products.reference, `VERRE-${lensOrder.id}`)
          ),
        });
        
        return {
          lensOrder: {
            ...lensOrder,
            sellingPrice: lensOrder.sellingPrice.toString(), // Ensure string for consistency
            // Add other fields mapping if necessary
          },
          product: product || null,  // Le produit stock à ajouter au panier
        };
      })
    );
    
    return { success: true, data: lensesWithProducts };

  } catch (error: any) {
    console.error('Error in getClientAvailableLenses:', error);
    return { success: false, error: error.message };
  }
});
