'use client';

/**
 * PrintShell — thin 'use client' wrapper around PrintDocumentTemplate.
 *
 * The parent Server Component pre-fetches both document data and the saved
 * DocumentTemplateConfig before any HTML is sent to the browser, then passes
 * them as serialisable props here. This eliminates the flash of the default
 * "classic" template that occurred when the old 'use client' pages fetched
 * config in a useEffect.
 *
 * This component owns:
 *   • useRouter() for the "Back" button
 *   • Conditional <AutoPrint /> mount
 *   • The page-level wrapper div (min-h-screen / print reset)
 */

import { useRouter } from 'next/navigation';
import { PrintDocumentTemplate } from '@/components/printing/print-document-template';
import { AutoPrint } from '@/components/printing/auto-print';
import type { StandardDocumentData } from '@/types/document';
import type { DocumentTemplateConfig } from '@/types/document-template';
import { usePrintTitle } from '@/hooks/use-print-title';
import { generatePdfFilename } from '@/lib/utils/filename';

interface PrintShellProps {
  data: StandardDocumentData;
  config: DocumentTemplateConfig;
  /** Trigger window.print() automatically after fonts + images are ready */
  autoprint?: boolean;
  /** Hide the Back/Print toolbar (e.g. when opened in ?preview mode) */
  isPreview?: boolean;
}

export function PrintShell({
  data,
  config,
  autoprint = false,
  isPreview = false,
}: PrintShellProps) {
  const router = useRouter();

  // Unified filename generation for all documents using PrintShell
  // Reçu, generic documents, etc.
  const prefix = data.type === 'REÇU' ? 'Recu' : 
                 data.type === 'DEVIS' ? 'Devis' : 
                 data.type === 'FACTURE' ? 'Facture' : 
                 data.type === 'BON DE COMMANDE' ? 'Commande_Labo' : 'Document';

  usePrintTitle(
    generatePdfFilename(prefix, data.documentNumber, data.client?.nom || data.fournisseur?.nom)
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 print:bg-white print:py-0">
      {autoprint && <AutoPrint />}
      <PrintDocumentTemplate
        data={data}
        config={config}
        showToolbar={!isPreview}
        onBack={() => router.back()}
      />
    </div>
  );
}
