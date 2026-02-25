# Système de tarification et remises POS

## 📋 Aperçu

Ce système vous offre un contrôle complet sur les prix et les remises des produits au point de vente. Il vous permet de :

- Conserver le prix d'origine du produit
- Appliquer des remises en pourcentage
- Modifier le prix manuellement avec la possibilité d'ajouter un motif
- Calculer les totaux avec précision

## 🎯 Caractéristiques principales

### 1. Trois modes de tarification (Price Modes)

```typescript
type PriceMode = "STANDARD" | "OVERRIDE" | "DISCOUNT";
```

- **STANDARD**: Prix normal du stock (sans remise)
- **OVERRIDE**: Prix modifié manuellement
- **DISCOUNT**: Avec remise en pourcentage

### 2. Informations complètes sur chaque ligne

Chaque ligne du panier conserve :

- Le prix d'origine (`originalUnitPrice`)
- Le prix actuel (`unitPrice`)
- Le pourcentage et le montant de la remise
- Le motif du changement de prix (le cas échéant)

## 📦 Fichiers

```
src/lib/pos/
├── pricing.ts           # Fonctions de base
├── pricing.examples.ts  # Exemples d'utilisation
├── pricing.test.ts      # Tests
└── README.md           # Ce fichier
```

## 🚀 Démarrage rapide

### Créer une nouvelle ligne

```typescript
import { createLineItem } from "@/lib/pos/pricing";

const product = {
  id: "prod_123",
  name: "Lunettes Ray-Ban",
  unitPrice: 500,
};

const lineItem = createLineItem(product, 2);
// lineItem.lineTotal === 1000 MAD
```

### Appliquer une remise en pourcentage

```typescript
import { applyPercentDiscount } from "@/lib/pos/pricing";

// remise 15%
const discounted = applyPercentDiscount(lineItem, 15);
// discounted.unitPrice === 425 MAD
// discounted.lineTotal === 850 MAD (pour la quantité 2)
```

### Modifier le prix manuellement

```typescript
import { applyPriceOverride } from "@/lib/pos/pricing";

const custom = applyPriceOverride(lineItem, 400, "Client VIP");
// custom.unitPrice === 400 MAD
// custom.overrideReason === 'Client VIP'
// custom.discountPercent === 20% (calculé automatiquement)
```

### Retour au prix standard

```typescript
import { setStandardPrice } from "@/lib/pos/pricing";

const standard = setStandardPrice(lineItem);
// standard.unitPrice === originalUnitPrice
// standard.priceMode === 'STANDARD'
```

### Changer la quantité

```typescript
import { recalculateLineTotal } from "@/lib/pos/pricing";

let item = { ...lineItem, quantity: 5 };
item = recalculateLineTotal(item);
// item.lineTotal est recalculé
```

## 📊 Calcul du total du panier

```typescript
import { calculateCartTotal } from "@/lib/pos/pricing";

const cart = [lineItem1, lineItem2, lineItem3];
const totals = calculateCartTotal(cart);

console.log(totals.subtotal); // Total avant remise
console.log(totals.totalDiscount); // Remise totale
console.log(totals.total); // Total final
console.log(totals.itemCount); // Nombre de produits
```

## 🔍 Informations sur la remise

```typescript
import { getDiscountInfo } from "@/lib/pos/pricing";

const info = getDiscountInfo(lineItem);

if (info.hasDiscount) {
  console.log(info.savings);
  // Exemple: "Remise 15.0% (-150.00 MAD)"
  // Ou: "Prix spécial: -200.00 MAD (Client VIP)"
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

// Création du panier
let cart = [
  createLineItem({ id: "1", name: "Lunettes de soleil", unitPrice: 300 }, 1),
  createLineItem({ id: "2", name: "Lentilles de contact", unitPrice: 150 }, 2),
  createLineItem({ id: "3", name: "Solution de nettoyage", unitPrice: 50 }, 3),
];

// Application de différentes remises
cart[0] = applyPercentDiscount(cart[0], 10); // -10%
cart[1] = applyPriceOverride(cart[1], 120, "Offre spéciale"); // prix spécial
// cart[2] reste au prix normal

const totals = calculateCartTotal(cart);
console.log(`Total: ${totals.total} MAD`);
console.log(`Économie: ${totals.totalDiscount} MAD`);
```

### Exemple 2: Application d'une remise sur tout le panier

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

### Exemple 3: Vérification de la remise maximale

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
  console.log("Remise trop élevée !");
}
```

## 🎨 Intégration avec React

### Exemple: Hook personnalisé pour le panier

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
