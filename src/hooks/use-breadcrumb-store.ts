import { create } from 'zustand';

interface BreadcrumbStore {
  labels: Record<string, string>;
  setLabel: (id: string, label: string) => void;
  getLabel: (id: string) => string | undefined;
}

export const useBreadcrumbStore = create<BreadcrumbStore>((set, get) => ({
  labels: {},
  setLabel: (id, label) => set((state) => ({
    labels: { ...state.labels, [id]: label }
  })),
  getLabel: (id) => get().labels[id],
}));
