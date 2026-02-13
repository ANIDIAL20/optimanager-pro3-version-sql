import { create } from 'zustand';
import {
  PosLineItem,
  PriceMode,
  setStandardPrice,
  applyPriceOverride,
  applyPercentDiscount,
  recalculateLineTotal,
} from '@/features/pos/utils/pricing';

interface PosCartState {
  items: PosLineItem[];
  totalAmount: number;

  // Actions
  setItems: (items: PosLineItem[]) => void;
  updateLinePricing: (
    lineId: string,
    mode: PriceMode,
    payload?: { newPrice?: number; percent?: number; reason?: string }
  ) => void;
}

export const usePosCartStore = create<PosCartState>((set) => ({
  items: [],
  totalAmount: 0,

  setItems: (items) => {
    const totalAmount = items.reduce((sum, it) => sum + it.lineTotal, 0);
    set({ items, totalAmount });
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
