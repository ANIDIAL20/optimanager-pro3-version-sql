'use client';

import * as React from 'react';
import { DataTable } from '@/components/ui/data-table';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Input } from '@/components/ui/input';
import {
  Search,
  LayoutGrid,
} from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getCategoryIcon } from '@/lib/category-icons';

interface SuppliersClientViewProps {
  suppliers: any[];
  columns: any;
}

export function SuppliersClientView({ suppliers, columns }: SuppliersClientViewProps) {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState('all');

  const filteredSuppliers = React.useMemo(() => {
    let filtered = suppliers;

    // Category Filter
    if (activeCategory !== 'all') {
      filtered = filtered.filter(s => s.category && s.category.includes(activeCategory));
    }

    // Search Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.name?.toLowerCase().includes(lower) ||
        s.email?.toLowerCase().includes(lower) ||
        s.phone?.includes(lower)
      );
    }

    return filtered;
  }, [suppliers, activeCategory, searchTerm]);

  return (
    <>
      {/* Search & Filter Bar */}
      <SpotlightCard className="p-4">
        <div className="flex flex-col gap-4">
          <Tabs value={activeCategory} onValueChange={setActiveCategory} className="w-full">
            <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Rechercher un fournisseur..."
                  className="pl-10 bg-white border-slate-200 focus:border-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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

      {/* Table */}
      <DataTable columns={columns} data={filteredSuppliers} />
    </>
  );
}
