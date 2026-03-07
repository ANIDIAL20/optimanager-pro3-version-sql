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

interface RecuPrintPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string; autoprint?: string; preview?: string }>;
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
