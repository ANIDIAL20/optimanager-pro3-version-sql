export type DocType = 'Facture' | 'Devis' | 'Recu' | 'Commande';

export function generateDocumentFilename(type: DocType, reference: string, clientName: string = 'Client'): string {
  if (!reference) reference = 'DOC';
  
  const cleanName = clientName
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^a-zA-Z0-9\u0600-\u06FF]/g, "_") // Keep alphanumeric + Arabic, replace rest with _
    .replace(/_+/g, "_").replace(/^_|_$/g, ""); // Clean up underscores
  
  return `${type}_${reference}_${cleanName}.pdf`;
}
