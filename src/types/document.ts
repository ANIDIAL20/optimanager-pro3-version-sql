// =============================================
// Universal Document Types — OptiManager Pro
// =============================================

export interface DocumentItem {
  id: string;
  description: string;
  quantite: number;
  prixUnitaire: number;
  total: number;
  /** Optional: shown as small badge below description */
  reference?: string;
  marque?: string;
  modele?: string;
  couleur?: string;
  tvaRate?: number; // e.g. 20 for 20%
  /** Richly-structured lens/contact-lens details — rendered as tags */
  lensDetails?: Array<{
    eye: 'OD' | 'OG';
    sphere?: string;
    cylinder?: string;
    axis?: string;
    addition?: string;
    treatment?: string;
  }>;
  contactLensDetails?: Array<{
    eye: string;
    power?: string;
    baseCurve?: string;
    diameter?: string;
  }>;
}

export interface StandardDocumentData {
  type: 'FACTURE' | 'DEVIS' | 'BON DE COMMANDE';
  documentNumber: string;
  /** ISO string — NOT Date object (Server Action serialization safety) */
  date: string;
  validityDays?: number; // for DEVIS: shown as "Validité: 15 jours"
  status?: string;       // shown as badge on FACTURE

  client: {
    nom: string;
    telephone?: string;
    adresse?: string;
    mutuelle?: string;
  };

  shop: {
    nom: string;
    adresse: string;
    telephone: string;
    logoUrl?: string;      // fallback to shop name text if missing
    ice?: string;
    if_?: string;
    rc?: string;
    tp?: string;
    inpe?: string;
    rib?: string;
    paymentTerms?: string;
    paymentMethods?: string[];
    mentionsLegales?: string;
  };

  items: DocumentItem[];

  totals: {
    sousTotal: number;   // HT
    tva: number;
    totalTTC: number;
    acompte?: number;      // shown in green if present and > 0
    resteAPayer?: number;  // shown in red if defined
  };
}
