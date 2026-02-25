export type PriceMode = 'STANDARD' | 'OVERRIDE' | 'DISCOUNT';

export function calculateTTC(ht: number, tvaRate: number): number {
  if (!Number.isFinite(ht) || !Number.isFinite(tvaRate)) {
    throw new Error('Valeurs invalides');
  }
  if (ht < 0) {
    throw new Error('Le prix HT ne peut pas être négatif');
  }
  if (tvaRate < 0) {
    throw new Error('Le taux de TVA ne peut pas être négatif');
  }

  return ht * (1 + tvaRate);
}

export function calculateHT(ttc: number, tvaRate: number): number {
  if (!Number.isFinite(ttc) || !Number.isFinite(tvaRate)) {
    throw new Error('Valeurs invalides');
  }
  if (ttc < 0) {
    throw new Error('Le prix TTC ne peut pas être négatif');
  }
  if (tvaRate < 0) {
    throw new Error('Le taux de TVA ne peut pas être négatif');
  }

  if (tvaRate === 0) return ttc;
  return ttc / (1 + tvaRate);
}

export function calculateTVA(ttc: number, tvaRate: number): number {
  const ht = calculateHT(ttc, tvaRate);
  return ttc - ht;
}

export type DiscountInput =
  | { type: 'PERCENT'; value: number }
  | { type: 'AMOUNT'; value: number };

export function applyDiscount(price: number, discount: DiscountInput): number {
  if (!Number.isFinite(price)) {
    throw new Error('Prix invalide');
  }
  if (price < 0) {
    throw new Error('Le prix ne peut pas être négatif');
  }

  if (discount.type === 'PERCENT') {
    if (!Number.isFinite(discount.value)) throw new Error('Remise invalide');
    if (discount.value < 0 || discount.value > 100) {
      throw new Error('La remise doit être entre 0 et 100%');
    }
    const result = price * (1 - discount.value / 100);
    return result < 0 ? 0 : result;
  }

  if (!Number.isFinite(discount.value)) throw new Error('Remise invalide');
  if (discount.value < 0) {
    throw new Error('La remise ne peut pas être négative');
  }
  const result = price - discount.value;
  return result < 0 ? 0 : result;
}

export function validateLineTotal(item: Pick<PosLineItem, 'unitPrice' | 'quantity' | 'lineTotal'>): boolean {
  if (!Number.isFinite(item.unitPrice) || !Number.isFinite(item.quantity) || !Number.isFinite(item.lineTotal)) {
    return false;
  }
  const expected = item.unitPrice * item.quantity;
  return Math.abs(item.lineTotal - expected) < 0.01;
}

export function calculateMargin(sellingPrice: number, buyingPrice: number): {
  margin: number;
  marginPercent: number;
} {
  if (!Number.isFinite(sellingPrice) || !Number.isFinite(buyingPrice)) {
    throw new Error('Valeurs invalides');
  }
  if (sellingPrice <= 0) {
    return { margin: sellingPrice - buyingPrice, marginPercent: 0 };
  }
  const margin = sellingPrice - buyingPrice;
  const marginPercent = (margin / sellingPrice) * 100;
  return { margin, marginPercent };
}

export interface PrescriptionData {
  od: { sph?: number; cyl?: number; axis?: number; add?: number; pd?: number; hauteur?: number };
  og: { sph?: number; cyl?: number; axis?: number; add?: number; pd?: number; hauteur?: number };
  pd: { binocular?: number };
  doctorName?: string;
  date?: string;
}

export interface LensOrderData {
  supplierId: string;
  supplierName: string;
  orderType: 'unifocal' | 'bifocal' | 'progressive' | 'contact';
  treatments?: string[];
  purchasePrice: number;
  notes?: string;
  expectedDeliveryDays?: number;
  eye: 'les deux' | 'OD' | 'OG';
  index?: string;
}

interface BaseLineItem {
  lineId: string;
  productId: string;
  productReference?: string;
  productName: string;
  quantity: number;

  originalUnitPrice: number;
  unitPrice: number;
  lineTotal: number;

  priceMode: PriceMode;

  discountPercent?: number;
  discountAmount?: number;
  overrideReason?: string;
  
  fromReservation?: number;
}

export interface SimpleLineItem extends BaseLineItem {
  type: 'MONTURE' | 'ACCESSOIRE' | 'AUTRE' | 'SERVICE';
  metadata?: any;
}

export interface ComplexPackItem extends BaseLineItem {
  type: 'VERRE';
  metadata: {
    isComplexPack: true;
    prescription: PrescriptionData;
    lensOrder: LensOrderData;
  };
}

export type PosLineItem = SimpleLineItem | ComplexPackItem;

/** Réinitialise la ligne au prix standard sans remise */
export function setStandardPrice(item: PosLineItem): PosLineItem {
  const unitPrice = item.originalUnitPrice;
  return {
    ...item,
    priceMode: 'STANDARD',
    unitPrice,
    discountPercent: undefined,
    discountAmount: 0,
    overrideReason: undefined,
    lineTotal: unitPrice * item.quantity,
  };
}

/** Applique un nouveau prix unitaire (modification directe) */
export function applyPriceOverride(
  item: PosLineItem,
  newUnitPrice: number,
  reason?: string
): PosLineItem {
  if (newUnitPrice <= 0) throw new Error('Le prix doit être > 0');
  // No longer blocking higher prices - can be used for surcharges or valid overrides
  /*
  if (newUnitPrice > item.originalUnitPrice) {
    throw new Error('Le prix ne peut pas dépasser le prix standard');
  }
  */

  const discountAmount = item.originalUnitPrice - newUnitPrice;
  const discountPercent =
    item.originalUnitPrice > 0
      ? (discountAmount / item.originalUnitPrice) * 100
      : 0;

  return {
    ...item,
    priceMode: 'OVERRIDE',
    unitPrice: newUnitPrice,
    discountAmount,
    discountPercent,
    overrideReason: reason,
    lineTotal: newUnitPrice * item.quantity,
  };
}

/** Applique une remise en % sur le prix original */
export function applyPercentDiscount(
  item: PosLineItem,
  percent: number
): PosLineItem {
  if (percent < 0 || percent > 100) {
    throw new Error('La remise doit être entre 0 et 100%');
  }

  const unitPrice =
    item.originalUnitPrice * (1 - percent / 100);

  const discountAmount = item.originalUnitPrice - unitPrice;

  return {
    ...item,
    priceMode: 'DISCOUNT',
    discountPercent: percent,
    discountAmount,
    unitPrice,
    lineTotal: unitPrice * item.quantity,
    overrideReason: undefined,
  };
}

/** Recalcule le total de la ligne après changement de quantité */
export function recalculateLineTotal(item: PosLineItem): PosLineItem {
  return {
    ...item,
    lineTotal: item.unitPrice * item.quantity,
  };
}

export function createLineItem(
  productId: string,
  productName: string,
  originalUnitPrice: number,
  quantity: number = 1,
  type: 'MONTURE' | 'VERRE' | 'ACCESSOIRE' | 'AUTRE' | 'SERVICE' = 'AUTRE',
  metadata?: any,
  productReference?: string
): PosLineItem {
  // Use a fallback for environments without crypto.randomUUID (unlikely in modern Next.js/Browser)
  const lineId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(7);

  const base = {
    lineId,
    productId,
    productReference,
    productName,
    quantity,
    originalUnitPrice,
    unitPrice: originalUnitPrice,
    lineTotal: originalUnitPrice * quantity,
    priceMode: 'STANDARD' as PriceMode,
  };

  if (type === 'VERRE') {
    return {
      ...base,
      type,
      metadata: metadata || { 
        isComplexPack: true, 
        prescription: { od: {}, og: {}, pd: {} },
        lensOrder: { supplierId: '', supplierName: '', orderType: 'unifocal', purchasePrice: 0, eye: 'les deux' }
      }
    } as ComplexPackItem;
  }

  return {
    ...base,
    type: type as any,
    metadata,
  } as SimpleLineItem;
}

/**
 * Calculates the total of the cart
 */
export function calculateCartTotal(cart: PosLineItem[]): number {
  return cart.reduce((total, item) => total + item.lineTotal, 0);
}
