import { useQuery } from '@tanstack/react-query';
import { getSupplierBalanceAction } from '@/app/actions/supplier-statement';

export function useSupplierBalance(supplierId: string | number) {
  return useQuery({
    queryKey: ['supplier-balance', supplierId],
    queryFn: () => getSupplierBalanceAction(supplierId),
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });
}
