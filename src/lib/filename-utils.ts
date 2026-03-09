import { generateDocumentFilename } from '@/lib/pdf-filenames';

export function buildFactureFilename(reference: string, clientName?: string) {
  return generateDocumentFilename('Facture', reference, clientName ?? 'Client');
}

export function buildDevisFilename(reference: string, clientName?: string) {
  return generateDocumentFilename('Devis', reference, clientName ?? 'Client');
}

export function buildRecuFilename(reference: string, clientName?: string) {
  return generateDocumentFilename('Recu', reference, clientName ?? 'Client');
}

export function buildBonCommandeFilename(reference: string, clientName?: string) {
  return generateDocumentFilename('BonCommande', reference, clientName ?? 'Fournisseur');
}