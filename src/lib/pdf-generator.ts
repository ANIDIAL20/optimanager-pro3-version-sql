
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

  // Create React element
  const element = React.createElement(PdfDocumentTemplate, {
    docType: type,
    data,
    documentSettings: resolvedForDocType,
  });

  console.log(`[PDF_GENERATOR] Generating stream for docType: ${type}`);

  try {
    const { pdf } = await import('@react-pdf/renderer');
    const instance = pdf(element as any) as any;
    
    // In Node.js environments with recent react-pdf versions, toStream() is the standard
    if (instance.toStream) {
      return await instance.toStream();
    }
    
    // Fallback if toStream is missing
    console.warn(`[PDF_GENERATOR] toStream missing on instance, falling back to renderToStream`);
    const { renderToStream: rts } = await import('@react-pdf/renderer');
    return await rts(element as any);
  } catch (err: any) {
    console.error(`[PDF_GENERATOR] Critical Error:`, err);
    throw new Error(`PDF Stream generation failed: ${err.message}`);
  }
}
