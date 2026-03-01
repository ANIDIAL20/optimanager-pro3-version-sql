'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, Eye, Package, Receipt, Sparkles, UserPlus } from 'lucide-react';

import type { Client } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatMAD } from '@/lib/format-currency';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { ClientSelector } from '@/components/sales/client-selector';
import { QuickClientDialog } from '@/components/clients/quick-client-dialog';
import { SaisieMesuresVerres } from '@/components/sales/saisie-mesures-verres';

import { getClients } from '@/features/clients/actions';
import { getPendingLensOrders } from '@/app/actions/lens-orders-actions';
import { getActiveReservationsByClient } from '@/app/actions/reservation-actions';

import { usePosCartStore } from '@/features/pos/store/use-pos-cart-store';

import { CatalogueProduits } from './CatalogueProduits';
import { PosCartPanel } from './PosCartPanel';
import { SaleSuccessModal } from '@/components/vente/SaleSuccessModal';

export function PosWorkspace() {
  const selectedClient = usePosCartStore((s) => s.selectedClient);
  const setSelectedClient = usePosCartStore((s) => s.setSelectedClient);
  const addLensOrder = usePosCartStore((s) => s.addLensOrder);
  const addReservedItem = usePosCartStore((s) => (s as any).addReservedItem);
  const addComplexPack = usePosCartStore((s) => s.addComplexPack);
  const items = usePosCartStore((s) => s.items);

  const [clients, setClients] = React.useState<Client[]>([]);
  const [isLoadingClients, setIsLoadingClients] = React.useState(true);
  const [pendingOrders, setPendingOrders] = React.useState<any[]>([]);
  const [activeReservations, setActiveReservations] = React.useState<any[]>([]);
  
  // Success Modal State
  const [successModalOpen, setSuccessModalOpen] = React.useState(false);
  const [completedSaleId, setCompletedSaleId] = React.useState<string | null>(null);

  const handleSaleSuccess = (saleId?: string) => {
    if (saleId) {
      setCompletedSaleId(saleId);
      setSuccessModalOpen(true);
    }
  };

  React.useEffect(() => {
    let cancelled = false;

    async function loadClients() {
      try {
        setIsLoadingClients(true);
        const res = await getClients(undefined);
        if (cancelled) return;

        if (Array.isArray(res)) {
          const adapted = (res as any[]).map((c) => {
            const fullName = c.fullName || c.name || '';
            const parts = fullName.split(' ');
            const prenom = parts.length > 1 ? parts[0] : '';
            const nom = parts.length > 1 ? parts.slice(1).join(' ') : fullName;
            return {
              ...c,
              id: c.id?.toString?.() ? c.id.toString() : c.id,
              name: fullName,
              nom,
              prenom,
              telephone1: c.phone || c.telephone1 || '',
            } as Client;
          });
          setClients(adapted);
        } else {
          setClients([]);
        }
      } finally {
        if (!cancelled) setIsLoadingClients(false);
      }
    }

    loadClients();
    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    let cancelled = false;

    async function loadClientData() {
      if (!selectedClient?.id) {
        setPendingOrders([]);
        setActiveReservations([]);
        return;
      }

      const [resOrders, resReservations] = await Promise.all([
        getPendingLensOrders(selectedClient.id),
        getActiveReservationsByClient(selectedClient.id)
      ]);

      if (cancelled) return;

      if (resOrders.success && resOrders.data) setPendingOrders(resOrders.data);
      else setPendingOrders([]);

      if (resReservations.success && resReservations.data) setActiveReservations(resReservations.data);
      else setActiveReservations([]);
    }

    loadClientData();
    return () => {
      cancelled = true;
    };
  }, [selectedClient?.id]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="rounded-full hover:bg-slate-100 h-10 w-10"
          >
            <Link href="/dashboard/ventes">
              <ArrowLeft className="h-5 w-5 text-slate-500" />
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-4">
              <div className="h-12 w-12 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                <Receipt className="h-6 w-6" />
              </div>
              Nouvelle Vente
            </h1>
            <p className="text-slate-500 ml-1">
              Point de vente professionnel — Encaissement rapide
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-lg px-3 py-1 bg-white shadow-sm border-slate-200">
            1
          </Badge>
          <h3 className="font-semibold text-lg text-slate-800">Identification du Client</h3>
        </div>
        <Card className="border border-slate-200 shadow-sm rounded-xl">
          <CardContent className="p-4">
            <div className="flex gap-4 items-start">
              <div className="flex-1 max-w-2xl">
                {isLoadingClients ? (
                  <div className="h-10 bg-slate-200 animate-pulse rounded" />
                ) : (
                  <ClientSelector
                    clients={clients}
                    selectedClient={selectedClient}
                    onSelectClient={setSelectedClient}
                    onCreateNew={() => {}}
                  />
                )}
              </div>
              <div className="pt-0.5">
                <QuickClientDialog
                  onClientCreated={setSelectedClient}
                  trigger={
                    <Button
                      className="h-10 gap-2 px-4 shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-all"
                      title="Créer un nouveau client"
                    >
                      <UserPlus className="h-4 w-4" />
                      <span className="hidden sm:inline">Nouveau Client</span>
                    </Button>
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {pendingOrders.length > 0 && (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-700">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-12 bg-indigo-500 rounded-full flex items-center justify-center text-[10px] text-white font-black">
                PRO
              </div>
              <h3 className="font-extrabold text-lg text-slate-800 tracking-tight">
                Commandes Détectées{' '}
                <span className="text-indigo-600">({pendingOrders.length})</span>
              </h3>
            </div>
            <Badge
              variant="outline"
              className="bg-white text-indigo-700 border-indigo-200 shadow-sm font-semibold px-2 py-0.5 flex gap-1.5 items-center rounded-full"
            >
              <Sparkles className="h-3 w-3 text-indigo-500" />
              Auto-Sync
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {pendingOrders.map((order) => {
              const isAdded = items.some((i) => (i as any).lensOrderId === order.id);
              const isReceived = order.status === 'received';

              return (
                <Card
                  key={order.id}
                  className={cn(
                    'overflow-hidden border-2 transition-all duration-300 group hover:shadow-lg relative',
                    isReceived
                      ? 'border-emerald-100 bg-emerald-50/30 hover:border-emerald-400'
                      : 'border-indigo-50 bg-indigo-50/20 hover:border-indigo-300',
                    isAdded && 'opacity-40 border-slate-100 pointer-events-none'
                  )}
                >
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex gap-3 items-center flex-1 min-w-0">
                      <div
                        className={cn(
                          'h-10 w-10 rounded-lg flex items-center justify-center shadow-sm shrink-0',
                          isReceived
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-indigo-100 text-indigo-600'
                        )}
                      >
                        {isReceived ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          <Package className="h-5 w-5" />
                        )}
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900 text-sm truncate uppercase tracking-tight">
                            {order.lensType}
                          </p>
                          <Badge
                            className={cn(
                              'text-[8px] h-3.5 px-1 rounded',
                              isReceived
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-400 text-white'
                            )}
                          >
                            {isReceived ? 'Prêt' : 'Fil'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                          <span className="text-indigo-600">{order.orderType}</span>
                          <span>•</span>
                          <span className="text-slate-800">
                            {formatMAD(parseFloat(order.sellingPrice))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isAdded ? 'ghost' : isReceived ? 'default' : 'outline'}
                      className={cn(
                        'font-black text-[10px] h-8 px-3 rounded-lg border-2',
                        !isAdded &&
                          isReceived &&
                          'bg-slate-900 border-slate-900 hover:bg-slate-800 text-white shadow-sm'
                      )}
                      onClick={() => addLensOrder(order)}
                      disabled={isAdded}
                    >
                      {isAdded ? 'OK' : isReceived ? 'AJOUTER' : 'LIER'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {activeReservations.length > 0 && (
        <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-top-4 duration-700 mt-4">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <div className="h-6 w-12 bg-amber-500 rounded-full flex items-center justify-center text-[10px] text-white font-black">
                RES
              </div>
              <h3 className="font-extrabold text-lg text-slate-800 tracking-tight">
                Produits Réservés{' '}
                <span className="text-amber-600">({activeReservations.length})</span>
              </h3>
            </div>
            <Badge
              variant="outline"
              className="bg-white text-amber-700 border-amber-200 shadow-sm font-semibold px-2 py-0.5 flex gap-1.5 items-center rounded-full"
            >
              <Package className="h-3 w-3 text-amber-500" />
              Réservations
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeReservations.map((res) => {
              const isAdded = items.some((i) => (i as any).fromReservation === res.id);
              const itemsList = res.items.map((it: any) => it.productName).join(', ');
              const advanceAmount = parseFloat(res.depositAmount || '0');

              return (
                <Card
                  key={res.id}
                  className={cn(
                    'overflow-hidden border-2 transition-all duration-300 group hover:shadow-lg relative border-amber-50 bg-amber-50/20 hover:border-amber-300',
                    isAdded && 'opacity-40 border-slate-100 pointer-events-none'
                  )}
                >
                  <CardContent className="p-3 flex items-center justify-between gap-3">
                    <div className="flex gap-3 items-center flex-1 min-w-0">
                      <div className="h-10 w-10 rounded-lg flex items-center justify-center shadow-sm shrink-0 bg-amber-100 text-amber-600">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div className="space-y-0.5 overflow-hidden">
                        <div className="flex items-center gap-1.5">
                          <p className="font-bold text-slate-900 text-sm truncate uppercase tracking-tight">
                            Réservation #{res.id}
                          </p>
                          {advanceAmount > 0 && (
                            <Badge className="text-[8px] h-3.5 px-1 rounded bg-emerald-600 text-white">
                              Avancé
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 truncate italic">
                          {itemsList}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500">
                          <span className="text-slate-800">
                            Total: {formatMAD(parseFloat(res.totalAmount))}
                          </span>
                          {advanceAmount > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-emerald-600">
                                Avance: {formatMAD(advanceAmount)}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <Button
                      size="sm"
                      variant={isAdded ? 'ghost' : 'default'}
                      className={cn(
                        'font-black text-[10px] h-8 px-3 rounded-lg border-2',
                        !isAdded && 'bg-amber-600 border-amber-600 hover:bg-amber-700 text-white shadow-sm'
                      )}
                      onClick={() => addReservedItem(res)}
                      disabled={isAdded}
                    >
                      {isAdded ? 'OK' : 'AJOUTER'}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="mesures" className="w-full">
            <TabsList className="flex w-full mb-8 bg-slate-100/80 p-1.5 rounded-2xl h-14 border border-slate-200 shadow-inner">
              <TabsTrigger
                value="mesures"
                className="flex-1 rounded-xl flex items-center justify-center gap-2 data-[state=active]:bg-white data-[state=active]:text-blue-600 data-[state=active]:shadow-sm data-[state=active]:font-bold text-slate-500 transition-all font-medium py-2"
              >
                <Eye className="h-4 w-4" />
                <span>Mesures & Verres</span>
              </TabsTrigger>
              <TabsTrigger
                value="catalog"
                className="flex-1 rounded-xl flex items-center justify-center gap-2 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm data-[state=active]:font-bold text-slate-500 transition-all font-medium py-2"
              >
                <Package className="h-4 w-4" />
                <span>Catalogue Produits</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="mesures" className="mt-0 focus-visible:outline-none">
              <SaisieMesuresVerres onAddToCart={addComplexPack} />
            </TabsContent>

            <TabsContent value="catalog" className="mt-0 focus-visible:outline-none">
              {/* 🔖 BUG-3 FIX: pass selectedClient?.id so VERRE are scoped to this client */}
              <CatalogueProduits clientId={selectedClient?.id as number | undefined} />
            </TabsContent>
          </Tabs>
        </div>

        <div className="lg:col-span-1 space-y-4">
          <div className="flex items-center gap-3 mb-2">
            <Badge variant="outline" className="text-lg px-3 py-1 bg-white shadow-sm border-slate-200">
              3
            </Badge>
            <h3 className="font-semibold text-lg text-slate-800">Encaissement</h3>
          </div>
          <PosCartPanel onSuccess={(saleId) => handleSaleSuccess(saleId)} />
        </div>
      </div>

      {/* Sale Success Modal */}
      {completedSaleId && (
        <SaleSuccessModal 
          isOpen={successModalOpen} 
          onClose={() => setSuccessModalOpen(false)} 
          saleId={completedSaleId} 
        />
      )}
    </div>
  );
}
