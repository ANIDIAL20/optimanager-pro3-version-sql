'use client';

import * as React from 'react';
import { collection } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { DataTable } from '@/components/ui/data-table';
import { columns as supplierColumns, type Supplier } from '@/components/dashboard/fournisseurs/columns';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Plus,
  Search,
  Truck,
  BookUser,
  LayoutGrid,
  Eye,
  Glasses
} from 'lucide-react';
import { getCategoryIcon } from '@/lib/category-icons';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function SuppliersPage() {
  const firestore = useFirestore();
  const { user } = useFirebase();

  const [searchTerm, setSearchTerm] = React.useState('');
  const [activeCategory, setActiveCategory] = React.useState('all');

  const suppliersQuery = useMemoFirebase(
    () => firestore && user ? collection(firestore, `stores/${user.uid}/suppliers`) : null,
    [firestore, user]
  );
  const { data: suppliers, isLoading } = useCollection<Supplier>(suppliersQuery);

  const stats = React.useMemo(() => {
    if (!suppliers) return { total: 0, verres: 0, montures: 0 };
    return {
      total: suppliers.length,
      verres: suppliers.filter(s => s.typeProduits?.includes('Verres')).length,
      montures: suppliers.filter(s => s.typeProduits?.includes('Montures')).length,
    };
  }, [suppliers]);

  const filteredSuppliers = React.useMemo(() => {
    if (!suppliers) return [];

    let filtered = suppliers;

    // Category Filter
    if (activeCategory !== 'all') {
      filtered = filtered.filter(s => s.typeProduits && s.typeProduits.includes(activeCategory));
    }

    // Search Filter
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.nomCommercial?.toLowerCase().includes(lower) ||
        s.email?.toLowerCase().includes(lower) ||
        s.telephone?.includes(lower)
      );
    }

    return filtered;
  }, [suppliers, activeCategory, searchTerm]);



  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Fournisseurs</h2>
        <Link href="/suppliers/new">
          <Button className="bg-primary hover:bg-primary/90 text-white shadow-md">
            <Plus className="mr-2 h-4 w-4" />
            Nouveau Fournisseur
          </Button>
        </Link>
      </div>

      <Separator />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <SpotlightCard className="p-6 bg-white border-slate-200/60 shadow-sm" spotlightColor="rgba(59, 130, 246, 0.15)">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Truck className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Total Fournisseurs</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.total}</h3>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-6 bg-white border-slate-200/60 shadow-sm" spotlightColor="rgba(34, 197, 94, 0.15)">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <Eye className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Fournisseurs Verres</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.verres}</h3>
            </div>
          </div>
        </SpotlightCard>

        <SpotlightCard className="p-6 bg-white border-slate-200/60 shadow-sm" spotlightColor="rgba(168, 85, 247, 0.15)">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Glasses className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-600">Fournisseurs Montures</p>
              <h3 className="text-2xl font-bold text-slate-800">{stats.montures}</h3>
            </div>
          </div>
        </SpotlightCard>
      </div>

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
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      ) : (
        <DataTable columns={supplierColumns} data={filteredSuppliers} />
      )}
    </div>
  );
}
