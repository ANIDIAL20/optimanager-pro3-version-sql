import { useQuery, useMutation, useQueryClient, useInfiniteQuery, keepPreviousData } from '@tanstack/react-query';
import { 
    getProducts, 
    getProduct,
    createProduct, 
    updateProduct, 
    deleteProduct,
    updateStock,
    searchProducts,
    getLowStockProducts,
    createBulkProducts
} from '@/app/actions/products-actions';
import { useToast } from '@/hooks/use-toast';

// Clés de cache pour React Query
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (filters: any) => [...productKeys.lists(), { filters }] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  lowStock: () => [...productKeys.all, 'lowStock'] as const,
};

/**
 * Hook pour récupérer la liste des produits avec pagination
 */
export function useProducts(
  params: { query?: string; page?: number; limit?: number; category?: string } = { page: 1, limit: 10 },
  initialData?: any
) {
  return useQuery({
    queryKey: productKeys.list(params),
    queryFn: async () => {
      const result = await getProducts(params);
      if (!result.success) throw new Error(result.error);
      return {
        data: result.data,
        meta: result.meta || { total: 0, page: 1, limit: 10, totalPages: 1 }
      };
    },
    initialData,
    placeholderData: keepPreviousData, // smooth transitions
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Hook pour récupérer la liste des produits avec Infinite Scroll (POS)
 */
export function useInfiniteProducts(
  params: { query?: string; limit?: number; category?: string; hideOutOfStock?: boolean; clientId?: number } = { limit: 20 }
) {
  return useInfiniteQuery({
    queryKey: productKeys.list({ ...params, type: 'infinite' }),
    queryFn: async ({ pageParam = 1 }) => {
      const result = await getProducts({
        query: params.query,
        category: params.category,
        page: pageParam,
        limit: params.limit,
        hideOutOfStock: params.hideOutOfStock,
        clientId: params.clientId,
      });
      if (!result.success) throw new Error(result.error);
      return {
        data: result.data,
        meta: result.meta || { total: 0, page: pageParam, limit: params.limit || 20, totalPages: 1 }
      };
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.meta.page < lastPage.meta.totalPages) {
        return lastPage.meta.page + 1;
      }
      return undefined;
    },
    staleTime: 30_000,
    gcTime: 5 * 60_000,
  });
}

/**
 * Hook pour récupérer un produit spécifique
 */
export function useProduct(productId: string) {
  return useQuery({
    queryKey: productKeys.detail(productId),
    queryFn: async () => {
      const result = await getProduct(productId);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    enabled: !!productId,
  });
}

/**
 * Hook pour récupérer les produits en stock faible
 */
export function useLowStockProducts(threshold?: number) {
  return useQuery({
    queryKey: productKeys.lowStock(),
    queryFn: async () => {
      const result = await getLowStockProducts(threshold);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
  });
}

/**
 * Hook pour créer un produit
 */
export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const result = await createProduct(data);
      if (!result.success) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (data) => {
      toast({
        title: "✅ Produit créé",
        description: `${data?.nom} a été ajouté au catalogue.`,
        className: "bg-emerald-600 text-white border-none",
      });
      // Invalider le cache pour forcer un rafraîchissement
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erreur de création",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook pour créer un catalogue de produits (Bulk)
 */
export function useCreateBulkProducts() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: any) => {
      const result = await createBulkProducts(data);
      if (!result.success) throw new Error((result as any).error);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "✅ Produits importés",
        description: `Les produits ont été ajoutés au catalogue.`,
        className: "bg-emerald-600 text-white border-none",
      });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erreur d'import",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook pour mettre à jour un produit
 */
export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const result = await updateProduct(id, data);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "✅ Produit mis à jour",
        description: "Les modifications ont été enregistrées.",
        className: "bg-emerald-600 text-white border-none",
      });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.id) });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erreur de mise à jour",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook spécifique pour MAJ le stock (Entrée/Sortie)
 */
export function useUpdateProductStock() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ productId, quantity, type, reason }: { productId: string, quantity: number, type: 'IN' | 'OUT', reason: string }) => {
      const result = await updateStock({ productId, quantity, type, reason });
      if (!result.success) throw new Error((result as any).error);
      return result;
    },
    onSuccess: (_, variables) => {
      toast({
        title: "✅ Stock mis à jour",
        description: `L'opération de stock a réussi.`,
        className: "bg-emerald-600 text-white border-none",
      });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.detail(variables.productId) });
      queryClient.invalidateQueries({ queryKey: productKeys.lowStock() });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erreur de stock",
        description: error.message,
        variant: "destructive",
      });
    },
  });
}

/**
 * Hook pour supprimer/désactiver un produit
 */
export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (productId: string) => {
      const result = await deleteProduct(productId);
      if (!result.success) throw new Error(result.error);
      return result;
    },
    onSuccess: () => {
      toast({
        title: "✅ Produit supprimé",
        description: "Le produit a été retiré du catalogue.",
      });
      queryClient.invalidateQueries({ queryKey: productKeys.lists() });
      queryClient.invalidateQueries({ queryKey: productKeys.lowStock() });
    },
    onError: (error: any) => {
      toast({
        title: "❌ Erreur de suppression",
        description: error.message,
        variant: "destructive",
      });
    }
  });
}
