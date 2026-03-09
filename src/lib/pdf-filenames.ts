export type DocumentType = 'Facture' | 'Devis' | 'BonCommande' | 'Commande' | 'Recu';

function sanitizeFilenameSegment(value: string | null | undefined, fallback: string) {
  const sanitized = (value ?? '')
    .trim()
    .normalize('NFC')
    .replace(/[\\/:*?"<>|]/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  return sanitized || fallback;
}

export function generateDocumentFilename(
  type: string,
  reference: string,
  clientName: string = 'Client'
): string {
  const safeType = sanitizeFilenameSegment(type, 'Document');
  const safeReference = sanitizeFilenameSegment(reference, 'Reference');
  const safeClientName = sanitizeFilenameSegment(clientName, 'Client');

  return `${safeType}_${safeReference}_${safeClientName}.pdf`;
}

export type { DocumentType as DocTypeType };