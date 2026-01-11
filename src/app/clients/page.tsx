'use client';

import * as React from 'react';
import { collection, query, orderBy, where } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { DataTable } from '@/components/ui/data-table';
import { columns, type Client } from '@/components/dashboard/clients/columns';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Users, Coins, Clock, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { SensitiveData } from '@/components/ui/sensitive-data';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

export default function ClientsPage() {
  const firestore = useFirestore();
  const { user } = useFirebase();
  const [searchTerm, setSearchTerm] = React.useState('');

  // Fetch clients
  const clientsQuery = useMemoFirebase(
    () => firestore && user ? query(collection(firestore, `stores/${user.uid}/clients`), orderBy('createdAt', 'desc')) : null,
    [firestore, user]
  );
  const { data: rawClients, isLoading: isLoadingClients } = useCollection<Client>(clientsQuery);

  // Fetch ALL Sales for dynamic calculation
  const salesQuery = useMemoFirebase(
    () => firestore && user ? query(collection(firestore, `stores/${user.uid}/sales`)) : null,
    [firestore, user]
  );
  const { data: sales, isLoading: isLoadingSales } = useCollection<any>(salesQuery);


  // Stats calculations & Data Enrichment
  const { stats, enrichedClients } = React.useMemo(() => {
    if (!rawClients || !sales) return {
      stats: { totalClients: 0, totalCredit: 0, activeOrders: 0, clientsWithCredit: 0 },
      enrichedClients: []
    };

    // 1. Calculate Balance Map (ClientId -> Total Debt) AND Last Visit Map
    const clientBalanceMap = new Map<string, number>();
    const clientLastVisitMap = new Map<string, Date>();

    sales.forEach((sale: any) => {
      if (!sale.clientId) return;

      // --- Last Visit Logic ---
      let saleDate: Date | null = null;
      if (sale.createdAt?.toDate) {
        saleDate = sale.createdAt.toDate();
      } else if (sale.createdAt) {
        saleDate = new Date(sale.createdAt);
      } else if (sale.date?.toDate) { // Fallback to 'date' field
        saleDate = sale.date.toDate();
      } else if (sale.date) {
        saleDate = new Date(sale.date);
      }

      if (saleDate) {
        const storedDate = clientLastVisitMap.get(sale.clientId);
        if (!storedDate || saleDate > storedDate) {
          clientLastVisitMap.set(sale.clientId, saleDate);
        }
      }
      // ------------------------

      let debt = 0;
      // Logic: Use 'resteAPayer' if available (preferred), else calculate from total - paid
      if (sale.resteAPayer !== undefined) {
        debt = sale.resteAPayer;
      } else {
        const total = (sale.totalTTC || sale.total || 0);
        const paid = (sale.amountPaid || sale.montantPaye || 0);
        debt = total - paid;
      }

      // Only add positive debt
      if (debt > 0) {
        const current = clientBalanceMap.get(sale.clientId) || 0;
        clientBalanceMap.set(sale.clientId, current + debt);
      }
    });

    // 2. Enrich Clients with calculated Solde and Last Visit
    const enriched = rawClients.map(client => ({
      ...client,
      solde: clientBalanceMap.get(client.id) || 0, // Override static solde with calculated one
      derniereVisite: clientLastVisitMap.get(client.id) // Add calculated last visit
    }));

    // 3. Stats
    const totalClients = enriched.length;
    const clientsWithCredit = enriched.filter(c => c.solde > 0).length;

    // Sum of all values in the map (Total Credit)
    let totalCredit = 0;
    clientBalanceMap.forEach(v => totalCredit += v);

    // Commandes en Cours (Active Orders)
    // Filter sales where status != 'Livré' AND status != 'Terminé' AND status != 'Annulé'
    const activeOrders = sales.filter((sale: any) => {
      const s = sale.status || '';
      return s !== 'Livré' && s !== 'Terminé' && s !== 'Annulé';
    }).length;

    return {
      stats: {
        totalClients,
        totalCredit,
        activeOrders,
        clientsWithCredit
      },
      enrichedClients: enriched
    };
  }, [rawClients, sales]);

  // Filter 1: All Clients (Search Only)
  const filteredBySearchOnly = React.useMemo(() => {
    if (!enrichedClients) return [];
    const searchLower = searchTerm.toLowerCase();
    return enrichedClients.filter(client =>
      (client.nom || '').toLowerCase().includes(searchLower) ||
      (client.prenom || '').toLowerCase().includes(searchLower) ||
      (client.telephone1 || '').includes(searchLower) ||
      (client.telephone2 || '').includes(searchLower)
    );
  }, [enrichedClients, searchTerm]);

  // Filter 2: Credit Clients (Search + Credit)
  const filteredByCreditAndSearch = React.useMemo(() => {
    return filteredBySearchOnly.filter(client => (client.solde || 0) > 0);
  }, [filteredBySearchOnly]);


  const isLoading = isLoadingClients || isLoadingSales;

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Title Only */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dossiers Clients</h1>
        <p className="text-slate-600 mt-1">Gérez votre base de données clients</p>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Total Clients */}
        <SpotlightCard className="p-6" spotlightColor="rgba(59, 130, 246, 0.15)">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600">Total Clients</p>
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Users className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl font-bold text-slate-900">{stats.totalClients}</h3>
              <p className="text-xs text-slate-500">Total dossiers enregistrés</p>
            </div>
          </div>
        </SpotlightCard>

        {/* Card 2: Crédit Total */}
        <SpotlightCard className="p-6" spotlightColor="rgba(249, 115, 22, 0.15)">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-600">Crédit Total</p>
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center">
                <Coins className="h-4 w-4 text-white" />
              </div>
            </div>
            <div className="space-y-1">
              <h3 className={`text-3xl font-bold ${stats.totalCredit > 0 ? 'text-orange-600' : 'text-slate-900'}`}>
                {stats.totalCredit.toLocaleString('fr-MA', { style: 'currency', currency: 'MAD' })}
              </h3>
              <p className="text-xs text-slate-500">Montant total à recouvrir</p>
            </div>
          </div>
        </SpotlightCard>

        {/* Card 3: Commandes en Cours */}
        {/* Card 3: Commandes en Cours */}
        <Link href="/dashboard/fournisseurs" className="block transition-transform hover:scale-[1.02]">
          <SpotlightCard className="p-6" spotlightColor="rgba(16, 185, 129, 0.15)">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-slate-600">Commandes en Cours</p>
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Clock className="h-4 w-4 text-white" />
                </div>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold text-slate-900">{stats.activeOrders}</h3>
                <p className="text-xs text-slate-500">Dossiers non livrés / terminés</p>
              </div>
            </div>
          </SpotlightCard>
        </Link>
      </div>

      {/* Tabs System */}
      <Tabs defaultValue="tous" className="w-full">
        {/* 1. Header with Tabs & Add Button */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <TabsList className="grid w-full md:w-[400px] grid-cols-2">
            <TabsTrigger value="tous">
              Tous ({stats.totalClients})
            </TabsTrigger>
            <TabsTrigger value="credit" className="data-[state=active]:bg-red-100 data-[state=active]:text-red-700 text-slate-600">
              ⚠️ Clients avec Crédit ({stats.clientsWithCredit})
            </TabsTrigger>
          </TabsList>

          <Button asChild className="bg-gradient-to-r from-blue-600 to-teal-500 hover:from-blue-700 hover:to-teal-600 shadow-md">
            <Link href="/clients/new">
              <Plus className="mr-2 h-4 w-4" />
              Nouveau Client
            </Link>
          </Button>
        </div>

        {/* 2. Global Search */}
        <div className="mb-6">
          <SpotlightCard className="p-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher par nom, prénom ou téléphone..."
                className="pl-10 bg-white border-none focus-visible:ring-0 shadow-none text-base py-6"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </SpotlightCard>
        </div>

        {/* 3. Content Areas */}
        <TabsContent value="tous" className="mt-0">
          <DataTable
            columns={columns}
            data={filteredBySearchOnly}
          />
        </TabsContent>

        <TabsContent value="credit" className="mt-0">
          <DataTable
            columns={columns}
            data={filteredByCreditAndSearch}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-48" />
      </div>
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
        <Skeleton className="h-24 rounded-xl" />
      </div>
      <Skeleton className="h-12 rounded-xl" />
      <Skeleton className="h-96 rounded-xl" />
    </div>
  );
}
