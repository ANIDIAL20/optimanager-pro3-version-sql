'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { PackageCheck, AlertCircle } from 'lucide-react';
import { receiveLensOrder } from '@/app/actions/lens-orders-actions';
import { useToast } from '@/hooks/use-toast';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BrandLoader } from '@/components/ui/loader-brand';

const ReceiveOrderSchema = z.object({
  blRef: z.string().min(1, 'La référence du BL est requise'),
  finalCost: z.number().min(0, 'Le prix d\'achat doit être positif'),
});

type ReceiveOrderFormValues = z.infer<typeof ReceiveOrderSchema>;

import { type LensOrder } from '@/app/actions/lens-orders-actions';

interface ReceiveOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: LensOrder | null;
  onSuccess?: () => void;
}

export function ReceiveOrderDialog({ 
  open, 
  onOpenChange, 
  order, 
  onSuccess 
}: ReceiveOrderDialogProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<ReceiveOrderFormValues>({
    resolver: zodResolver(ReceiveOrderSchema),
    defaultValues: {
      blRef: '',
      finalCost: order?.estimatedBuyingPrice ? parseFloat(order.estimatedBuyingPrice) : 0,
    },
  });

  // Reset form when order changes
  React.useEffect(() => {
    if (open && order) {
      form.reset({
        blRef: '',
        finalCost: order.estimatedBuyingPrice ? parseFloat(order.estimatedBuyingPrice) : 0,
      });
    }
  }, [open, order, form]);

  const onSubmit = async (data: ReceiveOrderFormValues) => {
    if (!order) return;
    
    setIsSubmitting(true);
    try {
      const result = await receiveLensOrder(order.id.toString(), {
        blRef: data.blRef,
        finalCost: data.finalCost
      });

      if (result.success) {
        onOpenChange(false);
        if (onSuccess) onSuccess();
        
        // Calculate margin for toast
        const sellingPrice = parseFloat(order.sellingPrice || order.totalPrice) / (order.quantity || 1); 
        // Note: sellingPrice in DB is Unit Selling Price. Total is calculated. 
        // Let's use order.sellingPrice if available (new schema), else total/qty
        
        // Wait, order object coming from list might be old type.
        // Assuming updated list query includes sellingPrice.
        
        // If result.data returns the updated order, we can use that margin.
        const margin = result.data?.finalMargin 
            ? parseFloat(result.data.finalMargin) 
            : (parseFloat(order.sellingPrice) - data.finalCost);

        toast({
          title: 'Réception validée ! 🎉',
          description: `Commande reçue et achat enregistré. Marge réalisée : ${margin.toFixed(2)} DH`,
          className: "bg-green-50 border-green-200 text-green-900"
        });
      } else {
        toast({
          variant: "destructive",
          title: "Erreur",
          description: result.error || "Impossible de réceptionner la commande."
        });
      }
    } catch (error) {
       toast({
          variant: "destructive",
          title: "Erreur",
          description: "Une erreur est survenue."
        });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
      <DialogContent 
        className="sm:max-w-[480px] border-none shadow-2xl p-0 overflow-hidden bg-gradient-to-br from-orange-50 via-white to-amber-50"
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onCloseAutoFocus={(e) => {
          e.preventDefault();
          document.body.style.pointerEvents = 'auto';
        }}
      >
        {/* Decorative Header Background */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-600 opacity-90" />
        <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-orange-300/30 to-transparent rounded-full blur-3xl" />
        
        <DialogHeader className="relative z-10 p-6 pb-4 space-y-3">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-white rounded-2xl shadow-lg">
              <PackageCheck className="h-7 w-7 text-orange-600" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold text-white drop-shadow-md">
                Réception Commande
              </DialogTitle>
              <DialogDescription className="text-orange-100 mt-1.5 text-sm font-medium">
                Validation de livraison pour <span className="font-bold text-white">{order.client?.fullName || 'Client'}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="relative z-10 px-6 pb-6 space-y-5">
          {/* Order Summary Card */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/80 backdrop-blur-sm p-4 rounded-xl border-2 border-slate-200/60 shadow-sm">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  Type de verre
                </div>
                <div className="font-bold text-slate-900">{order.lensType}</div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 2a4 4 0 00-4 4v1H5a1 1 0 00-.994.89l-1 9A1 1 0 004 18h12a1 1 0 00.994-1.11l-1-9A1 1 0 0015 7h-1V6a4 4 0 00-4-4zm2 5V6a2 2 0 10-4 0v1h4zm-6 3a1 1 0 112 0 1 1 0 01-2 0zm7-1a1 1 0 100 2 1 1 0 000-2z" clipRule="evenodd" />
                  </svg>
                  Fournisseur
                </div>
                <div className="font-bold text-slate-900">{order.supplierName}</div>
              </div>
              <div className="col-span-2 pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs font-medium">
                    <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                    Prix Vente Client
                  </div>
                  <div className="font-bold text-lg text-green-700 bg-green-100 px-3 py-1 rounded-lg">
                    {parseFloat(order.sellingPrice).toFixed(2)} DH
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              
              <FormField
                control={form.control}
                name="blRef"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-slate-800 font-semibold">
                      <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      N° Bon de Livraison (BL) *
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Input 
                          placeholder="Ex: BL-2024-001" 
                          {...field} 
                          className="h-11 pl-4 pr-4 border-2 border-slate-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-200 transition-all group-hover:border-slate-300"
                        />
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="finalCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2 text-slate-800 font-semibold">
                      <svg className="w-4 h-4 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                      </svg>
                      Prix d'Achat Final (TTC) *
                    </FormLabel>
                    <FormControl>
                      <div className="relative group">
                        <Input 
                          type="number" 
                          step="0.01"
                          {...field}
                          value={isNaN(field.value) ? '' : field.value}
                          onChange={e => {
                            const val = parseFloat(e.target.value);
                            field.onChange(isNaN(val) ? 0 : val);
                          }}
                          className="h-12 pl-4 pr-16 text-lg font-semibold border-2 border-amber-200 bg-amber-50/30 focus:border-amber-400 focus:ring-2 focus:ring-amber-200 transition-all group-hover:border-amber-300"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-amber-700 bg-amber-200 px-2.5 py-1 rounded-md shadow-sm">DH</span>
                      </div>
                    </FormControl>
                    <FormDescription className="flex items-center gap-1.5 text-amber-700 text-xs">
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      {order.estimatedBuyingPrice 
                        ? `Estimation initiale : ${parseFloat(order.estimatedBuyingPrice).toFixed(2)} DH`
                        : 'Saisissez le montant exact figurant sur le BL'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Live Margin Preview - PREMIUM */}
              {(() => {
                const finalCost = form.watch('finalCost');
                const sellingPrice = parseFloat(order.sellingPrice);
                if (finalCost && sellingPrice) {
                  const margin = sellingPrice - finalCost;
                  const marginRate = (margin / sellingPrice) * 100;
                  
                  let bgGradient = 'from-red-500 to-rose-600';
                  let textColor = 'text-red-900';
                  let borderColor = 'border-red-300';
                  let status = 'Marge négative';
                  let icon = (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  );
                  
                  if (margin >= 0) {
                    if (marginRate >= 30) {
                      bgGradient = 'from-emerald-500 to-teal-600';
                      textColor = 'text-emerald-900';
                      borderColor = 'border-emerald-300';
                      status = 'Excellente marge !';
                      icon = (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      );
                    } else if (marginRate >= 15) {
                      bgGradient = 'from-yellow-400 to-amber-500';
                      textColor = 'text-yellow-900';
                      borderColor = 'border-yellow-300';
                      status = 'Marge correcte';
                      icon = (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      );
                    } else {
                      bgGradient = 'from-orange-400 to-amber-500';
                      textColor = 'text-orange-900';
                      borderColor = 'border-orange-300';
                      status = 'Marge faible';
                      icon = (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      );
                    }
                  }
                  
                  return (
                    <div className={`overflow-hidden rounded-xl border-2 ${borderColor} bg-white/70 backdrop-blur-md shadow-lg`}>
                      <div className={`bg-gradient-to-r ${bgGradient} opacity-5 absolute inset-0`} />
                      <div className="relative p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 bg-gradient-to-br ${bgGradient} rounded-xl shadow-md`}>
                            <div className="text-white">
                              {icon}
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-slate-600">{status}</p>
                            <p className={`text-sm font-bold ${textColor}`}>Marge Réelle</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-2xl font-bold ${textColor}`}>
                            {margin.toFixed(2)} <span className="text-base">DH</span>
                          </p>
                          <p className={`text-xs font-semibold ${textColor} opacity-75`}>
                            {marginRate.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}

              <DialogFooter className="gap-2 pt-4 border-t border-slate-200">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="h-11 border-2 hover:bg-slate-100"
                >
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Annuler
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting} 
                  className="h-11 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold shadow-lg shadow-orange-200 transition-all duration-200"
                >
                  {isSubmitting ? (
                    <>
                      <BrandLoader size="sm" className="mr-2" />
                      Validation...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      Valider la Réception
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
