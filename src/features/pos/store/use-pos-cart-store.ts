import { create } from 'zustand';
import {
  PosLineItem,
  PriceMode,
  setStandardPrice,
  applyPriceOverride,
  applyPercentDiscount,
  recalculateLineTotal,
  createLineItem,
} from '@/features/pos/utils/pricing';
import type { Client } from '@/lib/types';
import type { PosLineItemWithAdvance } from '@/types/pos';

type PosProductInput = {
  id: string;
  nomProduit: string;
  prixVente: number;
  reference?: string;
  productType?: string;
  isStockManaged?: boolean;
  quantiteStock?: number;
};

/** Champ injecté sur les lignes issues d'une lensOrder */
export type LensOrderLineExtra = {
  lensOrderId?: number;
  advanceAlreadyPaid?: number; // ✅ avance versée lors de la commande
};

interface PosCartState {
  items: PosLineItem[];
  totalAmount: number;
  totalAdvancePaid: number; // ✅ somme des avances versées sur les commandes du panier
  selectedClient: Client | null;
  factureOfficielle: boolean;
  isProcessing: boolean;

  // Actions
  setItems: (items: PosLineItem[]) => void;
  addItem: (product: PosProductInput) => void;
  addLensOrder: (order: any) => void;
  addComplexPack: (values: any) => void;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, delta: number) => void;
  clearCart: () => void;
  
  setSelectedClient: (client: Client | null) => void;
  setFactureOfficielle: (val: boolean) => void;
  setIsProcessing: (val: boolean) => void;

  updateLinePricing: (
    lineId: string,
    mode: PriceMode,
    payload?: { newPrice?: number; percent?: number; reason?: string }
  ) => void;
  updateLensDetails: (lineId: string, details: any[]) => void;
}

export const usePosCartStore = create<PosCartState>((set) => ({
  items: [],
  totalAmount: 0,
  totalAdvancePaid: 0, // ✅ initialisé à 0
  selectedClient: null,
  factureOfficielle: true,
  isProcessing: false,

  setItems: (items) => {
    const totalAmount = items.reduce((sum, it) => sum + it.lineTotal, 0);
    const totalAdvancePaid = items.reduce(
      (sum, it) => sum + ((it as PosLineItemWithAdvance).advanceAlreadyPaid ?? 0), 0
    );
    set({ items, totalAmount, totalAdvancePaid });
  },

  addItem: (product) => {
    set((state) => {
      const existingIndex = state.items.findIndex(item => item.productId === product.id);
      
      let newItems = [...state.items];
      if (existingIndex >= 0) {
        const existingItem = state.items[existingIndex];
        newItems[existingIndex] = recalculateLineTotal({
          ...existingItem,
          quantity: existingItem.quantity + 1
        });
      } else {
        const newItem = createLineItem(
          product.id,
          product.nomProduit,
          product.prixVente,
          1,
          (product as any).productType === 'lens' ? 'VERRE' : 'AUTRE',
          { productType: (product as any).productType },
          product.reference
        );
        newItems.push(newItem);
      }
      
      return { 
        items: newItems, 
        totalAmount: newItems.reduce((sum, it) => sum + it.lineTotal, 0) 
      };
    });
  },

  addComplexPack: (values) => {
    set((state) => {
      const metadata = {
        isComplexPack: true,
        prescription: {
          od: values.OD,
          og: values.OS,
          pd: { binocular: values.PD },
          doctorName: values.doctorName,
          date: values.prescriptionDate,
        },
        lensOrder: {
          supplierId: values.supplierId,
          supplierName: values.supplierName,
          orderType: values.orderType,
          treatments: values.treatments,
          purchasePrice: values.purchasePrice,
          notes: values.notes,
          eye:
            (values.OD?.sph || values.OD?.cyl || values.OD?.axis) &&
            (values.OS?.sph || values.OS?.cyl || values.OS?.axis)
              ? 'les deux'
              : values.OD?.sph || values.OD?.cyl || values.OD?.axis
                ? 'OD'
                : 'OG',
          expectedDeliveryDays: 5,
          index: values.index,
        },
      };

      const newItem = createLineItem(
        'LENS-PACK-PRODUCT',
        values.lensType,
        Number(values.sellingPrice || 0),
        1,
        'VERRE',
        metadata
      );

      const items = [...state.items, newItem];
      const totalAmount = items.reduce((sum, it) => sum + it.lineTotal, 0);
      return { ...state, items, totalAmount };
    });
  },

  addLensOrder: (order) => {
    set((state) => {
        if (state.items.some(item => (item as any).lensOrderId === order.id)) {
            return state;
        }

        const isReceived = order.status === 'received';
        const isContact = order.orderType === 'contact';
        const price = parseFloat(order.sellingPrice || '0');
        // ✅ Récupérer l'avance versée lors de la commande
        const advancePaid = Number(order.amountPaid ?? 0);

        const newLine = {
            ...createLineItem(
                `LO-${order.id}`,
                `${isReceived ? '✓' : '⚡'} ${isContact ? 'Lentilles' : 'Verres'}: ${order.lensType}`,
                price,
                1,
                'VERRE'
            ),
            lensOrderId: order.id,
            advanceAlreadyPaid: advancePaid, // ✅ stocker l'avance sur la ligne
        };
        
        const newItems = [...state.items, newLine];
        // Recalculer le total des avances sur toutes les lignes
        const totalAdvancePaid = newItems.reduce(
            (sum, it) => sum + ((it as PosLineItemWithAdvance).advanceAlreadyPaid ?? 0), 0
        );
        return { 
            items: newItems, 
            totalAmount: newItems.reduce((sum, it) => sum + it.lineTotal, 0),
            totalAdvancePaid,
        };
    });
  },

  removeItem: (lineId) => {
    set((state) => {
      const newItems = state.items.filter(item => item.lineId !== lineId);
      const totalAdvancePaid = newItems.reduce(
        (sum, it) => sum + ((it as PosLineItemWithAdvance).advanceAlreadyPaid ?? 0), 0
      );
      return { 
        items: newItems, 
        totalAmount: newItems.reduce((sum, it) => sum + it.lineTotal, 0),
        totalAdvancePaid,
      };
    });
  },


  updateQuantity: (lineId, delta) => {
    set((state) => {
      const newItems = state.items.map(item => {
        if (item.lineId === lineId) {
          const newQuantity = item.quantity + delta;
          if (newQuantity < 1) return item;
          return recalculateLineTotal({ ...item, quantity: newQuantity });
        }
        return item;
      });
      return { 
        items: newItems, 
        totalAmount: newItems.reduce((sum, it) => sum + it.lineTotal, 0) 
      };
    });
  },

  clearCart: () => set({ items: [], totalAmount: 0, totalAdvancePaid: 0 }),

  setSelectedClient: (client) => set({ selectedClient: client }),
  setFactureOfficielle: (val) => set({ factureOfficielle: val }),
  setIsProcessing: (val) => set({ isProcessing: val }),

  updateLensDetails: (lineId, details) => {
    set((state) => {
      const items = state.items.map((item) => {
        if (item.lineId === lineId) {
          return { ...item, lensDetails: details };
        }
        return item;
      });
      return { ...state, items };
    });
  },

  updateLinePricing: (lineId, mode, payload) => {
    set((state) => {
      const items = state.items.map((item) => {
        if (item.lineId !== lineId) return item;

        if (mode === 'STANDARD') {
          return setStandardPrice(item);
        }
        if (mode === 'OVERRIDE' && payload?.newPrice != null) {
          return applyPriceOverride(item, payload.newPrice, payload.reason);
        }
        if (mode === 'DISCOUNT' && payload?.percent != null) {
          return applyPercentDiscount(item, payload.percent);
        }
        return item;
      });

      const totalAmount = items.reduce(
        (sum, it) => sum + it.lineTotal,
        0
      );

      return { ...state, items, totalAmount };
    });
  },
}));
