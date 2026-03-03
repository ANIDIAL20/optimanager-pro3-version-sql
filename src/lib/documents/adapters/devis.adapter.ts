/**
 * Devis Adapter
 * Transforms raw getPrintData({ document, client, settings }) → StandardDocumentData
 * Document type: DEVIS
 */
import type { StandardDocumentData } from '@/types/document';
import { normalizeSaleItem, normalizeShop } from './facture.adapter';

export function toStandardDocument(rawData: any): StandardDocumentData {
  const { document: doc, client, settings } = rawData;

  const totalHT  = Number(doc.totalHT  ?? 0);
  const totalTTC = Number(doc.totalTTC ?? 0);

  return {
    type: 'DEVIS',
    documentNumber: doc.devisNumber ?? doc.id?.toString() ?? `D-${doc.id}`,
    date: (doc.createdAt ?? new Date()).toString(),
    validityDays: 15,
    status: doc.status,
    client: {
      nom: client?.fullName ?? doc.clientName ?? 'Client',
      telephone: client?.phone ?? doc.clientPhone ?? undefined,
      adresse: client?.address ?? undefined,
    },
    shop: normalizeShop(settings),
    items: (doc.items ?? []).map((item: any, i: number) =>
      normalizeSaleItem(item, i)
    ),
    totals: {
      sousTotal: totalHT,
      tva: totalTTC - totalHT,
      totalTTC,
    },
  };
}
