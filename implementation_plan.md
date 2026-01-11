# Advanced Supplier Order Form - Implementation Plan

## Overview
Refactor the simple supplier order form into a master-detail pattern with dynamic item rows using `react-hook-form` + `useFieldArray`.

## User Review Required

> [!IMPORTANT]
> **Default Decisions Made** (pending your approval):
> - **Free-text inputs**: Item details (Marque, Référence, etc.) will be free-text fields, NOT linked to existing products
> - **No auto-inventory**: Creating an order will NOT automatically add products to stock
> - **Stock update on reception**: When marking order as "Received", you'll manually update stock
> - **Layout**: Large Dialog (not Sheet) with scrollable content

> [!WARNING]
> **Breaking Change**: The `createSupplierOrder` server action will change signature to accept `items: OrderItem[]` instead of simple `totalAmount`.

## Proposed Changes

### Schema Design

#### [MODIFY] [create-order-button.tsx](file:///c:/Users/ousay/optimanager-pro3/src/components/suppliers/orders/create-order-button.tsx)

**New Zod Schema:**
```typescript
const orderItemSchema = z.object({
  type: z.enum(['monture', 'verre', 'lentille', 'divers']),
  
  // Type-specific fields (conditional)
  marque: z.string().optional(),      // For montures
  reference: z.string().optional(),   // For montures
  couleur: z.string().optional(),     // For montures
  description: z.string().optional(), // For verres
  sphCyl: z.string().optional(),      // For verres
  typeLentille: z.string().optional(),// For lentilles
  rayon: z.string().optional(),       // For lentilles
  nomProduit: z.string().optional(),  // For divers
  
  // Common fields
  quantity: z.coerce.number().min(1),
  unitPrice: z.coerce.number().min(0),
});

const formSchema = z.object({
  supplierId: z.string().min(1),
  date: z.date(),
  invoiceRef: z.string().optional(),
  items: z.array(orderItemSchema).min(1, "Au moins un article requis"),
  discount: z.coerce.number().min(0).optional(),
  amountPaid: z.coerce.number().min(0).optional(),
});
```

---

### Form Component Structure

**New Component**: Keep existing button, replace Dialog content

**Sections:**
1. **Header Fields** (Grid layout)
   - Supplier Select (full width)
   - Date + Invoice Ref (2 columns)

2. **Items Table** (`useFieldArray`)
   - Type dropdown per row
   - Conditional fields based on type selection
   - Quantity + Unit Price inputs
   - Calculated Line Total (display only)
   - Delete button per row
   - "+ Ajouter" button at bottom

3. **Footer Summary**
   - Subtotal (auto-calc)
   - Discount field (optional %)
   - Total (auto-calc)
   - Amount Paid (input)
   - Remaining (auto-calc, display only)

**Auto-calculations (using `watch`):**
```typescript
const items = watch('items');
const subtotal = items?.reduce((sum, item) => 
  sum + (item.quantity * item.unitPrice), 0) || 0;

const discount = watch('discount') || 0;
const total = subtotal - discount;

const paid = watch('amountPaid') || 0;
const remaining = total - paid;
```

---

### Server Action Update

#### [MODIFY] [supplier-orders-actions.ts](file:///c:/Users/ousay/optimanager-pro3/src/app/actions/supplier-orders-actions.ts)

**New Interface:**
```typescript
export interface SupplierOrderItem {
  type: 'monture' | 'verre' | 'lentille' | 'divers';
  marque?: string;
  reference?: string;
  couleur?: string;
  description?: string;
  sphCyl?: string;
  typeLentille?: string;
  rayon?: string;
  nomProduit?: string;
  quantity: number;
  unitPrice: number;
}

export interface SupplierOrder {
  // ... existing fields ...
  items: SupplierOrderItem[];
  subtotal: number;
  discount?: number;
  totalAmount: number;
  amountPaid: number;
  invoiceRef?: string;
}
```

**Updated Action:**
```typescript
createSupplierOrder(userId, {
  supplierId,
  supplierName,
  date,
  items: OrderItem[],
  subtotal,
  discount,
  totalAmount,
  amountPaid,
  invoiceRef,
})
```

---

### UI Layout Example

```
┌─ Nouvelle Commande Fournisseur ─────────────────────┐
│                                                      │
│ Fournisseur: [Indo International ▼]                │
│                                                      │
│ Date: [02/01/2026]  Réf BL: [BL-2026-001]          │
│                                                      │
│ ┌─ Articles ──────────────────────────────────────┐ │
│ │ Type      Détails           Qté  P.U    Total  │ │
│ │ Monture ▼ RayBan RB3447     5    400    2000   🗑│
│ │ Divers  ▼ Spray nettoyant   10   15     150    🗑│
│ │                                                  │ │
│ │ [+ Ajouter un article]                          │ │
│ └──────────────────────────────────────────────────┘ │
│                                                      │
│ Sous-total:        2150 MAD                         │
│ Remise:            [  0  ] MAD                      │
│ ───────────────────────────                         │
│ TOTAL:             2150 MAD                         │
│ Montant payé:      [1000] MAD                       │
│ RESTE À PAYER:     1150 MAD                         │
│                                                      │
│              [Annuler]  [Créer la Commande]         │
└──────────────────────────────────────────────────────┘
```

---

## Verification Plan

1. Open Dialog → Verify supplier list loads
2. Add multiple items of different types
3. Verify type-specific fields show/hide correctly
4. Change quantities/prices → Check auto-calculations
5. Submit → Verify all data saved to Firestore
6. Check order appears in table with items
