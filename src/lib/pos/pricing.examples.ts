/**
 * أمثلة استعمال نظام التسعير في POS
 * 
 * هاد الملف فيه أمثلة واضحة كيفاش تستعمل الدوال ديال التسعير
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
// مثال 1: خلق سطر جديد من منتوج
// ========================================

console.log('📦 مثال 1: خلق سطر جديد');
console.log('─'.repeat(50));

const product = {
  id: 'prod_123',
  name: 'نظارة Ray-Ban',
  unitPrice: 500,
};

let lineItem = createLineItem(product, 2);
console.log('السطر الجديد:', lineItem);
console.log('المجموع:', lineItem.lineTotal, 'MAD'); // 1000 MAD
console.log('');

// ========================================
// مثال 2: تطبيق تخفيض بالنسبة المئوية
// ========================================

console.log('💰 مثال 2: تطبيق تخفيض 15%');
console.log('─'.repeat(50));

lineItem = applyPercentDiscount(lineItem, 15);
console.log('الثمن بعد التخفيض:', lineItem.unitPrice, 'MAD'); // 425 MAD
console.log('المجموع الجديد:', lineItem.lineTotal, 'MAD'); // 850 MAD
console.log('التخفيض الكلي:', lineItem.discountAmount! * lineItem.quantity, 'MAD'); // 150 MAD

const discountInfo = getDiscountInfo(lineItem);
console.log('معلومات التخفيض:', discountInfo.savings);
console.log('');

// ========================================
// مثال 3: تغيير الثمن يدويًا
// ========================================

console.log('✏️ مثال 3: تغيير الثمن يدويًا');
console.log('─'.repeat(50));

// نرجعو للثمن العادي أولاً
lineItem = setStandardPrice(lineItem);
console.log('رجعنا للثمن العادي:', lineItem.unitPrice, 'MAD'); // 500 MAD

// دابا نبدلو الثمن يدويًا
lineItem = applyPriceOverride(lineItem, 400, 'عميل VIP - تخفيض خاص');
console.log('الثمن الجديد:', lineItem.unitPrice, 'MAD'); // 400 MAD
console.log('السبب:', lineItem.overrideReason);
console.log('نسبة التخفيض المحسوبة:', lineItem.discountPercent, '%'); // 20%
console.log('');

// ========================================
// مثال 4: تغيير الكمية وإعادة الحساب
// ========================================

console.log('🔢 مثال 4: تغيير الكمية');
console.log('─'.repeat(50));

console.log('الكمية القديمة:', lineItem.quantity); // 2
console.log('المجموع القديم:', lineItem.lineTotal, 'MAD'); // 800 MAD

// نبدلو الكمية
lineItem = { ...lineItem, quantity: 5 };
lineItem = recalculateLineTotal(lineItem);

console.log('الكمية الجديدة:', lineItem.quantity); // 5
console.log('المجموع الجديد:', lineItem.lineTotal, 'MAD'); // 2000 MAD
console.log('');

// ========================================
// مثال 5: حساب مجموع السلة الكاملة
// ========================================

console.log('🛒 مثال 5: حساب مجموع السلة');
console.log('─'.repeat(50));

const cart: PosLineItem[] = [
  createLineItem({ id: '1', name: 'نظارة شمسية', unitPrice: 300 }, 1),
  createLineItem({ id: '2', name: 'عدسات لاصقة', unitPrice: 150 }, 2),
  createLineItem({ id: '3', name: 'محلول تنظيف', unitPrice: 50 }, 3),
];

// نطبقو تخفيض على المنتوج الأول
cart[0] = applyPercentDiscount(cart[0], 10);

// نبدلو الثمن ديال الثاني
cart[1] = applyPriceOverride(cart[1], 120, 'عرض خاص');

const totals = calculateCartTotal(cart);
console.log('عدد المنتجات:', totals.itemCount);
console.log('المجموع قبل التخفيض:', totals.subtotal, 'MAD');
console.log('التخفيض الكلي:', totals.totalDiscount, 'MAD');
console.log('المجموع النهائي:', totals.total, 'MAD');
console.log('');

// ========================================
// مثال 6: معالجة الأخطاء
// ========================================

console.log('⚠️ مثال 6: معالجة الأخطاء');
console.log('─'.repeat(50));

try {
  // محاولة تطبيق نسبة خارج النطاق
  applyPercentDiscount(lineItem, 150);
} catch (error) {
  console.log('خطأ متوقع:', (error as Error).message);
}

try {
  // محاولة وضع ثمن أكبر من الثمن الأصلي
  applyPriceOverride(lineItem, 600);
} catch (error) {
  console.log('خطأ متوقع:', (error as Error).message);
}

try {
  // محاولة وضع ثمن سالب
  applyPriceOverride(lineItem, -100);
} catch (error) {
  console.log('خطأ متوقع:', (error as Error).message);
}

console.log('');
console.log('✅ كلشي خدام مزيان!');
