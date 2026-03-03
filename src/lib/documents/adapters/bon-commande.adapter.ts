/**
 * Bon de Commande Adapter
 * Transforms raw getSupplierOrderPrintData({ order, supplier, settings }) → StandardDocumentData
 * Document type: BON DE COMMANDE
 */
import type { StandardDocumentData, DocumentItem } from '@/types/document';
import { normalizeShop } from './facture.adapter';

function normalizeOrderItem(item: any, index: number): DocumentItem {
  return {
    id: item.id?.toString() ?? String(index),
    description:
      item.productName ??
      item.nomProduit ??
      item.designation ??
      item.label ??
      item.nom ??
      '',
    reference: item.reference ?? item.productRef ?? undefined,
    quantite: Number(item.quantity ?? item.quantite ?? item.qty ?? 1),
    prixUnitaire: Number(item.unitPrice ?? item.prixAchat ?? item.prixUnitaire ?? 0),
    total:
      Number(item.lineTotal ?? item.total ?? item.montant ?? 0) ||
      Number(item.quantity ?? 1) * Number(item.unitPrice ?? item.prixAchat ?? 0),
    // No TVA on supplier orders
  };
}

export function toStandardDocument(rawData: any): StandardDocumentData {
  const { order, supplier, settings } = rawData;

  const shop = normalizeShop(settings);

  return {
    type: 'BON DE COMMANDE',
    documentNumber:
      order.orderNumber ?? order.orderReference ?? `BC-${order.id}`,
    date: (order.orderDate ?? order.createdAt ?? new Date()).toString(),
    shop,

    // No client — supplier is the recipient
    fournisseur: {
      nom: supplier?.name ?? order.fournisseur ?? 'Fournisseur',
      adresse: supplier?.address ?? undefined,
      telephone: supplier?.phone ?? order.supplierPhone ?? undefined,
      email: supplier?.email ?? undefined,
      contact: supplier?.contactPerson ?? undefined,
      conditionsPaiement: supplier?.paymentTerms ?? undefined,
    },

    commandeDetails: {
      lieuLivraison: shop.adresse,
      dateLivraisonSouhaitee: order.expectedDelivery
        ? new Date(order.expectedDelivery).toISOString()
        : undefined,
      observations: order.notes ?? undefined,
    },

    items: (order.items ?? []).map((item: any, i: number) =>
      normalizeOrderItem(item, i)
    ),

    totals: {
      sousTotal: Number(order.subTotal ?? order.montantTotal ?? 0),
      // No TVA for supplier orders
      totalTTC: Number(order.subTotal ?? order.montantTotal ?? 0),
    },
  };
}
