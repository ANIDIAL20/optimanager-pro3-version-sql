
import React from 'react';
import { renderToStream } from '@react-pdf/renderer'; // Note: Using renderToStream for better performance in Node/Next
import { PdfDocumentTemplate } from '@/components/documents/pdf-document-template';
import { resolveDocumentSettings } from '@/lib/document-settings';
import type { DocumentSettings } from '@/lib/document-settings-types';

export interface GeneratePDFOptions {
  type: 'facture' | 'devis';
  data: any;
  shopId: number;
  snapshot?: any;
}

/**
 * Generate PDF with settings cascade resolution
 * Returns a readable stream for performance
 */
export async function generateDocumentPDFStream({
  type,
  data,
  shopId,
  snapshot,
}: GeneratePDFOptions): Promise<NodeJS.ReadableStream> {
  // Cascade: snapshot -> current -> defaults
  const effectiveSettings = await resolveDocumentSettings(shopId, snapshot);

  console.log(`[PDF_GENERATOR] Type: ${type}, ShopId: ${shopId}`);
  console.log(`[PDF_GENERATOR] Snapshot exists: ${!!snapshot}`);
  console.log(`[PDF_GENERATOR] Using version: ${effectiveSettings.version}`);
  console.log(`[PDF_GENERATOR] Primary color: ${effectiveSettings.default.primaryColor}`);

  // Create React element (no JSX in Node.js context)
  // @ts-ignore
  const element = React.createElement(PdfDocumentTemplate, {
    type,
    data,
    documentSettings: effectiveSettings,
  });

  // Generate Stream
  // @ts-ignore
  return await renderToStream(element);
}
