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
    ep?: string;         // écart pupillaire
    hauteur?: string;    // hauteur de montage
    treatment?: string;
    // Shared per-item metadata (same value for OD and OG, displayed once)
    geometry?: string;   // 'Unifocal' | 'Progressif' | 'Bifocal' | 'Lentilles'
    index?: string;      // '1.5' | '1.6' | '1.67' | '1.74'
    brand?: string;      // Marque + Modèle du verre
  }>;
  contactLensDetails?: Array<{
    eye: string;
    power?: string;
    baseCurve?: string;
    diameter?: string;
  }>;
}

export interface StandardDocumentData {
  type: 'FACTURE' | 'DEVIS' | 'BON DE COMMANDE' | 'REÇU';
  documentNumber: string;
  /** ISO string — NOT Date object (Server Action serialization safety) */
  date: string;
  validityDays?: number; // for DEVIS: shown as "Validité: 15 jours"
  status?: string;       // shown as badge on FACTURE
  /** Payment method — used on REÇU: "Espèces" | "Carte" | "Virement" | "Chèque" */
  modePaiement?: string;

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

  /** Ordonnance information for REÇU */
  ordonnance?: {
    prescripteur: string;
    dateOrdonnance: string;
  };

  /** Multiple payments history for REÇU */
  paiements?: Array<{
    date: string;
    mode: string;
    montant: number;
  }>;

  /** Total amount written in words for REÇU */
  montantEnLettres?: string;

  /**
   * Recipient for FACTURE / DEVIS / REÇU.
   * Must be omitted / undefined for BON DE COMMANDE.
   */
  client?: {
    nom: string;
    telephone?: string;
    adresse?: string;
    mutuelle?: string;
    ice?: string;  // for B2B clients
  };

  /**
   * Recipient for BON DE COMMANDE only.
   * Must be omitted / undefined for FACTURE / DEVIS / REÇU.
   */
  fournisseur?: {
    nom: string;
    adresse?: string;
    telephone?: string;
    email?: string;
    contact?: string;               // nom du responsable commercial
    delaiLivraison?: string;        // ex: "7-10 jours ouvrables"
    conditionsPaiement?: string;    // ex: "30 jours fin de mois"
    reference?: string;             // fournisseur's own reference
  };

  /** Extra metadata specific to BON DE COMMANDE */
  commandeDetails?: {
    lieuLivraison?: string;             // ex: "Magasin Principal, 12 Rue..."
    dateLivraisonSouhaitee?: string;    // ISO string
    observations?: string;             // free text notes to supplier
    validiteOffre?: string;            // ex: "Offre valable 30 jours"
  };

  items: DocumentItem[];

  totals: {
    sousTotal: number;      // HT
    tva?: number;           // optional — NOT shown on BON DE COMMANDE
    totalTTC: number;
    acompte?: number;       // shown in green if present and > 0
    resteAPayer?: number;   // shown in red if defined
  };
}
