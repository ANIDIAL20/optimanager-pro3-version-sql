export type PriceMode = 'STANDARD' | 'OVERRIDE' | 'DISCOUNT';

export interface PosLineItem {
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
  
  // Metadata for frame reservations
  type?: 'MONTURE' | 'VERRE' | 'ACCESSOIRE' | 'AUTRE';
  fromReservation?: number;
  metadata?: any;
  lensDetails?: {
    eye: 'OD' | 'OG';
    sphere?: string;
    cylinder?: string;
    axis?: string;
    addition?: string;
    treatment?: string;
  }[];
}

/** يعيد السطر إلى الثمن العادي بدون أي تخفيض */
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

/** يطبق ثمن جديد للزبون (نقصت له الثمن مباشرة) */
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

/** يطبق Remise % على الثمن الأصلي */
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

/** يعيد حساب المجموع بعد تغيير الكمية */
export function recalculateLineTotal(item: PosLineItem): PosLineItem {
  return {
    ...item,
    lineTotal: item.unitPrice * item.quantity,
  };
}

/** ينشئ عنصر سلة جديد */
export function createLineItem(
  productId: string,
  productName: string,
  originalUnitPrice: number,
  quantity: number = 1,
  type?: 'MONTURE' | 'VERRE' | 'ACCESSOIRE' | 'AUTRE',
  metadata?: any,
  productReference?: string
): PosLineItem {
  return {
    lineId: Math.random().toString(36).substring(7),
    productId,
    productReference,
    productName,
    quantity,
    originalUnitPrice,
    unitPrice: originalUnitPrice,
    lineTotal: originalUnitPrice * quantity,
    priceMode: 'STANDARD',
    type,
    metadata,
  };
}

/**
 * Calculates the total of the cart
 */
export function calculateCartTotal(cart: PosLineItem[]): number {
  return cart.reduce((total, item) => total + item.lineTotal, 0);
}
