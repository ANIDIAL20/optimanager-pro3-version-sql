/**
 * Reçu Adapter
 * Transforms raw getPrintData({ document, client, settings }) → StandardDocumentData
 * Document type: REÇU
 *
 * NOTE: A reçu is built from a sale (same data source as FACTURE) but enriches
 * it with payment history, ordonnance snapshot, and amount-in-words.
 */
import type { StandardDocumentData } from '@/types/document';
import { normalizeSaleItem, normalizeShop } from './facture.adapter';
import { formatCurrencyToWords } from '@/lib/format-number-to-words';

export function toStandardDocument(rawData: any): StandardDocumentData {
  const { document: doc, client, settings } = rawData;

  const items = (doc.items ?? []).map((item: any, i: number) =>
    normalizeSaleItem(item, i)
  );

  // Build a REC-prefixed document number — always strip any existing prefix and re-apply REC-
  const buildRecuNumber = () => {
    // If the stored number already has a proper REC- prefix, use it
    if (doc.transactionNumber?.startsWith('REC-')) return doc.transactionNumber;
    if (doc.saleNumber?.startsWith('REC-')) return doc.saleNumber;

    // Strip a leading FACT- prefix if present and re-apply REC-
    const base =
      (doc.transactionNumber ?? doc.saleNumber ?? '').replace(/^FACT-?/i, '') ||
      (() => {
        const year = new Date(doc.date ?? doc.createdAt ?? new Date()).getFullYear();
        const padded = String(doc.id ?? '0').padStart(4, '0');
        return `${year}-${padded}`;
      })();
    return `REC-${base}`;
  };

  // Payment method: read from multiple possible fields, default to 'Espèces'
  const paymentMethod: string =
    doc.paymentMethod ?? doc.modePaiement ??
    doc.paymentHistory?.[0]?.method ?? 'Espèces';

  return {
    type: 'REÇU',
    documentNumber: buildRecuNumber(),
    date: (doc.date ?? doc.createdAt ?? new Date()).toString(),
    modePaiement: paymentMethod,
    client: {
      nom: client?.fullName ?? doc.clientName ?? 'Client',
      telephone: client?.phone ?? doc.clientPhone ?? undefined,
      adresse: client?.address ?? doc.clientAddress ?? undefined,
    },
    shop: normalizeShop(settings),
    ordonnance: (() => {
      const snap = doc.prescriptionSnapshot;
      if (!snap) return undefined;
      const doctor = snap.doctorName;
      const dateRaw = snap.prescriptionDate;
      // Only show ordonnance block when we have a real doctor name and a proper date
      if (!doctor || doctor === '—') return undefined;
      const hasDate = dateRaw && dateRaw !== '—' && dateRaw !== 'null';
      return {
        prescripteur: doctor,
        dateOrdonnance: hasDate ? dateRaw : '',
      };
    })(),

    paiements: (doc.paymentHistory ?? []).map((p: any) => ({
      date: p.date ?? p.createdAt,
      mode: p.method ?? p.type ?? p.mode ?? '—',
      montant: Number(p.amount ?? p.montant ?? 0),
    })),
    // Amount in words = the actual amount received (acompte/totalPaye), NOT totalTTC
    montantEnLettres: formatCurrencyToWords(Number(doc.totalPaye ?? doc.totalTTC ?? 0)),
    items,
    totals: {
      sousTotal: Number(doc.totalHT ?? 0),
      tva:
        Number(doc.totalTVA ?? doc.totalTVAAmount ?? 0) ||
        Number(doc.totalTTC ?? 0) - Number(doc.totalHT ?? 0),
      totalTTC: Number(doc.totalTTC ?? 0),
      acompte: Number(doc.totalPaye || 0),
      resteAPayer: Number(doc.resteAPayer || 0),
    },
  };
}
