'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrandLoader } from '@/components/ui/loader-brand';
import { getPrintData } from '@/app/actions/print-actions';
import { getDocumentConfig } from '@/app/actions/shop-actions';
import { PrintDocumentTemplate } from '@/components/printing/print-document-template';
import { useToast } from '@/hooks/use-toast';
import type { StandardDocumentData } from '@/types/document';
import type { DocumentTemplateConfig } from '@/types/document-template';

interface DevisPrintPageProps {
  params: Promise<{ id: string }>;
}

export default function DevisPrintPage({ params }: DevisPrintPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { toast } = useToast();

  const searchParams = useSearchParams();
  const shouldAutoPrint = searchParams.get('auto') === 'true';
  const isPreview = !!searchParams.get('preview');

  const [data, setData] = React.useState<StandardDocumentData | null>(null);
  const [docConfig, setDocConfig] = React.useState<DocumentTemplateConfig | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;
    Promise.all([
      getPrintData(id, 'devis'),
      getDocumentConfig(),
    ]).then(([result, cfg]) => {
      setDocConfig(cfg);
      if (result.success && result.data) {
        const { document: doc, client, settings } = result.data as any;

        // ── Map raw getPrintData result → StandardDocumentData ──────────
        const totalHT  = Number(doc.totalHT  ?? 0);
        const totalTTC = Number(doc.totalTTC ?? 0);

        const mapped: StandardDocumentData = {
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
            total: Number(item.lineTotal ?? item.total ?? item.lineTotalTTC ?? 0) ||
              (item.quantity ?? 1) * Number(item.unitPrice ?? item.prixVente ?? item.unitPriceTTC ?? 0),
            tvaRate: item.tvaRate !== undefined ? Number(item.tvaRate) : 20,
            lensDetails: item.lensDetails,
            contactLensDetails: item.contactLensDetails,
          })),
          totals: {
            sousTotal: totalHT,
            tva: totalTTC - totalHT,
            totalTTC: totalTTC,
          },
        };

        setData(mapped);
      } else {
        toast({ variant: 'destructive', title: 'Erreur', description: (result as any).error });
        router.push('/dashboard/devis');
      }
      setIsLoading(false);
    });
  }, [id, router, toast]);

  // Auto-print
  React.useEffect(() => {
    if (!isLoading && data && shouldAutoPrint) {
      const t = setTimeout(() => window.print(), 800);
      return () => clearTimeout(t);
    }
  }, [isLoading, data, shouldAutoPrint]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-[100] bg-white flex items-center justify-center">
        <BrandLoader size="md" className="text-gray-400" />
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8 print:bg-white print:py-0">
      <PrintDocumentTemplate
        data={data}
        config={docConfig}
        showToolbar={!isPreview}
        onBack={() => router.back()}
      />
    </div>
  );
}
