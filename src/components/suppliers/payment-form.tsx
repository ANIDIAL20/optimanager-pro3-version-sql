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
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { createSupplierPayment } from '@/app/actions/supplier-payments-actions';
import { getOrdersForPaymentSelect } from '@/app/actions/supplier-orders-actions';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { Loader2, AlertCircle } from 'lucide-react';
import { useSupplierBalance } from '@/hooks/use-supplier-balance';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const paymentSchema = z.object({
  supplierId: z.string(),
  amount: z.coerce.number().min(0.01, 'Le montant doit etre superieur a zero'),
  paymentDate: z.string(),
  method: z.enum(['Especes', 'Cheque', 'Virement', 'Traite', 'Carte']),
  orderId: z.string().nullable().optional(),
  reference: z.string().optional(),
  bankName: z.string().optional(),
  checkDueDate: z.string().optional(),
  notes: z.string().optional(),
}).refine((data) => {
  if (['Cheque', 'Virement', 'Traite'].includes(data.method) && !data.reference) {
    return false;
  }
  return true;
}, {
  message: 'Reference requise pour ce mode de paiement',
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

  const { data: unpaidOrders } = useQuery({
    queryKey: ['orders-for-payment', supplierId],
    queryFn: () => getOrdersForPaymentSelect(supplierId),
    enabled: !!supplierId,
    staleTime: 30_000,
  });

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    mode: 'onChange',
    defaultValues: {
      supplierId,
      amount: 0,
      paymentDate: new Date().toISOString().split('T')[0],
      method: 'Especes',
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
  const selectedOrder = unpaidOrders?.find((o: any) => o.id.toString() === selectedOrderId);

  async function onSubmit(values: PaymentFormValues) {
    setIsPending(true);
    try {
      const res: any = await createSupplierPayment({
        supplierId: values.supplierId,
        amount: values.amount,
        date: values.paymentDate,
        method: values.method,
        orderIds: values.orderId === 'none' || !values.orderId ? [] : [values.orderId],
        reference: values.reference,
        bank: values.bankName,
        notes: values.notes,
      });

      if (!res?.success) {
        toast.error(res?.error || "Erreur lors de l'enregistrement du paiement");
        return;
      }

      toast.success(res.message || 'Paiement enregistre avec succes');

      if (res?.unallocatedAmount > 0) {
        toast.warning(`Paiement global enregistre: ${Number(res.unallocatedAmount).toFixed(2)} MAD ne solde aucune commande individuellement.`);
      }

      queryClient.invalidateQueries({ queryKey: ['supplier-statement', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-balance', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['orders-for-payment', supplierId] });

      onSuccess?.();
      form.reset({
        supplierId,
        amount: 0,
        paymentDate: new Date().toISOString().split('T')[0],
        method: 'Especes',
        orderId: 'none',
        reference: '',
        bankName: '',
        checkDueDate: '',
        notes: '',
      });
    } catch (error: any) {
      console.error('Payment form error:', error);
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
                  <FormLabel>Montant verse</FormLabel>
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
                      <SelectItem value="Especes">Especes</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                      <SelectItem value="Virement">Virement</SelectItem>
                      <SelectItem value="Traite">Traite</SelectItem>
                      <SelectItem value="Carte">Carte bancaire</SelectItem>
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
                  <FormLabel>Lier a une commande (optionnel)</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'none'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir commande" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Aucune liaison (paiement global)</SelectItem>
                      {unpaidOrders?.map((order: any) => (
                        <SelectItem key={order.id} value={order.id.toString()}>
                          <div className="flex items-center gap-2">
                            <span className={order.paymentStatus === 'partial' ? 'text-orange-500' : 'text-red-500'}>
                              {order.paymentStatus === 'partial' ? 'Partial' : 'Open'}
                            </span>
                            <span>{order.reference}</span>
                            <span className="text-muted-foreground text-[10px]">
                              - Reste: {Number(order.remainingAmount).toLocaleString()} MAD
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

          {selectedOrderId === 'none' && inputAmount > 0 && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-900">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Paiement global</AlertTitle>
              <AlertDescription>
                Ce paiement reduira le solde global du fournisseur ({Number(balanceData?.balance || 0).toFixed(2)} MAD) mais ne sera affecte a aucune commande en particulier.
              </AlertDescription>
            </Alert>
          )}

          {selectedOrder && (
            <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 space-y-3 animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-center">
                <p className="font-semibold text-blue-800 text-sm">{selectedOrder.reference}</p>
                <span className="text-[10px] px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-medium">
                  {selectedOrder.paymentStatus === 'partial' ? 'Paiement partiel' : 'Non payee'}
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div>
                  <p className="text-muted-foreground mb-0.5">Total commande</p>
                  <p className="font-bold">{Number(selectedOrder.totalAmount).toLocaleString()} MAD</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Déjà versé</p>
                  <p className="font-bold text-green-600">{Number(selectedOrder.amountPaid).toLocaleString()} MAD</p>
                  {Number(selectedOrder.totalCreditsApplied) > 0 && (
                    <p className="text-[9px] text-indigo-600 font-medium whitespace-nowrap">
                      (dont {Number(selectedOrder.totalCreditsApplied).toLocaleString()} MAD d'avoirs)
                    </p>
                  )}
                </div>
                <div>
                  <p className="text-muted-foreground mb-0.5">Reste à payer</p>
                  <p className="font-bold text-red-600">{Number(selectedOrder.remainingAmount).toLocaleString()} MAD</p>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-green-500 h-full rounded-full transition-all duration-500"
                    style={{ width: `${(Number(selectedOrder.amountPaid) / Math.max(Number(selectedOrder.totalAmount), 1)) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>Progression: {((Number(selectedOrder.amountPaid) / Math.max(Number(selectedOrder.totalAmount), 1)) * 100).toFixed(0)}%</span>
                  {inputAmount > 0 && (
                    <span className="text-blue-600 font-medium">
                      + {((inputAmount / Math.max(Number(selectedOrder.totalAmount), 1)) * 100).toFixed(0)}% apres ce paiement
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {['Cheque', 'Virement', 'Traite'].includes(selectedMethod) && (
            <div className="grid grid-cols-2 gap-4 border p-4 rounded-md bg-muted/30">
              <FormField
                control={form.control}
                name="reference"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>No reference / cheque</FormLabel>
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

              {selectedMethod === 'Cheque' && (
                <FormField
                  control={form.control}
                  name="checkDueDate"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Date d'echeance du cheque</FormLabel>
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
                  <Textarea placeholder="Details supplementaires..." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Reinitialiser
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