import { useQuery } from '@tanstack/react-query';
import { getSupplierStatement } from '@/app/actions/supplier-statement';

export function useSupplierStatement(supplierId: number) {
  return useQuery({
    queryKey: ['supplier-statement', supplierId],
    queryFn: () => getSupplierStatement(supplierId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
