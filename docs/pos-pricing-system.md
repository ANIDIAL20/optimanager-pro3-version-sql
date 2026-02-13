# نظام التسعير والتخفيضات في POS (Point of Sale)

تم تطوير نظام تسعير جديد وقوي يعتمد على "المنطق النقي" (Pure Logic) وإدارة الحالة المركزية (Centralized State) لضمان دقة العمليات الحسابية وسهولة التوسع.

## 🏗️ التصميم المعماري (Architecture)

يتكون النظام من 4 طبقات أساسية:

### 1. طبقة المنطق النقي (`src/features/pos/utils/pricing.ts`)

هذا هو قلب النظام، يحتوي على دوال رياضية بحتة لا تعتمد على React أو أي مكتبة خارجية:

- **`createLineItem`**: إنشاء سطر منتج جديد مع الحسابات الأولية.
- **`setStandardPrice`**: إعادة المنتج لسعره الأصلي.
- **`applyPriceOverride`**: تحديد سعر يدوي (Manual Price).
- **`applyPercentDiscount`**: تطبيق تخفيض بنسبة مئوية.
- **`recalculateLineTotal`**: إعادة حساب المجموع بعد أي تغيير في الكمية أو السعر.

### 2. طبقة إدارة الحالة (`src/features/pos/store/use-pos-cart-store.ts`)

استخدام مكتبة **Zustand** لإدارة السلة بشكل مركزي:

- توفير الوصول الفوري للسلة من أي مكان في الواجهة.
- معالجة التحديثات عبر دالة `updateLinePricing`.
- الحساب التلقائي للمجموع الكلي (`totalAmount`).

### 3. مكونات الواجهة (UI Components)

- **`DiscountDialog`**: نافذة منبثقة احترافية تسمح باختيار نوع التخفيض (نسبة أو سعر مخصص) مع معاينة مباشرة للتأثير على المجموع.
- **`Cart`**: عرض العناصر مع توضيح الأسعار الأصلية والخصومات المطبقة.

### 4. المكون الرئيسي (`client-pos.tsx`)

ربط جميع الطبقات معاً والتفاعل مع الـ Server Actions لإتمام عملية البيع.

---

## 🛠️ الملفات التي تم إنشاؤها/تعديلها

| الملف                                                           | الوصف                                       |
| --------------------------------------------------------------- | ------------------------------------------- |
| `src/features/pos/utils/pricing.ts`                             | **(جديد)** القواعد الحسابية للتسعير         |
| `src/features/pos/store/use-pos-cart-store.ts`                  | **(جديد)** مخزن الحالة (Zustand)            |
| `src/components/clients/discount-dialog.tsx`                    | **(جديد)** واجهة نافذة التخفيضات            |
| `src/app/dashboard/clients/[id]/_components/pos/client-pos.tsx` | **(محدث)** ربط الواجهة بالمنطق الجديد       |
| `src/app/dashboard/clients/[id]/_components/pos/cart.tsx`       | **(محدث)** عرض التخفيضات والأيقونات الجديدة |

---

## ✨ المميزات المضافة

- ✅ **تخفيض يدوي**: إمكانية تغيير السعر ليصبح كما تريد.
- ✅ **تخفيض بالنسبة**: إضافة نسب مئوية (5%، 10%، إلخ).
- ✅ **معاينة حية**: رؤية المبلغ الذي سيوفره العميل قبل التأكيد.
- ✅ **تتبع الأسباب**: إمكانية كتابة سبب التخفيض اليدوي.
- ✅ **دقة حسابية**: معالجة مشاكل الكسور العشرية في JavaScript لضمان صحة الفاتورة.

---

## 🚀 كيفية الاستخدام المبرمج

إذا أردت استخدام المنطق في مكان آخر:

```typescript
import { usePosCartStore } from "@/features/pos/store/use-pos-cart-store";

const updatePricing = usePosCartStore((s) => s.updateLinePricing);

// مثال: تطبيق تخفيض 10%
updatePricing(lineId, "DISCOUNT", { percent: 10 });

// مثال: سعر يدوي
updatePricing(lineId, "OVERRIDE", { newPrice: 200, reason: "Special Offer" });
```
