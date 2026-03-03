/**
 * Facture Adapter
 * Transforms raw getPrintData({ document, client, settings }) → StandardDocumentData
 * Document type: FACTURE
 */
import type { StandardDocumentData, DocumentItem } from '@/types/document';

// ── Shared item normalizer (sale lines ← sales.items JSON) ────────────────────
export function normalizeSaleItem(item: any, index: number): DocumentItem {
  return {
    id: item.id?.toString() ?? String(index),
    description:
      item.productName ?? item.nomProduit ?? item.designation ?? item.label ?? '',
    reference: item.reference ?? item.productRef,
    marque: item.marque ?? item.brand,
    modele: item.modele ?? item.model,
    couleur: item.couleur ?? item.color,
    quantite: item.quantity ?? item.quantite ?? item.qty ?? 1,
    prixUnitaire: Number(item.unitPrice ?? item.prixVente ?? item.unitPriceTTC ?? 0),
    total:
      Number(item.lineTotal ?? item.total ?? item.lineTotalTTC ?? 0) ||
      (item.quantity ?? 1) * Number(item.unitPrice ?? item.prixVente ?? item.unitPriceTTC ?? 0),
    tvaRate: item.tvaRate !== undefined ? Number(item.tvaRate) : 20,
    lensDetails: item.lensDetails,
    contactLensDetails: item.contactLensDetails,
  };
}

// ── Shared shop normalizer ─────────────────────────────────────────────────────
export function normalizeShop(settings: any): StandardDocumentData['shop'] {
  return {
    nom: settings?.storeName ?? settings?.shopName ?? 'OptiManager',
    adresse: settings?.address ?? 'Adresse non renseignée',
    telephone: settings?.phone ?? '',
    logoUrl: settings?.logoUrl ?? undefined,
    ice: settings?.ice,
    if_: settings?.if,
    rc: settings?.rc,
    tp: settings?.tp,
    inpe: settings?.inpe,
    rib: settings?.rib,
    paymentTerms: settings?.paymentTerms,
    paymentMethods: settings?.paymentMethods,
  };
}

// ── Facture adapter ────────────────────────────────────────────────────────────
export async function toStandardDocument(
  rawData: any
): Promise<StandardDocumentData> {
  const { document: doc, client, settings } = rawData;

  // Items may already have lensDetails injected by the server action
  const items = await Promise.all(
    (doc.items ?? []).map((item: any, i: number) => normalizeSaleItem(item, i))
  );

  return {
    type: 'FACTURE',
    documentNumber: doc.transactionNumber ?? doc.saleNumber ?? `F-${doc.id}`,
    date: (doc.date ?? doc.createdAt ?? new Date()).toString(),
    status: doc.status,
    client: {
      nom: client?.fullName ?? doc.clientName ?? 'Client Passage',
      telephone: client?.phone ?? doc.clientPhone ?? undefined,
      adresse: client?.address ?? doc.clientAddress ?? undefined,
      mutuelle: doc.clientMutuelle ?? undefined,
    },
    shop: normalizeShop(settings),
    items,
    totals: {
      sousTotal: Number(doc.totalHT ?? 0),
      tva:
        Number(doc.totalTVA ?? doc.totalTVAAmount ?? 0) ||
        Number(doc.totalTTC ?? 0) - Number(doc.totalHT ?? 0),
      totalTTC: Number(doc.totalTTC ?? doc.totalNet ?? 0),
      acompte: doc.totalPaye > 0 ? Number(doc.totalPaye) : undefined,
      resteAPayer: doc.resteAPayer > 0 ? Number(doc.resteAPayer) : undefined,
    },
  };
}
