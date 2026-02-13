/**
 * نظام التسعير والتخفيضات في نقطة البيع (POS)
 * 
 * هاد الملف فيه كلشي لي كيخص التحكم في الأسعار والتخفيضات
 * ديال المنتجات في السلة (Cart)
 */

// ========================================
// TYPES & INTERFACES
// ========================================

/**
 * وضع التسعير - كيحدد كيفاش تحسب الثمن
 * 
 * - STANDARD: الثمن العادي من الستوك (بدون تخفيض)
 * - OVERRIDE: الثمن متبدل يدويًا
 * - DISCOUNT: فيه تخفيض بالنسبة المئوية
 */
export type PriceMode = 'STANDARD' | 'OVERRIDE' | 'DISCOUNT';

/**
 * سطر في سلة نقطة البيع
 * 
 * كل سطر كيمثل منتوج واحد مع الكمية والثمن ديالو
 */
export interface PosLineItem {
  /** معرف فريد للسطر */
  lineId: string;
  
  /** معرف المنتوج من قاعدة البيانات */
  productId: string;
  
  /** اسم المنتوج */
  productName: string;
  
  /** الكمية */
  quantity: number;

  // ========== الأسعار ==========
  
  /** الثمن الأصلي من الستوك (ما كيتبدلش) */
  originalUnitPrice: number;
  
  /** الثمن الحالي للوحدة (بعد التخفيض أو التغيير) */
  unitPrice: number;
  
  /** المجموع الكلي للسطر (unitPrice × quantity) */
  lineTotal: number;

  // ========== وضع التسعير ==========
  
  /** كيفاش تحسب الثمن: عادي، متبدل، أو فيه تخفيض */
  priceMode: PriceMode;

  // ========== معلومات التخفيض ==========
  
  /** نسبة التخفيض المئوية (مثلاً 10 = تخفيض 10%) */
  discountPercent?: number;
  
  /** المبلغ لي تحيد من كل وحدة */
  discountAmount?: number;
  
  /** سبب تغيير الثمن (اختياري) */
  overrideReason?: string;
}

// ========================================
// VALIDATION HELPERS
// ========================================

/**
 * كيتأكد أن الثمن صحيح (أكبر من 0)
 */
function validatePrice(price: number, fieldName: string = 'Price'): void {
  if (price <= 0) {
    throw new Error(`${fieldName} خاصو يكون أكبر من 0`);
  }
  if (!isFinite(price)) {
    throw new Error(`${fieldName} خاصو يكون رقم صحيح`);
  }
}

/**
 * كيتأكد أن النسبة المئوية صحيحة (بين 0 و 100)
 */
function validatePercent(percent: number): void {
  if (percent < 0 || percent > 100) {
    throw new Error('النسبة المئوية خاصها تكون بين 0 و 100');
  }
  if (!isFinite(percent)) {
    throw new Error('النسبة المئوية خاصها تكون رقم صحيح');
  }
}

/**
 * كيتأكد أن الكمية صحيحة (أكبر من 0)
 */
function validateQuantity(quantity: number): void {
  if (quantity <= 0) {
    throw new Error('الكمية خاصها تكون أكبر من 0');
  }
  if (!isFinite(quantity)) {
    throw new Error('الكمية خاصها تكون رقم صحيح');
  }
}

/**
 * كيدور الرقم لـ 2 أرقام عشرية (للفلوس)
 */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

// ========================================
// CORE PRICING FUNCTIONS
// ========================================

/**
 * كيرجع السطر للثمن العادي (بدون تخفيض أو تغيير)
 * 
 * @param lineItem - السطر لي بغيتي ترجعو للثمن العادي
 * @returns سطر جديد بالثمن العادي
 * 
 * @example
 * ```ts
 * const item = { ...lineItem, priceMode: 'DISCOUNT', unitPrice: 90 };
 * const standardItem = setStandardPrice(item);
 * // standardItem.priceMode === 'STANDARD'
 * // standardItem.unitPrice === originalUnitPrice
 * ```
 */
export function setStandardPrice(lineItem: PosLineItem): PosLineItem {
  validateQuantity(lineItem.quantity);
  validatePrice(lineItem.originalUnitPrice, 'الثمن الأصلي');

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
 * كيبدل الثمن يدويًا (Price Override)
 * 
 * هاد الدالة كتخليك تحط ثمن جديد بيدك، مع إمكانية تزيد سبب التغيير
 * 
 * @param lineItem - السطر لي بغيتي تبدل الثمن ديالو
 * @param newUnitPrice - الثمن الجديد للوحدة
 * @param reason - سبب التغيير (اختياري)
 * @returns سطر جديد بالثمن المتبدل
 * 
 * @throws Error إذا كان الثمن الجديد أكبر من الثمن الأصلي أو أصغر من 0
 * 
 * @example
 * ```ts
 * const item = { ...lineItem, originalUnitPrice: 100 };
 * const discounted = applyPriceOverride(item, 80, 'عميل VIP');
 * // discounted.unitPrice === 80
 * // discounted.discountPercent === 20
 * // discounted.overrideReason === 'عميل VIP'
 * ```
 */
export function applyPriceOverride(
  lineItem: PosLineItem,
  newUnitPrice: number,
  reason?: string
): PosLineItem {
  validateQuantity(lineItem.quantity);
  validatePrice(lineItem.originalUnitPrice, 'الثمن الأصلي');
  validatePrice(newUnitPrice, 'الثمن الجديد');

  // كنتأكدو أن الثمن الجديد ما طلعش فوق الثمن الأصلي
  if (newUnitPrice > lineItem.originalUnitPrice) {
    throw new Error(
      `الثمن الجديد (${newUnitPrice}) ما يمكنش يكون أكبر من الثمن الأصلي (${lineItem.originalUnitPrice})`
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
 * كيطبق تخفيض بالنسبة المئوية
 * 
 * مثلاً: إذا حطيتي 10، غادي يطبق تخفيض 10% على الثمن الأصلي
 * 
 * @param lineItem - السطر لي بغيتي تطبق عليه التخفيض
 * @param percent - النسبة المئوية للتخفيض (بين 0 و 100)
 * @returns سطر جديد بالتخفيض المطبق
 * 
 * @throws Error إذا كانت النسبة خارج النطاق 0-100
 * 
 * @example
 * ```ts
 * const item = { ...lineItem, originalUnitPrice: 100 };
 * const discounted = applyPercentDiscount(item, 15);
 * // discounted.unitPrice === 85
 * // discounted.discountPercent === 15
 * // discounted.discountAmount === 15
 * ```
 */
export function applyPercentDiscount(
  lineItem: PosLineItem,
  percent: number
): PosLineItem {
  validateQuantity(lineItem.quantity);
  validatePrice(lineItem.originalUnitPrice, 'الثمن الأصلي');
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
 * كيعاود يحسب المجموع الكلي للسطر
 * 
 * هاد الدالة كتستعمل ملي كتبدل الكمية (quantity) بدون ما تبدل الثمن
 * 
 * @param lineItem - السطر لي بغيتي تعاود تحسب المجموع ديالو
 * @returns سطر جديد بالمجموع المحسوب
 * 
 * @example
 * ```ts
 * const item = { ...lineItem, quantity: 2, unitPrice: 50 };
 * const updated = recalculateLineTotal(item);
 * // updated.lineTotal === 100
 * ```
 */
export function recalculateLineTotal(lineItem: PosLineItem): PosLineItem {
  validateQuantity(lineItem.quantity);
  validatePrice(lineItem.unitPrice, 'الثمن الحالي');

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
 * كيرجع معلومات التخفيض بشكل واضح
 * 
 * @param lineItem - السطر
 * @returns معلومات التخفيض في format واضح
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
      savings = `تخفيض ${discountPercent.toFixed(1)}% (-${totalDiscount.toFixed(2)} MAD)`;
    } else if (lineItem.priceMode === 'OVERRIDE') {
      savings = `ثمن خاص: -${totalDiscount.toFixed(2)} MAD`;
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
 * كيحسب المجموع الكلي ديال السلة (كل الأسطر)
 * 
 * @param lineItems - كل الأسطر في السلة
 * @returns المجموع الكلي
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
 * كيخلق سطر جديد من منتوج
 * 
 * @param product - معلومات المنتوج من الستوك
 * @param quantity - الكمية المطلوبة
 * @returns سطر جديد بالثمن العادي
 */
export function createLineItem(
  product: {
    id: string;
    name: string;
    unitPrice: number;
  },
  quantity: number = 1
): PosLineItem {
  validatePrice(product.unitPrice, 'ثمن المنتوج');
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
