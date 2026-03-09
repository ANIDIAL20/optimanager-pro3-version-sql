import { useQuery } from '@tanstack/react-query';
import { getSupplier } from '@/app/actions/supplier-actions';

export function useSupplierBalance(supplierId: string) {
  return useQuery({
    queryKey: ['supplier-balance', supplierId],
    queryFn: async () => {
      const supplier = await getSupplier(supplierId);
      return {
        balance: Number(supplier?.currentBalance || 0),
        // Compatibility with older components that expected stats:
        totalOrders: Number(supplier?.totalAchats || 0),
        totalPayments: Number(supplier?.totalPaiements || 0),
        totalAppliedCredits: 0
      };
    },
    staleTime: 5 * 60 * 1000,
  });
}

