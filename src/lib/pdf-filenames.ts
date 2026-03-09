
export type DocumentType = 'Facture' | 'Devis' | 'Commande' | 'Recu';

/**
 * Standardizes the PDF filename generation logic across the application.
 * Format: [Type_Document]_[Reference]_[Client_Name].pdf
 */
export function generateDocumentFilename(
  type: string, 
  reference: string, 
  clientName: string = "Client"
): string {
  const cleanName = clientName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_") // remove double underscores
    .replace(/^_|_$/g, ""); // remove trailing underscores
  
  // Clean reference to ensure no illegal filename characters
  const cleanRef = reference.replace(/[^a-zA-Z0-9-]/g, "_");
  
  return `${type}_${cleanRef}_${cleanName}.pdf`;
}

// Keep the DocumentType export for type safety elsewhere
export type { DocumentType as DocTypeType };
