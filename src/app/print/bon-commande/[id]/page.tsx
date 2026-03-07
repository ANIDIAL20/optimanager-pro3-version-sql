'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrandLoader } from '@/components/ui/loader-brand';
import { getDocumentConfig } from '@/app/actions/shop-actions';
import { PrintDocumentTemplate } from '@/components/printing/print-document-template';
import { AutoPrint } from '@/components/printing/auto-print';
import { useToast } from '@/hooks/use-toast';
import { bonCommandeAdapter } from '@/lib/documents/adapters';
import type { StandardDocumentData } from '@/types/document';
import type { DocumentTemplateConfig } from '@/types/document-template';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document-template';
import { usePrintTitle } from '@/hooks/use-print-title';
import { generatePdfFilename } from '@/lib/utils/filename';

// Dynamic import keeps the server action out of the client bundle
async function getBonCommandeData(id: string) {
  const { getSupplierOrderPrintData } = await import('@/app/actions/supplier-orders-actions');
  return getSupplierOrderPrintData(id);
}

interface BonCommandePrintPageProps {
  params: Promise<{ id: string }>;
}

export default function BonCommandePrintPage({ params }: BonCommandePrintPageProps) {
  const { id } = React.use(params);
  const router = useRouter();
  const { toast } = useToast();

  const searchParams = useSearchParams();
  const shouldAutoPrint = searchParams.get('auto') === 'true' || searchParams.get('autoprint') === 'true';
  const isPreview = !!searchParams.get('preview');

  const [data, setData] = React.useState<StandardDocumentData | null>(null);
  const [docConfig, setDocConfig] = React.useState<DocumentTemplateConfig | undefined>(undefined);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    if (!id) return;
    Promise.all([
      getBonCommandeData(id),
      getDocumentConfig(),
    ]).then(([result, cfg]) => {
      setDocConfig(cfg);
      if (result.success && result.data) {
        setData(bonCommandeAdapter.toStandardDocument(result.data));
      } else {
        toast({ variant: 'destructive', title: 'Erreur', description: (result as any).error ?? 'Commande introuvable' });
        router.push('/dashboard/achats');
      }
      setIsLoading(false);
    });
  }, [id, router, toast]);

  usePrintTitle(
    data ? generatePdfFilename('Commande_Labo', data.documentNumber, data.fournisseur?.nom || data.client?.nom) : null
  );

  // Auto-print — handled by <AutoPrint /> rendered below

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
      {shouldAutoPrint && !isLoading && <AutoPrint />}
      <PrintDocumentTemplate
        data={data}
        config={docConfig ?? DEFAULT_TEMPLATE_CONFIG}
        showToolbar={!isPreview}
        onBack={() => router.back()}
      />
    </div>
  );
}
