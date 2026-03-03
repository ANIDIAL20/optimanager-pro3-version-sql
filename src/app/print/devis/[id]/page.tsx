'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { BrandLoader } from '@/components/ui/loader-brand';
import { getPrintData } from '@/app/actions/print-actions';
import { getDocumentConfig } from '@/app/actions/shop-actions';
import { PrintDocumentTemplate } from '@/components/printing/print-document-template';
import { AutoPrint } from '@/components/printing/auto-print';
import { useToast } from '@/hooks/use-toast';
import { devisAdapter } from '@/lib/documents/adapters';
import type { StandardDocumentData } from '@/types/document';
import type { DocumentTemplateConfig } from '@/types/document-template';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document-template';

interface DevisPrintPageProps {
  params: Promise<{ id: string }>;
}

export default function DevisPrintPage({ params }: DevisPrintPageProps) {
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
      getPrintData(id, 'devis'),
      getDocumentConfig(),
    ]).then(([result, cfg]) => {
      setDocConfig(cfg);
      if (result.success && result.data) {
        setData(devisAdapter.toStandardDocument(result.data));
      } else {
        toast({ variant: 'destructive', title: 'Erreur', description: (result as any).error });
        router.push('/dashboard/devis');
      }
      setIsLoading(false);
    });
  }, [id, router, toast]);

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
