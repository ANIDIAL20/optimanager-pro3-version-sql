'use client';

import type { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { PrintDocumentTemplate } from '@/components/printing/print-document-template';
import { AutoPrint } from '@/components/printing/auto-print';
import type { StandardDocumentData } from '@/types/document';
import type { DocumentTemplateConfig } from '@/types/document-template';
import { usePrintTitle } from '@/hooks/use-print-title';
import {
  buildBonCommandeFilename,
  buildDevisFilename,
  buildFactureFilename,
  buildRecuFilename,
} from '@/lib/filename-utils';

interface PrintShellProps {
  data?: StandardDocumentData;
  config?: DocumentTemplateConfig;
  documentTitle?: string;
  children?: ReactNode;
  autoprint?: boolean;
  isPreview?: boolean;
}

function resolveDocumentTitle(data?: StandardDocumentData, documentTitle?: string) {
  if (documentTitle) {
    return documentTitle;
  }

  if (!data) {
    return 'OptiManager Pro.pdf';
  }

  if (data.type === 'FACTURE') {
    return buildFactureFilename(data.documentNumber, data.client?.nom);
  }

  if (data.type === 'DEVIS') {
    return buildDevisFilename(data.documentNumber, data.client?.nom);
  }

  if (data.type === 'REÇU') {
    return buildRecuFilename(data.documentNumber, data.client?.nom);
  }

  return buildBonCommandeFilename(data.documentNumber, data.fournisseur?.nom);
}

export function PrintShell({
  data,
  config,
  documentTitle,
  children,
  autoprint = false,
  isPreview = false,
}: PrintShellProps) {
  const router = useRouter();
  const resolvedTitle = resolveDocumentTitle(data, documentTitle);

  usePrintTitle(resolvedTitle);

  return (
    <div className="min-h-screen bg-gray-50 py-8 print:bg-white print:py-0">
      {autoprint && <AutoPrint />}
      {children ?? (data && config ? (
        <PrintDocumentTemplate
          data={data}
          config={config}
          showToolbar={!isPreview}
          onBack={() => router.back()}
        />
      ) : null)}
    </div>
  );
}