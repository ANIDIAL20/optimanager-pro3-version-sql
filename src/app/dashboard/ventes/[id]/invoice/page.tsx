'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { getPrintData } from '@/app/actions/print-actions';
import { getDocumentConfig } from '@/app/actions/shop-actions';
import { PrintDocumentTemplate } from '@/components/printing/print-document-template';
import { useToast } from '@/hooks/use-toast';
import { BrandLoader } from '@/components/ui/loader-brand';
import type { StandardDocumentData } from '@/types/document';
import type { DocumentTemplateConfig } from '@/types/document-template';
import { usePrintTitle } from '@/hooks/use-print-title';
import { buildPdfFileName } from '@/lib/pdf-filenames';

interface InvoicePageProps {
  params: Promise<{ id: string }>;
}

export default function InvoicePage({ params }: InvoicePageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = React.useState<StandardDocumentData | null>(null);
  const [docConfig, setDocConfig] = React.useState<DocumentTemplateConfig | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;
    Promise.all([
      getPrintData(id, 'facture'),
      getDocumentConfig(),
    ]).then(([result, cfg]) => {
      setDocConfig(cfg);
      if (result.success && result.data) {
        const { document: doc, client, settings } = result.data as any;

        const mapped: StandardDocumentData = {
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
          shop: {
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
          },
          items: (doc.items ?? []).map((item: any, i: number) => ({
            id: item.id?.toString() ?? String(i),
            description: item.productName ?? item.nomProduit ?? item.designation ?? item.label ?? '',
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
          })),
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

        setData(mapped);
      } else {
        toast({ variant: 'destructive', title: 'Erreur', description: (result as any).error });
        router.push('/dashboard/ventes');
      }
      setIsLoading(false);
    });
  }, [id, router, toast]);

  usePrintTitle(
    data ? buildPdfFileName({ type: 'facture', reference: data.documentNumber }) : null
  );

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">
        <BrandLoader size="md" className="text-gray-400" />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-gray-50 overflow-auto print:relative print:inset-auto print:bg-white">
      <div className="py-8 print:py-0">
        <PrintDocumentTemplate
          data={data}
          config={docConfig}
          showToolbar
          onBack={() => router.back()}
        />
      </div>
    </div>
  );
}
