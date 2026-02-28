'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { PaymentSection } from '@/app/dashboard/clients/[id]/_components/pos/payment-section';
import { DiscountDialog } from '@/components/clients/discount-dialog';
import { LensDetailsDialog } from '@/components/sales/lens-details-dialog';
import { useToast } from '@/hooks/use-toast';

import {
  AlertTriangle,
  Eye,
  Minus,
  Plus,
  Receipt,
  ShoppingCart,
  Trash2,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { createSale } from '@/app/actions/sales-actions';
import { createReservationFromCartAction, completeFrameReservationAction as completeFrameReservation } from '@/app/actions/reservation-actions';

import { usePosCartStore } from '@/features/pos/store/use-pos-cart-store';

interface PosCartPanelProps {
  alreadyPaid?: number;
  reservationIds?: number[];
  onSuccess?: (saleId?: string) => void;
  className?: string;
}

export function PosCartPanel({ alreadyPaid = 0, reservationIds = [], onSuccess, className }: PosCartPanelProps) {
  const router = useRouter();
  const { toast } = useToast();

  const items = usePosCartStore((s) => s.items);
  const total = usePosCartStore((s) => s.totalAmount);
  const selectedClient = usePosCartStore((s) => s.selectedClient);
  const totalAdvancePaid = usePosCartStore((s) => s.totalAdvancePaid); // ✅ avances commandes verres

  const factureOfficielle = usePosCartStore((s) => s.factureOfficielle);
  const setFactureOfficielle = usePosCartStore((s) => s.setFactureOfficielle);

  const isProcessing = usePosCartStore((s) => s.isProcessing);
  const setIsProcessing = usePosCartStore((s) => s.setIsProcessing);

  const updateQuantity = usePosCartStore((s) => s.updateQuantity);
  const removeItem = usePosCartStore((s) => s.removeItem);
  const clearCart = usePosCartStore((s) => s.clearCart);
  const updateLensDetails = usePosCartStore((s) => s.updateLensDetails);

  // ✅ Cumul total des avances : réservations (props) + commandes verres (store)
  const alreadyPaidTotal = alreadyPaid + totalAdvancePaid;

  const [showConfirmDialog, setShowConfirmDialog] = React.useState(false);

  const onProcessSale = async (paymentData: {
    amountPaid: number;
    method: string;
    notes: string;
  }, intent: 'SALE' | 'RESERVATION') => {
    if (items.length === 0) {
      toast({
        title: 'Panier vide',
        description: 'Ajoutez au moins un produit.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    try {
      if (intent === 'RESERVATION') {
        if (!selectedClient?.id) {
          toast({
            title: 'Client requis',
            description: 'Veuillez sélectionner un client pour mettre de côté une réservation.',
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }

        const itemsToReserve = items.map((item) => ({
          productId: parseInt(item.productId.toString()), // Must be adapted if productId is a string LO-
          quantity: item.quantity,
        }));

        // Exclure les verres virtuels LO- des réservations (pas de stock de monture)
        const validItems = itemsToReserve.filter(it => !Number.isNaN(it.productId));

        if (validItems.length === 0) {
          toast({
            title: 'Aucun produit valide',
            description: 'Le panier ne contient aucun article physique (monture/accessoire) à réserver.',
            variant: 'destructive',
          });
          setIsProcessing(false);
          return;
        }

        const result = await createReservationFromCartAction({
          clientId: parseInt(selectedClient.id.toString()),
          clientName: selectedClient.name || `${selectedClient.prenom} ${selectedClient.nom}`,
          items: validItems,
          avanceAmount: paymentData.amountPaid,
          avance: alreadyPaid,
          notes: paymentData.notes,
          paymentMethod: paymentData.method,
        });

        if (result.success) {
          toast({
            title: '✅ Réservation créée',
            description: paymentData.amountPaid > 0 ? `Réservé avec une avance de ${paymentData.amountPaid} DH.` : 'Réservé avec succès (sans avance).',
            className: 'bg-emerald-600 text-white border-none',
          });
          clearCart();
          if (onSuccess) {
            onSuccess();
          } else {
            router.push(`/dashboard/ventes/reservations`); // Fallback if no onSuccess
          }
        } else {
          throw new Error('Erreur inconnue lors de la réservation');
        }
      } else {
        // Flux VENTE (Existant)
        const itemsToSave = items.map((item) => {
          const baseItem: any = {
            productRef: item.productId,
            productName: item.productName,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            tvaRate: 20,
            metadata: item.metadata,
          };

          if ((item as any).lensDetails) {
            baseItem.lensDetails = (item as any).lensDetails;
          }

          return baseItem;
        });

        const lensOrderIds = items
          .map((it) => (it as any).lensOrderId)
          .filter((id) => typeof id === 'number');

        const combinedReservationIds = [...new Set([
            ...reservationIds,
            ...items.filter(item => (item as any).fromReservation).map(item => (item as any).fromReservation as number)
        ])];

        const result = await createSale({
          clientId: selectedClient?.id ? selectedClient.id.toString() : undefined,
          items: itemsToSave,
          lensOrderIds,
          reservationIds: combinedReservationIds,
          paymentMethod: paymentData.method.toUpperCase(),
          notes: paymentData.notes,
          isDeclared: factureOfficielle,
          // ✅ amountPaid = uniqement ce qui est encaissé MAINTENANT (createSale va combiner avec l'historique des DB transactions)
          amountPaid: paymentData.amountPaid,
          factureOfficielle,
        });

        const saleId = (result as any)?.id;
        if (saleId) {
          if (combinedReservationIds.length > 0) {
              for (const resId of combinedReservationIds) {
                  await completeFrameReservation({
                      reservationId: resId,
                      saleId: parseInt(saleId),
                  });
              }
          }

          toast({
            title: '✅ Vente confirmée',
            description: 'Vente et Commande fournisseur générées avec succès.',
            className: 'bg-emerald-600 text-white border-none',
          });
          clearCart();

          if (onSuccess) {
            onSuccess(saleId);
          }
          
          // FIX 1: Dispatch event to refresh other POS components (catalog cache)
          window.dispatchEvent(new CustomEvent('sale-success', { detail: { saleId } }));
          return;
        }

        throw new Error((result as any)?.error || 'Réponse invalide du serveur');
      }
    } catch (error: any) {
      toast({
        title: '❌ Erreur',
        description: "Impossible de traiter l'opération. " + (error?.message || ''),
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className={cn("lg:sticky lg:top-4 shadow-sm border border-slate-200 rounded-xl overflow-hidden", className)}>
      <CardHeader className="bg-slate-50 border-b p-3 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <span>Panier Actuel</span>
            <Badge variant="secondary">{items.length} articles</Badge>
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="max-h-[350px] overflow-y-auto p-4 space-y-3 bg-white">
          {items.length === 0 ? (
            <div className="text-center py-8 text-slate-400">
              <ShoppingCart className="h-10 w-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Votre panier est vide</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.lineId}
                className="flex gap-2 p-3 bg-white rounded-xl border border-slate-100 shadow-sm group hover:border-blue-200 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate flex items-center gap-2">
                    {item.metadata?.isComplexPack
                      ? `Pack Verre : ${item.productName}`
                      : item.productName}
                    {(item as any).fromReservation && (
                        <Badge variant="outline" className="text-[8px] h-3.5 bg-orange-50 text-orange-600 border-orange-200">
                            RESERVÉ
                        </Badge>
                    )}
                    {/* ✅ Badge avance versée sur commande verre */}
                    {(item as any).advanceAlreadyPaid > 0 && (
                        <div className="mt-1 flex flex-wrap items-center gap-1.5">
                            <Badge variant="outline" className="text-[9px] h-4 bg-emerald-50 text-emerald-700 border-emerald-200 font-bold">
                                ✓ AVANCE: {Number((item as any).advanceAlreadyPaid).toFixed(2)} DH
                            </Badge>
                            <Badge variant="outline" className="text-[9px] h-4 bg-slate-50 text-slate-500 border-slate-200">
                                RESTE: {(item.unitPrice - (item as any).advanceAlreadyPaid).toFixed(2)} DH
                            </Badge>
                        </div>
                    )}

                  </div>

                  {item.metadata?.isComplexPack && (
                    <div className="flex items-center gap-2 mt-1">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Badge
                            variant="secondary"
                            className="text-[9px] h-4 px-1.5 bg-indigo-50 text-indigo-700 border-indigo-100 cursor-pointer hover:bg-indigo-100"
                          >
                            <Eye className="h-2.5 w-2.5 mr-1" />
                            Mesures
                          </Badge>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-3 rounded-2xl shadow-2xl border-indigo-100">
                          <div className="space-y-3">
                            <div className="flex items-center gap-2 border-b pb-2">
                              <Eye className="h-3 w-3 text-indigo-500" />
                              <span className="text-xs font-bold text-slate-700">
                                Détails de la Prescription
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-[10px]">
                              <div className="bg-blue-50/50 p-2 rounded-lg">
                                <p className="font-bold text-blue-800 mb-1 border-b border-blue-100">
                                  OD
                                </p>
                                <p>
                                  Sph: {item.metadata.prescription?.od?.sph || '0.00'}
                                </p>
                                <p>
                                  Cyl: {item.metadata.prescription?.od?.cyl || '0.00'}
                                </p>
                                <p>
                                  Axe: {item.metadata.prescription?.od?.axis || '0'}°
                                </p>
                              </div>
                              <div className="bg-emerald-50/50 p-2 rounded-lg">
                                <p className="font-bold text-emerald-800 mb-1 border-b border-emerald-100">
                                  OG
                                </p>
                                <p>
                                  Sph: {item.metadata.prescription?.og?.sph || '0.00'}
                                </p>
                                <p>
                                  Cyl: {item.metadata.prescription?.og?.cyl || '0.00'}
                                </p>
                                <p>
                                  Axe: {item.metadata.prescription?.og?.axis || '0'}°
                                </p>
                              </div>
                            </div>
                            <div className="pt-2 border-t flex justify-between">
                              <span className="text-[10px] text-slate-400">Fournisseur :</span>
                              <span className="text-[10px] font-bold text-slate-700">
                                {item.metadata.lensOrder?.supplierName || '---'}
                              </span>
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-1">
                    <div className="flex flex-col">
                      <p
                        className={cn(
                          'text-[11px]',
                          item.priceMode !== 'STANDARD'
                            ? 'text-slate-400 line-through'
                            : 'text-slate-500'
                        )}
                      >
                        {item.originalUnitPrice.toFixed(2)} × {item.quantity}
                      </p>
                      {item.priceMode !== 'STANDARD' && (
                        <p className="text-[11px] font-bold text-emerald-600">
                          {item.unitPrice.toFixed(2)} DH
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-bold">{item.lineTotal.toFixed(2)} DH</p>
                  </div>
                </div>

                <div className="flex flex-col gap-1 items-end pl-2">
                  <div className="flex items-center gap-1">
                    <DiscountDialog
                      lineId={item.lineId}
                      productName={item.productName}
                      originalPrice={item.originalUnitPrice}
                      currentPrice={item.unitPrice}
                      priceMode={item.priceMode}
                      discountPercent={item.discountPercent}
                      quantity={item.quantity}
                    />

                    {!item.metadata?.isComplexPack && (item as any).lensDetails && (
                      <LensDetailsDialog
                        productName={item.productName}
                        initialDetails={(item as any).lensDetails}
                        onSave={(details) => updateLensDetails(item.lineId, details)}
                      />
                    )}

                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 rounded-md hover:bg-slate-100"
                      onClick={() => updateQuantity(item.lineId, -1)}
                      aria-label="Diminuer la quantité"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="text-xs font-semibold w-4 text-center tabular-nums">
                      {item.quantity}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6 rounded-md hover:bg-slate-100"
                      onClick={() => updateQuantity(item.lineId, 1)}
                      aria-label="Augmenter la quantité"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                    onClick={() => removeItem(item.lineId)}
                    aria-label="Supprimer l'article"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-4 bg-white border-t border-b border-slate-100">
          <button
            type="button"
            onClick={() => {
              if (factureOfficielle) setShowConfirmDialog(true);
              else setFactureOfficielle(true);
            }}
            className={cn(
              'w-full text-left px-4 py-3 rounded-xl border-2 transition-all duration-300 shadow-sm flex items-center justify-between group focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2',
              factureOfficielle
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-300'
                : 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100 hover:border-orange-300'
            )}
            aria-label={factureOfficielle ? 'Désactiver la déclaration fiscale' : 'Activer la déclaration fiscale'}
          >
            <div className="flex items-center gap-3.5">
              <div
                className={cn(
                  'p-2.5 rounded-lg flex-shrink-0',
                  factureOfficielle
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'bg-orange-100 text-orange-600'
                )}
              >
                <Receipt size={22} className={factureOfficielle ? 'stroke-[2.5px]' : ''} />
              </div>
              <div className="flex flex-col">
                <p className="text-[15px] font-bold italic uppercase tracking-wide">
                  Facture Officielle
                </p>
                <p className={cn(
                  "text-[10px] font-medium italic mt-0.5 tracking-wider",
                  factureOfficielle ? "text-indigo-600/80" : "text-orange-600/80"
                )}>
                  {factureOfficielle
                    ? '• TVA 20% INCLUSE • DÉCLARATION FISCALE ACTIVE'
                    : '⚠️ HORS-BILAN • AUCUNE TRACE COMPTABLE'}
                </p>
              </div>
            </div>

            <div className="flex-shrink-0">
              <div
                className={cn(
                  'w-10 h-6 rounded-full transition-all duration-300 relative border-2',
                  factureOfficielle
                    ? 'bg-indigo-500 border-indigo-600'
                    : 'bg-orange-200 border-orange-300'
                )}
              >
                <span
                  className={cn(
                    'absolute top-[2px] w-4 h-4 rounded-full transition-all duration-300 shadow-sm',
                    factureOfficielle ? 'right-[2px] bg-white' : 'left-[2px] bg-orange-500'
                  )}
                />
              </div>
            </div>
          </button>
        </div>

        <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
          <AlertDialogContent className="rounded-3xl border-2 border-orange-100">
            <AlertDialogHeader>
              <div className="mx-auto w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mb-4">
                <AlertTriangle className="h-6 w-6 text-orange-600" />
              </div>
              <AlertDialogTitle className="text-center font-black text-slate-900 uppercase tracking-tight">
                ⚠️ Désactiver la Facture Officielle ?
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center text-slate-600">
                Si vous désactivez cette option, cette vente ne passera pas en comptabilité (Hors-Bilan). Êtes-vous sûr de vouloir continuer ?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-col sm:flex-row gap-2 mt-4">
              <AlertDialogCancel className="rounded-xl border-2 flex-1">
                Garder Officielle
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setFactureOfficielle(false);
                  setShowConfirmDialog(false);
                }}
                className="bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl flex-1 shadow-lg shadow-orange-200"
              >
                Oui, Hors-Bilan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Separator />

        <div className="p-4 bg-slate-50">
          <PaymentSection 
            total={total} 
            alreadyPaid={alreadyPaid}
            advanceFromLensOrders={totalAdvancePaid}
            onProcessSale={onProcessSale} 
            isProcessing={isProcessing} 
            defaultDeclared={factureOfficielle}
            disableReservation={!items.some(i => !Number.isNaN(parseInt(i.productId.toString())))} 
          />
        </div>
      </CardContent>
    </Card>
  );
}
