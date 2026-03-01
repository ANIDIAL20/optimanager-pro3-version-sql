// @ts-nocheck — legacy page; getDocumentAction is a stub (not implemented)
// Refactored: now uses PrintDocumentTemplate for consistent output.
// When getDocumentAction is implemented, map its result to StandardDocumentData here.

import { db } from '@/db';
import { shopProfiles } from '@/db/schema';
import { getDocumentAction } from '@/app/actions/document-actions';
import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { PrintDocumentTemplate } from '@/components/printing/print-document-template';
import type { StandardDocumentData } from '@/types/document';

export default async function PrintDocumentPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { success, document, error } = await getDocumentAction(parseInt(params.id));

  if (!success || !document) {
    return (
      <div className="p-8 text-red-600">
        Erreur: {error || 'Document introuvable'}
      </div>
    );
  }

  const shopProfile = await db.query.shopProfiles.findFirst({
    where: eq(shopProfiles.userId, session.user.id),
  });

  const shop = shopProfile ?? {
    shopName: 'Mon Opticien',
    address: 'Adresse magasin',
    phone: '0600000000',
    email: session.user.email ?? '',
  };

  // ── Map generic document → StandardDocumentData ───────────────────────────
  const docItems = (document.items ?? []).map((item: any, i: number) => ({
    id: item.id?.toString() ?? String(i),
    description: item.productName ?? item.designation ?? item.label ?? '',
    reference: item.reference,
    marque: item.marque ?? item.brand,
    modele: item.modele ?? item.model,
    quantite: item.quantity ?? item.quantite ?? 1,
    prixUnitaire: Number(item.unitPrice ?? item.prixVente ?? 0),
    total:
      Number(item.lineTotal ?? item.total ?? 0) ||
      (item.quantity ?? 1) * Number(item.unitPrice ?? item.prixVente ?? 0),
    tvaRate: item.tvaRate !== undefined ? Number(item.tvaRate) : 20,
  }));

  const totalTTC = Number(document.totalTTC ?? document.totalNet ?? 0);
  const totalHT  = Number(document.totalHT  ?? 0);

  const data: StandardDocumentData = {
    type: (document.type as any) ?? 'BON DE COMMANDE',
    documentNumber: document.documentNumber ?? document.id?.toString() ?? '',
    date: (document.createdAt ?? document.date ?? new Date()).toString(),
    client: {
      nom:       document.clientName ?? 'Client',
      telephone: document.clientPhone,
      adresse:   document.clientAddress,
    },
    shop: {
      nom:      (shop as any).storeName ?? (shop as any).shopName ?? 'OptiManager',
      adresse:  (shop as any).address   ?? 'Adresse non renseignée',
      telephone:(shop as any).phone     ?? '',
      logoUrl:  (shop as any).logoUrl,
      ice:      (shop as any).ice,
      rc:       (shop as any).rc,
    },
    items: docItems,
    totals: {
      sousTotal: totalHT,
      tva: totalTTC - totalHT,
      totalTTC,
    },
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 print:bg-white print:py-0">
      <PrintDocumentTemplate data={data} showToolbar />
    </div>
  );
}
