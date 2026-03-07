/**
 * /print/devis/[id] — Server Component
 *
 * Both getPrintData() and getDocumentConfig() run on the server before the
 * first byte of HTML is sent to the browser, so the correct DocumentTemplateConfig
 * is applied on the very first paint without any flash.
 */
import { notFound } from 'next/navigation';
import { getPrintData } from '@/app/actions/print-actions';
import { getDocumentConfigForPrint } from '@/app/actions/shop-actions';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document-template';
import { devisAdapter } from '@/lib/documents/adapters';
import { PrintShell } from '@/components/printing/print-shell';

interface DevisPrintPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string; autoprint?: string; preview?: string }>;
}

export default async function DevisPrintPage({
  params,
  searchParams,
}: DevisPrintPageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const [result, docConfig] = await Promise.all([
    getPrintData(id, 'devis'),
    getDocumentConfigForPrint(),
  ]);

  if (!result.success || !result.data) notFound();

  const data = devisAdapter.toStandardDocument(result.data);

  return (
    <PrintShell
      data={data}
      config={docConfig ?? DEFAULT_TEMPLATE_CONFIG}
      autoprint={sp.auto === 'true' || sp.autoprint === 'true'}
      isPreview={!!sp.preview}
    />
  );
}
