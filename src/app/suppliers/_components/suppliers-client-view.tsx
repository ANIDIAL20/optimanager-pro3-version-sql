'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DataTable } from '@/components/ui/data-table';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Search,
  LayoutGrid,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCategoryIcon } from '@/lib/category-icons';
import { BulkReceiveModal } from '@/components/suppliers/BulkReceiveModal';
import { usePathname } from 'next/navigation';
import { useDebouncedCallback } from 'use-debounce';

interface SuppliersClientViewProps {
  initialData: any[];
  columns: any;
  totalCount: number;
  currentPage: number;
  totalPages: number;
  initialSearch: string;
  initialCategory: string;
}

export function SuppliersClientView({ 
  initialData, 
  columns,
  totalCount,
  currentPage,
  totalPages,
  initialSearch,
  initialCategory
}: SuppliersClientViewProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Local state for the input field to allow fast typing before debouncing
  const [searchTerm, setSearchTerm] = React.useState(initialSearch);

  // Sync internal state if URL changes externally
  React.useEffect(() => {
    setSearchTerm(initialSearch);
  }, [initialSearch]);

  const updateUrl = React.useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        if (key === 'search' || key === 'category') {
           params.set('page', '1'); // reset page on new search/filter
        }
        params.set(key, value);
      } else {
        if (key === 'search' || key === 'category') {
            params.set('page', '1');
        }
        params.delete(key);
      }
      router.push(`${pathname}?${params.toString()}`);
    },
    [pathname, router, searchParams]
  );

  const debouncedSearch = useDebouncedCallback((value: string) => {
    updateUrl('search', value);
  }, 500);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handleCategoryChange = (val: string) => {
    updateUrl('category', val === 'all' ? '' : val);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > totalPages) return;
    updateUrl('page', newPage.toString());
  };

  return (
    <>
      <SpotlightCard className="p-4">
        <div className="flex flex-col gap-4">
          <Tabs value={initialCategory} onValueChange={handleCategoryChange} className="w-full">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Rechercher un fournisseur... (Nom, Email, Téléphone)"
                    className="pl-10 bg-white border-slate-200 focus:border-blue-500"
                    value={searchTerm}
                    onChange={handleSearchChange}
                  />
                </div>
                <div className="hidden md:block">
                   <BulkReceiveModal />
                </div>
              </div>
            </div>

            <div className="mt-4">
              <TabsList className="bg-slate-100 p-1 h-auto w-full justify-start overflow-x-auto flex-nowrap">
                <TabsTrigger value="all" className="px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap min-w-fit">
                  <LayoutGrid className="mr-2 h-4 w-4" />
                  Tout
                </TabsTrigger>
                {["Montures", "Verres", "Lentilles", "Produits d'entretien", "Cordons", "Etuis", "Accessoires", "Matériel", "Divers"].map(cat => {
                  const Icon = getCategoryIcon(cat);
                  return (
                    <TabsTrigger key={cat} value={cat} className="px-3 py-1.5 text-xs sm:text-sm whitespace-nowrap min-w-fit">
                      <Icon className="mr-2 h-4 w-4" />
                      {cat}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>
          </Tabs>
        </div>
      </SpotlightCard>

      {/* Table - receives filtered data externally */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
         <DataTable columns={columns} data={initialData} />
         
         {/* Server-Side Pagination Controls */}
         {totalPages > 1 && (
           <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 bg-slate-50/50">
             <div className="text-sm text-slate-500">
               Affichage des pages <span className="font-medium text-slate-900">{currentPage}</span> sur <span className="font-medium text-slate-900">{totalPages}</span>
               <span className="ml-2">({totalCount} fournisseurs)</span>
             </div>
             <div className="flex gap-2">
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => handlePageChange(currentPage - 1)}
                 disabled={currentPage <= 1}
               >
                 <ChevronLeft className="h-4 w-4 mr-1" />
                 Précédent
               </Button>
               <Button
                 variant="outline"
                 size="sm"
                 onClick={() => handlePageChange(currentPage + 1)}
                 disabled={currentPage >= totalPages}
               >
                 Suivant
                 <ChevronRight className="h-4 w-4 ml-1" />
               </Button>
             </div>
           </div>
         )}
      </div>
    </>
  );
}
