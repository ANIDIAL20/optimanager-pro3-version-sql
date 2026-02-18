'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage,
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createSupplierPayment } from '@/app/actions/supplier-payments';
import { getOrdersForPaymentSelect } from '@/app/actions/supplier-orders';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import { useSupplierStatement } from '@/hooks/use-supplier-statement';
import { useSupplierBalance } from '@/hooks/use-supplier-balance';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const paymentSchema = z.object({
  supplierId: z.string(),
  amount: z.coerce.number().min(0.01, 'Le montant doit être supérieur à zéro'),
  paymentDate: z.string(), // ✅ Back to string for HTML date input compatibility
  method: z.enum(['Espèces', 'Chèque', 'Virement', 'Traite', 'Carte']),
  orderId: z.string().nullable().optional(),
  reference: z.string().optional(),
  bankName: z.string().optional(),
  checkDueDate: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (['Chèque', 'Virement', 'Traite'].includes(data.method) && !data.reference) {
    return false;
  }
  return true;
}, {
  message: 'Référence requise pour ce mode de paiement',
  path: ['reference'],
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface PaymentFormProps {
  supplierId: string;
  onSuccess?: () => void;
}

export function SupplierPaymentForm({ supplierId, onSuccess }: PaymentFormProps) {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = React.useState(false);
  const { data: balanceData } = useSupplierBalance(supplierId);
  
  // Fetch unpaid orders for selection
  const { data: unpaidOrders } = useQuery({
    queryKey: ['orders-for-payment', supplierId],
    queryFn: async () => {
      console.log('📡 [PaymentForm] Requesting orders for supplier:', supplierId);
      return getOrdersForPaymentSelect(supplierId);
    },
    enabled: !!supplierId,
  });

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    mode: 'onChange',
    defaultValues: {
      supplierId: supplierId,
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0], // ✅ ISO String for <input type="date">
      method: 'Espèces',
      orderId: 'none',
      reference: '',
      bankName: '',
      checkDueDate: '',
      notes: '',
    },
  });

  const selectedMethod = form.watch('method');
  const inputAmount = Number(form.watch('amount') || 0);
  const selectedOrderId = form.watch('orderId');

  // Find selected order details
  const selectedOrder = unpaidOrders?.find((o: any) => o.id.toString() === selectedOrderId);

  async function onSubmit(values: PaymentFormValues) {
    console.log('🚀 [onSubmit] CALLED with:', values);

    setIsPending(true);
    try {
      const res: any = await createSupplierPayment({
        supplierId: values.supplierId,
        amount: values.amount,
        paymentDate: values.paymentDate, // Already a string
        method: values.method,
        orderId: (values.orderId === 'none' || !values.orderId) ? null : values.orderId,
        reference: values.reference,
        bankName: values.bankName,
        notes: values.notes,
      });
      
      toast.success(res.message || 'Paiement enregistré avec succès');
      queryClient.invalidateQueries({ queryKey: ['supplier-statement', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-balance', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['orders-for-payment', supplierId] });
      
      if (onSuccess) onSuccess();
      form.reset();
    } catch (error: any) {
      console.error('❌ [onSubmit] Error:', error);
      toast.error(error.message || "Erreur lors de l'enregistrement du paiement");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Montant versé</FormLabel>
                   <FormControl>
                    <Input type="number" step="0.01" placeholder="0.00" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="paymentDate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date de paiement</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="method"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mode de paiement</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir mode" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Espèces">Espèces</SelectItem>
                      <SelectItem value="Chèque">Chèque</SelectItem>
                      <SelectItem value="Virement">Virement</SelectItem>
                      <SelectItem value="Traite">Traite</SelectItem>
                      <SelectItem value="Carte">Carte Bancaire</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="orderId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lier à une commande (Optionnel)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'none'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir commande" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">💰 Aucune liaison (déduit du solde global)</SelectItem>
                      {unpaidOrders?.map((order: any) => (
                        <SelectItem key={order.id} value={order.id.toString()}>
                          <div className="flex items-center gap-2">
                             <span className={order.paymentStatus === 'partial' ? 'text-orange-500' : 'text-red-500'}>
                              {order.paymentStatus === 'partial' ? '🔶' : '❌'}
                            </span>
                            <span>{order.reference}</span>
                            <span className="text-muted-foreground text-[10px]">
                              — Reste: {Number(order.remainingAmount).toLocaleString()} MAD
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Smart Info Box with Progress Bar */}
          {selectedOrder && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-blue-800 text-sm">📋 {selectedOrder.reference}</p>
                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {selectedOrder.paymentStatus === 'partial' ? 'Paiement Partiel' : 'Non Payée'}
                </span>
              </div>
              
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                 <div>
                  <p className="text-muted-foreground mb-0.5">Total Commande</p>
                  <p className="font-bold">{Number(selectedOrder.totalAmount).toLocaleString()} MAD</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Déjà Versé</p>
                  <p className="font-bold text-green-600">{Number(selectedOrder.amountPaid).toLocaleString()} MAD</p>
                </div>
                <div>
                   <p className="text-muted-foreground mb-0.5">Reste à Payer</p>
                  <p className="font-bold text-red-600">{Number(selectedOrder.remainingAmount).toLocaleString()} MAD</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-green-500 h-full rounded-full transition-all duration-500" 
                    style={{ width: `${(Number(selectedOrder.amountPaid) / Number(selectedOrder.totalAmount)) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Progress: {((Number(selectedOrder.amountPaid) / Number(selectedOrder.totalAmount)) * 100).toFixed(0)}%</span>
                  {inputAmount > 0 && (
                     <span className="text-blue-600 font-medium">
                       + {((inputAmount / Number(selectedOrder.totalAmount)) * 100).toFixed(0)}% après ce paiement
                     </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {['Chèque', 'Virement', 'Traite'].includes(selectedMethod) && (
            <div className="grid grid-cols-2 gap-4 border p-4 rounded-md bg-muted/30">
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>N° Référence / Chèque</FormLabel>
                    <FormControl>
                      <Input placeholder="12345678" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="bankName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom de la banque</FormLabel>
                    <FormControl>
                      <Input placeholder="CIH, BMCE..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {selectedMethod === 'Chèque' && (
                <FormField
                  control={form.control}
                  name="checkDueDate"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Date d'échéance du chèque</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>
          )}

          <FormField
            control={form.control}
            name="notes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Notes</FormLabel>
                <FormControl>
                  <Textarea placeholder="Détails supplémentaires..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Réinitialiser
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer le paiement
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
