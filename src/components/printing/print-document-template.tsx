'use client';

import * as React from 'react';
import { Printer, ArrowLeft } from 'lucide-react';
import type { StandardDocumentData } from '@/types/document';
import type { DocumentTemplateConfig } from '@/types/document-template';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document-template';
import { FacturePDF } from './FacturePDF';
import { DevisPDF } from './DevisPDF';
import { RecuPDF } from './RecuPDF';
import { BonDeCommandePDF } from './BonDeCommandePDF';

interface PrintDocumentTemplateProps {
  data: StandardDocumentData;
  /** Optional template config — falls back to DEFAULT_TEMPLATE_CONFIG */
  config?: DocumentTemplateConfig;
  /** Show the toolbar (Back + Print buttons). Default: true */
  showToolbar?: boolean;
  onBack?: () => void;
  /** Custom content slot that bypasses the classic items table and totals */
  customContent?: React.ReactNode;
}

export function PrintDocumentTemplate({
  data,
  config: configProp,
  showToolbar = true,
  onBack,
  customContent,
}: PrintDocumentTemplateProps) {
  const config = { ...DEFAULT_TEMPLATE_CONFIG, ...configProp };

  const renderCurrentDocument = () => {
    if (customContent) {
      return (
        <div className="w-[210mm] mx-auto bg-white p-8 md:p-10 print:p-8">
          {customContent}
        </div>
      );
    }

    switch (data.type) {
      case 'DEVIS':
        return <DevisPDF data={data} config={config} />;
      case 'REÇU':
        return <RecuPDF data={data} config={config} />;
      case 'BON DE COMMANDE':
        return <BonDeCommandePDF data={data} config={config} />;
      case 'FACTURE':
      default:
        return <FacturePDF data={data} config={config} />;
    }
  };

  return (
    <>
      {/* ── Toolbar (screen only) ─────────────────────────────────────────── */}
      {showToolbar && (
        <div className="w-full max-w-[210mm] mx-auto mb-6 flex justify-between px-4 print:hidden">
          <button
            onClick={onBack ?? (() => window.history.back())}
            className="flex items-center gap-2 border border-gray-300 text-gray-700
                       px-4 py-2 rounded-md hover:bg-gray-50 transition text-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-blue-600 text-white
                       px-4 py-2 rounded-md hover:bg-blue-700 transition text-sm"
          >
            <Printer className="w-4 h-4" />
            Imprimer le document
          </button>
        </div>
      )}

      {/* ── Document Content Area ────────────────────────────────────────── */}
      <div className="print:m-0">
        {renderCurrentDocument()}
      </div>

      <style>{`
        @media print {
          @page {
            size: A4;
            margin: 0;
          }
          body {
            background-color: white;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Ensure no extra margins from browser */
          header, footer, .no-print {
            display: none !important;
          }
        }
      `}</style>
    </>
  );
}
