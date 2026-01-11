
'use client';

import {
  collection,
  doc,
  getDoc,
  runTransaction,
  writeBatch,
  Timestamp,
  DocumentReference,
  Firestore,
  addDoc,
} from 'firebase/firestore';

// ---------------------------------
// 1. INTERFACES DE MODÈLES DE DONNÉES
// ---------------------------------

/**
 * Interface de base pour les entreprises (fournisseurs et clients).
 */
export interface Company {
  name: string;
  type: 'supplier' | 'client';
  email?: string;
  phone: string;
  ice?: string; // Identifiant Commun de l'Entreprise
  rc?: string; // Registre de Commerce
  if?: string; // Identifiant Fiscal
  creditBalance?: number;
}


/**
 * Interface pour les produits.
 */
export interface Product {
  name: string;
  sku: string;
  buyPrice: number;
  sellPrice: number;
  quantity: number; // Stock actuel
  minStock: number;
}

/**
 * Interface pour les achats (Bons de Commande).
 */
export interface Purchase {
  supplierId: string;
  items: {
    productId: string;
    quantity: number;
    cost: number;
  }[];
  status: 'pending' | 'completed';
  totalAmount: number;
}

/**
 * Interface pour les ventes (Factures).
 */
export interface Sale {
  clientId: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  totalAmount: number;
  paymentMethod: 'cash' | 'bank' | 'credit';
  date: Timestamp;
}

// ---------------------------------
// 2. LOGIQUE MÉTIER ET TRANSACTIONS
// ---------------------------------


/**
 * Crée une nouvelle entreprise (client ou fournisseur) dans la sous-collection d'un magasin.
 * @param firestore - L'instance Firestore.
 * @param userId - L'ID de l'utilisateur (qui correspond à l'ID du magasin).
 * @param companyData - Les données de l'entreprise à créer.
 */
export async function createCompany(
  firestore: Firestore,
  userId: string,
  companyData: Company
): Promise<DocumentReference> {
  if (!userId) {
    throw new Error("L'ID de l'utilisateur est requis pour créer une entreprise.");
  }

  const collectionName = companyData.type === 'client' ? 'clients' : 'suppliers';
  // Note: The path should probably not include 'stores/${userId}' if collections are at the root
  const companyCollectionRef = collection(firestore, `stores/${userId}/${collectionName}`);

  const dataToSave: any = { ...companyData };
  if (companyData.type === 'client') {
    dataToSave.creditBalance = 0;
  }

  return await addDoc(companyCollectionRef, dataToSave);
}


/**
 * Confirme la réception d'un achat et met à jour le stock des produits.
 * @param firestore - L'instance Firestore.
 * @param purchaseId - L'ID de l'achat à confirmer.
 */
export async function confirmReception(
  firestore: Firestore,
  purchaseId: string
): Promise<void> {

  const purchaseRef = doc(firestore, `purchases`, purchaseId);

  try {
    await runTransaction(firestore, async (transaction) => {
      const purchaseDoc = await transaction.get(purchaseRef);

      if (!purchaseDoc.exists()) {
        throw new Error("L'achat n'existe pas.");
      }

      const purchaseData = purchaseDoc.data() as Purchase;

      if (purchaseData.status === 'completed') {
        throw new Error('Cet achat a déjà été marqué comme complété.');
      }

      // Mettre à jour le statut de l'achat
      transaction.update(purchaseRef, { status: 'completed' });

      // Mettre à jour le stock pour chaque article de l'achat
      for (const item of purchaseData.items) {
        const productRef = doc(firestore, `products`, item.productId);
        const productDoc = await transaction.get(productRef);

        if (!productDoc.exists()) {
          // Si un produit n'existe pas, on pourrait décider de le créer ou de lever une erreur
          throw new Error(`Le produit avec l'ID ${item.productId} n'a pas été trouvé.`);
        }

        const currentQuantity = productDoc.data().quantiteStock || 0;
        const newQuantity = currentQuantity + item.quantity;

        transaction.update(productRef, { quantiteStock: newQuantity });
      }
    });
  } catch (error) {
    console.error("Erreur lors de la confirmation de la réception :", error);
    // Renvoyer l'erreur pour la gérer dans l'interface utilisateur
    throw error;
  }
}

/**
 * Crée une nouvelle vente, vérifie le stock et met à jour le solde créditeur du client si nécessaire.
 * @param firestore - L'instance Firestore.
 * @param userId - L'ID de l'utilisateur (qui correspond à l'ID du magasin).
 * @param saleData - Les données de la vente à créer.
 */
export async function createSale(
  firestore: Firestore,
  userId: string,
  saleData: Omit<Sale, 'date'> & { date?: Timestamp }
): Promise<void> {
  if (!userId) {
    throw new Error("L'ID de l'utilisateur est requis.");
  }
  const productsPath = `stores/${userId}/products`;
  const salesPath = `stores/${userId}/sales`;
  const clientRef = doc(firestore, `stores/${userId}/clients`, saleData.clientId);

  try {
    await runTransaction(firestore, async (transaction) => {
      // 1. Vérification du stock
      const productRefs = saleData.items.map(item =>
        doc(firestore, productsPath, item.productId)
      );

      const productDocs = await Promise.all(
        productRefs.map(ref => transaction.get(ref))
      );

      for (let i = 0; i < productDocs.length; i++) {
        const productDoc = productDocs[i];
        const item = saleData.items[i];

        if (!productDoc.exists()) {
          throw new Error(`Le produit avec l'ID ${item.productId} n'existe pas.`);
        }

        const productData = productDoc.data() as Product;
        if (productData.quantity < item.quantity) {
          throw new Error(`Stock insuffisant pour le produit : ${productData.name}. Stock restant : ${productData.quantity}`);
        }
      }

      // 2. Déduction du stock
      productDocs.forEach((productDoc, i) => {
        const item = saleData.items[i];
        const newQuantity = productDoc.data()!.quantity - item.quantity;
        transaction.update(productDoc.ref, { quantity: newQuantity });
      });

      // 3. Création de la vente
      const newSaleRef = doc(collection(firestore, salesPath));
      transaction.set(newSaleRef, {
        ...saleData,
        date: saleData.date || Timestamp.now(), // Utilise la date fournie ou la date actuelle
      });

      // 4. Mise à jour du crédit client
      if (saleData.paymentMethod === 'credit') {
        const clientDoc = await transaction.get(clientRef);
        if (!clientDoc.exists()) {
          throw new Error(`Le client avec l'ID ${saleData.clientId} n'existe pas.`);
        }

        const clientData = clientDoc.data() as Company;
        const newCreditBalance = (clientData.creditBalance || 0) + saleData.totalAmount;

        transaction.update(clientRef, { creditBalance: newCreditBalance });
      }
    });
  } catch (error) {
    console.error("Erreur lors de la création de la vente :", error);
    // Renvoyer l'erreur pour la gérer dans l'interface utilisateur
    throw error;
  }
}
