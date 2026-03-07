/**
 * Generates a sanitized filename for PDF downloads/printing
 */
export function generatePdfFilename(prefix: string, reference: string, clientOrSupplierName: string | null | undefined): string {
  const sanitize = (str: string) => {
    if (!str) return '';
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-zA-Z0-9\u0600-\u06FF._-]/g, '_')   // replace non-alphanumeric with _ (keep Arabic)
      .replace(/_+/g, '_')             // collapsed multiple _
      .replace(/^_|_$/g, '');          // trim _
  };

  const safeRef = sanitize(reference);
  const safeName = sanitize(clientOrSupplierName || '');
  
  if (!safeName) return `${prefix}_${safeRef}`;
  return `${prefix}_${safeRef}_${safeName}`;
}
