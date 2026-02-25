/**
 * Exemples d'utilisation du système de tarification POS
 * 
 * Ce fichier contient des exemples clairs sur l'utilisation des fonctions de tarification.
 */

import {
  type PosLineItem,
  type PriceMode,
  setStandardPrice,
  applyPriceOverride,
  applyPercentDiscount,
  recalculateLineTotal,
  getDiscountInfo,
  calculateCartTotal,
  createLineItem,
} from './pricing';

// ========================================
// Exemple 1: Création d'une nouvelle ligne à partir d'un produit
// ========================================

console.log('📦 Exemple 1: Création d\'une nouvelle ligne');
console.log('─'.repeat(50));

const product = {
  id: 'prod_123',
  name: 'Lunettes Ray-Ban',
  unitPrice: 500,
};

let lineItem = createLineItem(product, 2);
console.log('Nouvelle ligne:', lineItem);
console.log('Total:', lineItem.lineTotal, 'MAD'); // 1000 MAD
console.log('');

// ========================================
// Exemple 2: Application d'une remise en pourcentage
// ========================================

console.log('💰 Exemple 2: Application d\'une remise de 15%');
console.log('─'.repeat(50));

lineItem = applyPercentDiscount(lineItem, 15);
console.log('Prix après remise:', lineItem.unitPrice, 'MAD'); // 425 MAD
console.log('Nouveau total:', lineItem.lineTotal, 'MAD'); // 850 MAD
console.log('Remise totale:', lineItem.discountAmount! * lineItem.quantity, 'MAD'); // 150 MAD

const discountInfo = getDiscountInfo(lineItem);
console.log('Informations de remise:', discountInfo.savings);
console.log('');

// ========================================
// Exemple 3: Modification manuelle du prix
// ========================================

console.log('✏️ Exemple 3: Modification manuelle du prix');
console.log('─'.repeat(50));

// Retour au prix standard d'abord
lineItem = setStandardPrice(lineItem);
console.log('Retour au prix standard:', lineItem.unitPrice, 'MAD'); // 500 MAD

// Modification manuelle du prix
lineItem = applyPriceOverride(lineItem, 400, 'Client VIP - remise spéciale');
console.log('Nouveau prix:', lineItem.unitPrice, 'MAD'); // 400 MAD
console.log('Motif:', lineItem.overrideReason);
console.log('Pourcentage de remise calculé:', lineItem.discountPercent, '%'); // 20%
console.log('');

// ========================================
// Exemple 4: Changement de quantité et recalcul
// ========================================

console.log('🔢 Exemple 4: Changement de quantité');
console.log('─'.repeat(50));

console.log('Ancienne quantité:', lineItem.quantity); // 2
console.log('Ancien total:', lineItem.lineTotal, 'MAD'); // 800 MAD

// Changement de quantité
lineItem = { ...lineItem, quantity: 5 };
lineItem = recalculateLineTotal(lineItem);

console.log('Nouvelle quantité:', lineItem.quantity); // 5
console.log('Nouveau total:', lineItem.lineTotal, 'MAD'); // 2000 MAD
console.log('');

// ========================================
// Exemple 5: Calcul du total du panier complet
// ========================================

console.log('🛒 Exemple 5: Calcul du total du panier');
console.log('─'.repeat(50));

const cart: PosLineItem[] = [
  createLineItem({ id: '1', name: 'Lunettes de soleil', unitPrice: 300 }, 1),
  createLineItem({ id: '2', name: 'Lentilles de contact', unitPrice: 150 }, 2),
  createLineItem({ id: '3', name: 'Solution de nettoyage', unitPrice: 50 }, 3),
];

// Application d'une remise sur le premier produit
cart[0] = applyPercentDiscount(cart[0], 10);

// Modification du prix du deuxième produit
cart[1] = applyPriceOverride(cart[1], 120, 'Offre spéciale');

const totals = calculateCartTotal(cart);
console.log('Nombre de produits:', totals.itemCount);
console.log('Total avant remise:', totals.subtotal, 'MAD');
console.log('Remise totale:', totals.totalDiscount, 'MAD');
console.log('Total final:', totals.total, 'MAD');
console.log('');

// ========================================
// Exemple 6: Gestion des erreurs
// ========================================

console.log('⚠️ Exemple 6: Gestion des erreurs');
console.log('─'.repeat(50));

try {
  // Tentative d'appliquer un pourcentage hors plage
  applyPercentDiscount(lineItem, 150);
} catch (error) {
  console.log('Erreur attendue:', (error as Error).message);
}

try {
  // Tentative de mettre un prix supérieur au prix d'origine
  applyPriceOverride(lineItem, 600);
} catch (error) {
  console.log('Erreur attendue:', (error as Error).message);
}

try {
  // Tentative de mettre un prix négatif
  applyPriceOverride(lineItem, -100);
} catch (error) {
  console.log('Erreur attendue:', (error as Error).message);
}

console.log('');
console.log('✅ Tout fonctionne correctement !');
