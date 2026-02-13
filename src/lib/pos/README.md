# نظام التسعير والتخفيضات في نقطة البيع (POS)

## 📋 نظرة عامة

هاد النظام كيوفر لك تحكم كامل في الأسعار والتخفيضات ديال المنتجات في نقطة البيع. كيخليك:

- تحتافظ على الثمن الأصلي ديال المنتوج
- تطبق تخفيضات بالنسبة المئوية
- تبدل الثمن يدويًا مع إمكانية تزيد سبب التغيير
- تحسب المجاميع بدقة

## 🎯 الميزات الرئيسية

### 1. ثلاثة أوضاع للتسعير (Price Modes)

```typescript
type PriceMode = "STANDARD" | "OVERRIDE" | "DISCOUNT";
```

- **STANDARD**: الثمن العادي من الستوك (بدون تخفيض)
- **OVERRIDE**: الثمن متبدل يدويًا
- **DISCOUNT**: فيه تخفيض بالنسبة المئوية

### 2. معلومات كاملة على كل سطر

كل سطر في السلة كيحتافظ على:

- الثمن الأصلي (`originalUnitPrice`)
- الثمن الحالي (`unitPrice`)
- نسبة ومبلغ التخفيض
- سبب تغيير الثمن (إذا كان)

## 📦 الملفات

```
src/lib/pos/
├── pricing.ts           # الدوال الأساسية
├── pricing.examples.ts  # أمثلة الاستعمال
├── pricing.test.ts      # الاختبارات
└── README.md           # هاد الملف
```

## 🚀 الاستعمال السريع

### خلق سطر جديد

```typescript
import { createLineItem } from "@/lib/pos/pricing";

const product = {
  id: "prod_123",
  name: "نظارة Ray-Ban",
  unitPrice: 500,
};

const lineItem = createLineItem(product, 2);
// lineItem.lineTotal === 1000 MAD
```

### تطبيق تخفيض بالنسبة المئوية

```typescript
import { applyPercentDiscount } from "@/lib/pos/pricing";

// تخفيض 15%
const discounted = applyPercentDiscount(lineItem, 15);
// discounted.unitPrice === 425 MAD
// discounted.lineTotal === 850 MAD (للكمية 2)
```

### تغيير الثمن يدويًا

```typescript
import { applyPriceOverride } from "@/lib/pos/pricing";

const custom = applyPriceOverride(lineItem, 400, "عميل VIP");
// custom.unitPrice === 400 MAD
// custom.overrideReason === 'عميل VIP'
// custom.discountPercent === 20% (محسوبة تلقائيًا)
```

### الرجوع للثمن العادي

```typescript
import { setStandardPrice } from "@/lib/pos/pricing";

const standard = setStandardPrice(lineItem);
// standard.unitPrice === originalUnitPrice
// standard.priceMode === 'STANDARD'
```

### تغيير الكمية

```typescript
import { recalculateLineTotal } from "@/lib/pos/pricing";

let item = { ...lineItem, quantity: 5 };
item = recalculateLineTotal(item);
// item.lineTotal محسوب من جديد
```

## 📊 حساب مجموع السلة

```typescript
import { calculateCartTotal } from "@/lib/pos/pricing";

const cart = [lineItem1, lineItem2, lineItem3];
const totals = calculateCartTotal(cart);

console.log(totals.subtotal); // المجموع قبل التخفيض
console.log(totals.totalDiscount); // التخفيض الكلي
console.log(totals.total); // المجموع النهائي
console.log(totals.itemCount); // عدد المنتجات
```

## 🔍 معلومات التخفيض

```typescript
import { getDiscountInfo } from "@/lib/pos/pricing";

const info = getDiscountInfo(lineItem);

if (info.hasDiscount) {
  console.log(info.savings);
  // مثلاً: "تخفيض 15.0% (-150.00 MAD)"
  // أو: "ثمن خاص: -200.00 MAD (عميل VIP)"
}
```

## ⚠️ القواعد والقيود

### 1. تغيير الثمن يدويًا (Override)

- الثمن الجديد خاصو يكون أكبر من 0
- الثمن الجديد ما يمكنش يطلع فوق الثمن الأصلي
- إذا بغيتي تطلع فوق الثمن الأصلي، خاصك تبدل المنتوج في الستوك

### 2. التخفيض بالنسبة المئوية

- النسبة خاصها تكون بين 0 و 100
- 0% = بدون تخفيض
- 100% = مجاني (ثمن = 0)

### 3. الكمية

- خاصها تكون أكبر من 0
- خاصها تكون رقم صحيح

## 🧪 الاختبارات

باش تشغل الاختبارات:

```bash
npm test src/lib/pos/pricing.test.ts
```

الاختبارات كتغطي:

- ✅ كل الدوال الأساسية
- ✅ معالجة الأخطاء
- ✅ الحالات الخاصة (edge cases)
- ✅ التدوير العشري
- ✅ الكميات الكبيرة

## 📝 أمثلة متقدمة

### مثال 1: سلة كاملة مع تخفيضات مختلفة

```typescript
import {
  createLineItem,
  applyPercentDiscount,
  applyPriceOverride,
  calculateCartTotal,
} from "@/lib/pos/pricing";

// خلق السلة
let cart = [
  createLineItem({ id: "1", name: "نظارة شمسية", unitPrice: 300 }, 1),
  createLineItem({ id: "2", name: "عدسات لاصقة", unitPrice: 150 }, 2),
  createLineItem({ id: "3", name: "محلول تنظيف", unitPrice: 50 }, 3),
];

// تطبيق تخفيضات مختلفة
cart[0] = applyPercentDiscount(cart[0], 10); // -10%
cart[1] = applyPriceOverride(cart[1], 120, "عرض خاص"); // ثمن خاص
// cart[2] يبقى بالثمن العادي

const totals = calculateCartTotal(cart);
console.log(`المجموع: ${totals.total} MAD`);
console.log(`وفرتي: ${totals.totalDiscount} MAD`);
```

### مثال 2: تطبيق تخفيض على السلة الكاملة

```typescript
function applyCartDiscount(
  cart: PosLineItem[],
  percent: number,
): PosLineItem[] {
  return cart.map((item) => applyPercentDiscount(item, percent));
}

// تخفيض 20% على كلشي
const discountedCart = applyCartDiscount(cart, 20);
```

### مثال 3: التحقق من الحد الأقصى للتخفيض

```typescript
function canApplyDiscount(
  lineItem: PosLineItem,
  percent: number,
  maxDiscountPercent: number = 50,
): boolean {
  return percent <= maxDiscountPercent;
}

if (canApplyDiscount(lineItem, 60, 50)) {
  // تطبيق التخفيض
} else {
  console.log("التخفيض كبير بزاف!");
}
```

## 🎨 التكامل مع React

### مثال: Hook مخصص للسلة

```typescript
import { useState, useCallback } from "react";
import type { PosLineItem } from "@/lib/pos/pricing";
import {
  createLineItem,
  applyPercentDiscount,
  applyPriceOverride,
  setStandardPrice,
  recalculateLineTotal,
  calculateCartTotal,
} from "@/lib/pos/pricing";

export function useCart() {
  const [items, setItems] = useState<PosLineItem[]>([]);

  const addItem = useCallback((product: any, quantity: number) => {
    const newItem = createLineItem(product, quantity);
    setItems((prev) => [...prev, newItem]);
  }, []);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.lineId === lineId) {
          return recalculateLineTotal({ ...item, quantity });
        }
        return item;
      }),
    );
  }, []);

  const applyDiscount = useCallback((lineId: string, percent: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.lineId === lineId) {
          return applyPercentDiscount(item, percent);
        }
        return item;
      }),
    );
  }, []);

  const overridePrice = useCallback(
    (lineId: string, price: number, reason?: string) => {
      setItems((prev) =>
        prev.map((item) => {
          if (item.lineId === lineId) {
            return applyPriceOverride(item, price, reason);
          }
          return item;
        }),
      );
    },
    [],
  );

  const resetPrice = useCallback((lineId: string) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.lineId === lineId) {
          return setStandardPrice(item);
        }
        return item;
      }),
    );
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((prev) => prev.filter((item) => item.lineId !== lineId));
  }, []);

  const totals = calculateCartTotal(items);

  return {
    items,
    totals,
    addItem,
    updateQuantity,
    applyDiscount,
    overridePrice,
    resetPrice,
    removeItem,
  };
}
```

## 🔒 الأمان

- كل الدوال **pure functions** (ما كيبدلوش state global)
- كل الدوال كترجع objects جداد (immutable)
- معالجة الأخطاء واضحة مع رسائل بالعربية
- Validation على كل input

## 🐛 معالجة الأخطاء

كل الدوال كترمي `Error` واضحة إذا كان input غير صحيح:

```typescript
try {
  applyPercentDiscount(lineItem, 150);
} catch (error) {
  console.error(error.message);
  // "النسبة المئوية خاصها تكون بين 0 و 100"
}
```

## 📈 الأداء

- كل الحسابات O(1) - سريعة بزاف
- `calculateCartTotal` هي O(n) - كتمشي على السلة مرة وحدة
- مافيهاش side effects
- مناسبة للاستعمال في React (مع useMemo/useCallback)

## 🤝 المساهمة

إذا لقيتي bug أو عندك اقتراح:

1. زيد test case في `pricing.test.ts`
2. صلح الكود في `pricing.ts`
3. تأكد أن كل الاختبارات خضراء

## 📄 الترخيص

MIT License - استعمل الكود كيفما بغيتي!
