


export interface Product {
  id: string;
  reference: string;
  nomProduit: string;
  prixAchat: number;
  prixVente: number;
  quantiteStock: number;
  stockMin?: number; // Minimum stock threshold for alerts
  categorieId: string;
  marqueId: string;
  couleurId?: string;
  matiereId?: string;
  imageUrl?: string;
  imageHint?: string;
  description?: string;
  categorie?: string; // Added for categorization
}


export interface Client {
  id: string;
  nom: string;
  prenom: string;
  name?: string; // Legacy support
  phone?: string; // Legacy support
  sexe?: 'Homme' | 'Femme';
  cni?: string;
  dateNaissance?: string;
  telephone1: string;
  telephone2?: string;
  email?: string;
  adresse?: string;
  ville?: string;
  assuranceId?: string;
  mutuelle?: string; // Added alias
  lastVisit?: string;
  photoUrl?: string;
  creditBalance?: number;
  totalSpent?: number;
  ordersCount?: number;
  totalDebt?: number;
  if?: string;
  ice?: string;
  rc?: string;
  prescriptions?: Prescription[];

  // New Admin Fields
  status?: 'active' | 'suspended' | 'frozen';
  quotas?: {
    maxProducts: number;
    maxTeamMembers: number;
    maxStorage: number; // in GB
  };
  gracePeriodDays?: number;
  subscriptionEndDate?: any; // Timestamp or string
}


export interface Prescription {
  id: string;
  clientId: string;
  date: string;
  type: "Vision de loin" | "Vision de pres" | "Progressif";
  prescripteur: string;

  odSphere?: string;
  odCylindre?: string;
  odAxe?: string;
  odAddition?: string;
  odBc?: string;
  odDia?: string;

  ogSphere?: string;
  ogCylindre?: string;
  ogAxe?: string;
  ogAddition?: string;
  ogBc?: string;
  ogDia?: string;

  ecartPupillaire?: string;
  hauteurMontage?: string;
  pontage?: string;
  branches?: string;
  diametre?: string;
  notes?: string;
}

export interface ContactLensPrescription {
  id: string;
  clientId: string;
  date: string;
  lensType: 'Souple journalière' | 'Souple mensuelle' | 'Rigide' | 'Torique' | 'Multifocale';
  prescripteur: string;
  lensBrand?: string;

  odSphere?: string;
  odCylindre?: string;
  odAxe?: string;
  odAddition?: string;
  odBc?: string;
  odDia?: string;

  ogSphere?: string;
  ogCylindre?: string;
  ogAxe?: string;
  ogAddition?: string;
  ogBc?: string;
  ogDia?: string;

  portDuree?: 'Journalière' | 'Hebdomadaire' | 'Mensuelle';
  dateExpiration?: string;
  notes?: string;
}

export interface ClientLensOrder {
  id: string;
  clientId: string;
  prescriptionId: string;
  orderDate: string;
  supplierId: string;
  lensType: string;
  treatments: string[];
  status: 'Draft' | 'Ordered' | 'Received' | 'Delivered';
  notes?: string;
  correction: {
    odSphere?: string; odCylindre?: string; odAxe?: string; odAddition?: string;
    ogSphere?: string; ogCylindre?: string; ogAxe?: string; ogAddition?: string;
    ecartPupillaire?: string; hauteurMontage?: string;
  }
}

export interface PaymentHistoryItem {
  id: string;
  amount: number;
  date: string;
  method: string;
  note?: string;
  receivedBy?: string;
}

export interface SaleItem {
  productId: string; // or productRef
  productRef?: string;
  nomProduit?: string;
  productName?: string; // alias
  reference?: string;
  prixVente?: number;
  unitPrice?: number; // alias
  quantity: number;
  returnedQuantity?: number;
  price: number;
  total?: number;
}

export interface Sale {
  id: string;
  saleNumber?: string;
  clientId: string;
  clientNom?: string;
  clientPrenom?: string;
  date: string;
  totalAmount?: number;
  totalNet: number;
  totalPaye: number;
  resteAPayer: number;
  status?: 'payée' | 'partiel' | 'impayée' | 'devis' | 'en_attente' | 'paye' | 'impaye'; // Add variations
  type?: 'commande' | 'devis';
  notes?: string;
  paymentMethod?: 'cash' | 'bank' | 'credit';
  paymentHistory?: PaymentHistoryItem[];
  lastPaymentDate?: string;
  items: SaleItem[];
  totalHT?: number;
  totalTVA?: number;
  totalTTC?: number;

  // Lens Order Lifecycle Fields
  // status duplicate removed
  supplierId?: string;
  supplierName?: string;
  buyingPrice?: number;        // Cost price from supplier invoice
  supplierInvoiceRef?: string; // BL/Invoice number
  receivedAt?: any;            // Timestamp or Date
  deliveredAt?: any;           // Timestamp or Date
}

export interface OrderDetail {
  id: string;
  orderId: string;
  produitId: string;
  nom: string;
  prix: number;
  quantite: number;
}

export interface Purchase {
  id: string;
  date: string;
  supplierId: string;
  items: {
    productId: string;
    quantity: number;
    cost: number;
  }[];
  status: 'pending' | 'completed';
  totalAmount: number;
}


export interface SettingsItem {
  id: string;
  name: string;
  [key: string]: any;
}

export interface Assurance {
  id: string;
  name: string;
}

export type BrandCategory = 'Premium' | 'Populaire' | 'Française' | 'Autre';

export interface Brand {
  id: string;
  name: string;
  category: BrandCategory;
}


export interface Category {
  id: string;
  name: string;
}

export interface Material {
  id: string;
  name: string;
  type?: 'Monture' | 'Verre' | 'Lentille';
}

export interface Color {
  id: string;
  name: string;
  hexCode?: string;
}

export interface Supplier {
  id: string;
  nomCommercial: string;
  raisonSociale?: string;
  typeProduits?: string[];
  telephone: string;
  email?: string;
  adresse?: string;
  ville?: string;
  pays?: string;
  if?: string;
  ice?: string;
  rc?: string;
  rib?: string;
  banque?: string;
  delaiPaiement?: "Comptant" | "30 jours" | "60 jours" | "90 jours";
  modePaiement?: "Espèces" | "Chèque" | "Virement" | "Carte";
  remise?: number;
  contactNom?: string;
  contactTelephone?: string;
  contactEmail?: string;
  notes?: string;
  statut: "Actif" | "Inactif";
  totalAchats?: number;
  dateCreation: any;
  dateModification: any;
}


export interface Traitement {
  id: string;
  name: string;
}

export interface TypeMontage {
  id: string;
  name: string;
}

export interface Banque {
  id: string;
  name: string;
  code?: string;
}



export interface Order {
  id: string;
  client_id: string;
  client_nom: string;
  utilisateur_id: string;
  date_creation: string;
  total: number;
  statut: string;
}
