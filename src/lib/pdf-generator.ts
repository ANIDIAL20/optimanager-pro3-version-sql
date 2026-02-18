
import React from 'react';
import { renderToStream } from '@react-pdf/renderer'; // Note: Using renderToStream for better performance in Node/Next
import { PdfDocumentTemplate } from '@/components/documents/pdf-document-template';
import { resolveDocumentSettings, resolveSettingsForDocType } from '@/lib/document-settings';
import type { DocType } from '@/types/document-settings-types';

export interface GeneratePDFOptions {
  type: DocType;
  data: any;
  shopId: number;
  snapshot?: any;
  forceLatest?: boolean; // ✅ UPDATED - ignore snapshot and use latest settings
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
  forceLatest = false,
}: GeneratePDFOptions): Promise<NodeJS.ReadableStream> {
  // Cascade: snapshot -> current -> defaults
  // ✅ UPDATED
  const effectiveSettings = await resolveDocumentSettings(
    shopId,
    forceLatest ? null : snapshot
  );
  const resolvedForDocType = resolveSettingsForDocType(effectiveSettings, type);

  console.log(`[PDF_GENERATOR] Type: ${type}, ShopId: ${shopId}`);
  console.log(`[PDF_GENERATOR] Snapshot exists: ${!!snapshot}`);
  console.log(`[PDF_GENERATOR] Using version: ${effectiveSettings.version}`);
  console.log(`[PDF_GENERATOR] Primary color: ${effectiveSettings.default.primaryColor}`);

  // Create React element (no JSX in Node.js context)
  // @ts-ignore
  const element = React.createElement(PdfDocumentTemplate, {
    docType: type,
    data,
    documentSettings: resolvedForDocType,
  });

  // Generate Stream
  // @ts-ignore
  return await renderToStream(element);
}
