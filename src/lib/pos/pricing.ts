/**
 * Système de tarification et remises POS
 * 
 * Ce fichier contient toutes les fonctions de contrôle des prix et des remises
 * pour les produits dans le panier (Cart).
 */

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * Mode de tarification - détermine comment le prix est calculé
 * 
 * - STANDARD: Prix normal du stock (sans remise)
 * - OVERRIDE: Prix modifié manuellement
 * - DISCOUNT: Avec remise en pourcentage
 */
export type PriceMode = 'STANDARD' | 'OVERRIDE' | 'DISCOUNT';

/**
 * Ligne dans le panier POS
 * 
 * Chaque ligne représente un produit unique avec sa quantité et son prix
 */
export interface PosLineItem {
  /** Identifiant unique de la ligne */
  lineId: string;
  
  /** Identifiant du produit en base de données */
  productId: string;
  
  /** Nom du produit */
  productName: string;
  
  /** Quantité */
  quantity: number;

  // ========== Prix ==========
  
  /** Prix unitaire d'origine du stock (immuable) */
  originalUnitPrice: number;
  
  /** Prix unitaire actuel (après remise ou modification) */
  unitPrice: number;
  
  /** Total de la ligne (unitPrice × quantity) */
  lineTotal: number;

  // ========== Mode de tarification ==========
  
  /** Comment le prix est calculé : standard, modifié ou remisé */
  priceMode: PriceMode;

  // ========== Informations de remise ==========
  
  /** Pourcentage de remise (ex: 10 = remise de 10%) */
  discountPercent?: number;
  
  /** Montant déduit par unité */
  discountAmount?: number;
  
  /** Motif du changement de prix (optionnel) */
  overrideReason?: string;
}

// ========================================
// VALIDATION HELPERS
// ========================================

/**
 * Vérifie que le prix est valide (supérieur à 0)
 */
function validatePrice(price: number, fieldName: string = 'Le prix'): void {
  if (price <= 0) {
    throw new Error(`${fieldName} doit être supérieur à 0`);
  }
  if (!isFinite(price)) {
    throw new Error(`${fieldName} doit être un nombre valide`);
  }
}

/**
 * Vérifie que le pourcentage est valide (entre 0 et 100)
 */
function validatePercent(percent: number): void {
  if (percent < 0 || percent > 100) {
    throw new Error('Le pourcentage doit être compris entre 0 et 100');
  }
  if (!isFinite(percent)) {
    throw new Error('Le pourcentage doit être un nombre valide');
  }
}

/**
 * Vérifie que la quantité est valide (supérieure à 0)
 */
function validateQuantity(quantity: number): void {
  if (quantity <= 0) {
    throw new Error('La quantité doit être supérieure à 0');
  }
  if (!isFinite(quantity)) {
    throw new Error('La quantité doit être un nombre entier');
  }
}

/**
 * Arrondit le nombre à 2 décimales (pour la monnaie)
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

// ========================================
// CORE PRICING FUNCTIONS
// ========================================

/**
 * Réinitialise la ligne au prix standard (sans remise ou modification)
 * 
 * @param lineItem - La ligne à réinitialiser
 * @returns Nouvelle ligne au prix standard
 */
export function setStandardPrice(lineItem: PosLineItem): PosLineItem {
  validateQuantity(lineItem.quantity);
  validatePrice(lineItem.originalUnitPrice, 'Le prix original');

  const unitPrice = lineItem.originalUnitPrice;
  const lineTotal = roundToTwoDecimals(unitPrice * lineItem.quantity);

  return {
    ...lineItem,
    priceMode: 'STANDARD',
    unitPrice,
    lineTotal,
    discountPercent: undefined,
    discountAmount: 0,
    overrideReason: undefined,
  };
}

/**
 * Modifie le prix manuellement (Price Override)
 * 
 * Cette fonction permet de définir un nouveau prix manuellement, avec un motif optionnel.
 * 
 * @param lineItem - La ligne à modifier
 * @param newUnitPrice - Le nouveau prix unitaire
 * @param reason - Le motif du changement (optionnel)
 * @returns Nouvelle ligne avec le prix modifié
 * 
 * @throws Error si le nouveau prix est supérieur au prix original ou inférieur à 0
 */
export function applyPriceOverride(
  lineItem: PosLineItem,
  newUnitPrice: number,
  reason?: string
): PosLineItem {
  validateQuantity(lineItem.quantity);
  validatePrice(lineItem.originalUnitPrice, 'Le prix original');
  validatePrice(newUnitPrice, 'Le nouveau prix');

  // Vérification que le nouveau prix ne dépasse pas le prix original
  if (newUnitPrice > lineItem.originalUnitPrice) {
    throw new Error(
      `Le nouveau prix (${newUnitPrice}) ne peut pas être supérieur au prix original (${lineItem.originalUnitPrice})`
    );
  }

  const discountAmount = roundToTwoDecimals(lineItem.originalUnitPrice - newUnitPrice);
  const discountPercent = roundToTwoDecimals(
    (discountAmount / lineItem.originalUnitPrice) * 100
  );
  const lineTotal = roundToTwoDecimals(newUnitPrice * lineItem.quantity);

  return {
    ...lineItem,
    priceMode: 'OVERRIDE',
    unitPrice: newUnitPrice,
    lineTotal,
    discountAmount,
    discountPercent,
    overrideReason: reason,
  };
}

/**
 * Applique une remise en pourcentage
 * 
 * Exemple : si vous mettez 10, une remise de 10% sera appliquée sur le prix original.
 * 
 * @param lineItem - La ligne à remiser
 * @param percent - Le pourcentage de remise (entre 0 et 100)
 * @returns Nouvelle ligne avec la remise appliquée
 * 
 * @throws Error si le pourcentage est hors de la plage 0-100
 */
export function applyPercentDiscount(
  lineItem: PosLineItem,
  percent: number
): PosLineItem {
  validateQuantity(lineItem.quantity);
  validatePrice(lineItem.originalUnitPrice, 'Le prix original');
  validatePercent(percent);

  const discountPercent = percent;
  const unitPrice = roundToTwoDecimals(
    lineItem.originalUnitPrice * (1 - percent / 100)
  );
  const discountAmount = roundToTwoDecimals(lineItem.originalUnitPrice - unitPrice);
  const lineTotal = roundToTwoDecimals(unitPrice * lineItem.quantity);

  return {
    ...lineItem,
    priceMode: 'DISCOUNT',
    unitPrice,
    lineTotal,
    discountPercent,
    discountAmount,
    overrideReason: undefined,
  };
}

/**
 * Recalcule le total de la ligne
 * 
 * Utilisé après un changement de quantité sans modification de prix.
 * 
 * @param lineItem - La ligne à recalculer
 * @returns Nouvelle ligne avec le total mis à jour
 */
export function recalculateLineTotal(lineItem: PosLineItem): PosLineItem {
  validateQuantity(lineItem.quantity);
  validatePrice(lineItem.unitPrice, 'Le prix actuel');

  const lineTotal = roundToTwoDecimals(lineItem.unitPrice * lineItem.quantity);

  return {
    ...lineItem,
    lineTotal,
  };
}

// ========================================
// UTILITY FUNCTIONS
// ========================================

/**
 * Retourne les informations de remise de manière lisible
 * 
 * @param lineItem - La ligne de panier
 * @returns Informations de remise formatées
 */
export function getDiscountInfo(lineItem: PosLineItem): {
  hasDiscount: boolean;
  discountPercent: number;
  discountAmount: number;
  totalDiscount: number;
  savings: string;
} {
  const hasDiscount = lineItem.priceMode !== 'STANDARD';
  const discountPercent = lineItem.discountPercent || 0;
  const discountAmount = lineItem.discountAmount || 0;
  const totalDiscount = roundToTwoDecimals(discountAmount * lineItem.quantity);
  
  let savings = '';
  if (hasDiscount) {
    if (lineItem.priceMode === 'DISCOUNT') {
      savings = `Remise ${discountPercent.toFixed(1)}% (-${totalDiscount.toFixed(2)} MAD)`;
    } else if (lineItem.priceMode === 'OVERRIDE') {
      savings = `Prix spécial: -${totalDiscount.toFixed(2)} MAD`;
      if (lineItem.overrideReason) {
        savings += ` (${lineItem.overrideReason})`;
      }
    }
  }

  return {
    hasDiscount,
    discountPercent,
    discountAmount,
    totalDiscount,
    savings,
  };
}

/**
 * Calcule le total du panier (toutes les lignes)
 * 
 * @param lineItems - Toutes les lignes du panier
 * @returns Le total calculé
 */
export function calculateCartTotal(lineItems: PosLineItem[]): {
  subtotal: number;
  totalDiscount: number;
  total: number;
  itemCount: number;
} {
  const subtotal = lineItems.reduce(
    (sum, item) => sum + (item.originalUnitPrice * item.quantity),
    0
  );
  
  const total = lineItems.reduce(
    (sum, item) => sum + item.lineTotal,
    0
  );
  
  const totalDiscount = subtotal - total;
  
  const itemCount = lineItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return {
    subtotal: roundToTwoDecimals(subtotal),
    totalDiscount: roundToTwoDecimals(totalDiscount),
    total: roundToTwoDecimals(total),
    itemCount,
  };
}

/**
 * Crée une nouvelle ligne à partir d'un produit
 * 
 * @param product - Informations sur le produit du stock
 * @param quantity - La quantité demandée
 * @returns Nouvelle ligne au prix standard
 */
export function createLineItem(
  product: {
    id: string;
    name: string;
    unitPrice: number;
  },
  quantity: number = 1
): PosLineItem {
  validatePrice(product.unitPrice, 'Le prix du produit');
  validateQuantity(quantity);

  const lineId = crypto.randomUUID();
  const unitPrice = product.unitPrice;
  const lineTotal = roundToTwoDecimals(unitPrice * quantity);

  return {
    lineId,
    productId: product.id,
    productName: product.name,
    quantity,
    originalUnitPrice: unitPrice,
    unitPrice,
    lineTotal,
    priceMode: 'STANDARD',
    discountAmount: 0,
  };
}
