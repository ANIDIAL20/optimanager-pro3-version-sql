/**
 * /print/recu/[id] — Server Component
 *
 * Both getPrintData() and getDocumentConfig() run on the server before the
 * first byte of HTML is sent to the browser, so the correct DocumentTemplateConfig
 * is applied on the very first paint without any flash.
 */
import { notFound } from 'next/navigation';
import { getPrintData } from '@/app/actions/print-actions';
import { getDocumentConfigForPrint } from '@/app/actions/shop-actions';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document-template';
import { recuAdapter } from '@/lib/documents/adapters';
import { PrintShell } from '@/components/printing/print-shell';
import { generateDocumentFilename } from '@/lib/pdf-filenames';
import type { Metadata } from 'next';

interface RecuPrintPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string; autoprint?: string; preview?: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getPrintData(id, 'recu');
  
  if (!result.success || !result.data) {
    return { title: 'Reçu - OptiManager Pro' };
  }

  const data = recuAdapter.toStandardDocument(result.data);
  const filename = generateDocumentFilename('Recu', data.documentNumber, data.client?.nom || 'Client');

  return {
    title: filename,
  };
}

export default async function RecuPrintPage({
  params,
  searchParams,
}: RecuPrintPageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const [result, docConfig] = await Promise.all([
    getPrintData(id, 'recu'),
    getDocumentConfigForPrint(),
  ]);

  if (!result.success || !result.data) notFound();

  const data = recuAdapter.toStandardDocument(result.data);

  return (
    <PrintShell
      data={data}
      config={docConfig ?? DEFAULT_TEMPLATE_CONFIG}
      autoprint={sp.auto === 'true' || sp.autoprint === 'true'}
      isPreview={!!sp.preview}
    />
  );
}
