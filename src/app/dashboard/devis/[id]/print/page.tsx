/**
 * /dashboard/devis/[id]/print — Server Component
 * Standardized to match the unified printing system.
 */
import { notFound } from 'next/navigation';
import { getPrintData } from '@/app/actions/print-actions';
import { getDocumentConfig } from '@/app/actions/shop-actions';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document-template';
import { devisAdapter } from '@/lib/documents/adapters';
import { PrintShell } from '@/components/printing/print-shell';
import { generateDocumentFilename } from '@/lib/pdf-filenames';
import type { Metadata } from 'next';

interface Props {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string; autoprint?: string; preview?: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getPrintData(id, 'devis');
  
  if (!result.success || !result.data) {
    return { title: 'Devis - OptiManager Pro' };
  }

  const data = devisAdapter.toStandardDocument(result.data);
  const filename = generateDocumentFilename('Devis', data.documentNumber, data.client?.nom || 'Client');

  return {
    title: filename,
  };
}

export default async function DevisPrintPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;

  const [result, config] = await Promise.all([
    getPrintData(id, 'devis'),
    getDocumentConfig()
  ]);

  if (!result.success || !result.data) {
    notFound();
  }

  const data = devisAdapter.toStandardDocument(result.data);

  return (
    <PrintShell 
      data={data} 
      config={config ?? DEFAULT_TEMPLATE_CONFIG} 
      autoprint={sp.auto === 'true' || sp.autoprint === 'true'}
      isPreview={!!sp.preview}
    />
  );
}
