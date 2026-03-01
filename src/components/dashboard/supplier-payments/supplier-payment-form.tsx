'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash2, Save, FileText, CheckCircle, Wallet } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { UnifiedLoader } from '@/components/ui/unified-loader';
import { SensitiveData } from '@/components/ui/sensitive-data';

import { createSupplierPayment } from '@/app/actions/supplier-payments-actions';
import { getSuppliersList } from '@/app/actions/supplier-actions';
import { getSupplierOrders } from '@/app/actions/supplier-orders-actions';

// Schema
const paymentSchema = z.object({
  supplierId: z.string().min(1, "Fournisseur requis"),
  amount: z.number().min(0.01, "Montant requis"),
  method: z.string().min(1, "Mode de paiement requis"),
  date: z.date(),
  reference: z.string().optional(),
  bank: z.string().optional(),
  notes: z.string().optional(),
  allocations: z.array(z.object({
    orderId: z.number(),
    amount: z.number(),
    orderRef: z.string().optional(),
    maxAmount: z.number().optional()
  })).optional()
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

export function SupplierPaymentForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = React.useState<any[]>([]);
  const [unpaidOrders, setUnpaidOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      date: new Date(),
      amount: 0,
      method: 'Virement',
      allocations: []
    },
  });

  const supplierId = form.watch('supplierId');
  const totalAmount = form.watch('amount');
  const allocations = form.watch('allocations') || [];

  // Load Suppliers
  React.useEffect(() => {
    async function loadData() {
      const result = await getSuppliersList();
      if (Array.isArray(result)) {
        setSuppliers(result);
      }
      setLoading(false);
    }
    loadData();
  }, []);

  // Load Unpaid Orders when Supplier Changes
  React.useEffect(() => {
    async function loadOrders() {
      if (!supplierId) return;
      
      const res = await getSupplierOrders();
      if (res.success && res.orders) {
        // Filter for this supplier AND unpaid/partial
        const filtered = res.orders.filter(o => 
            (o.supplierId === supplierId || o.supplierName === suppliers.find((s: { id: string; nomCommercial: string }) => s.id === supplierId)?.nomCommercial) &&
            (o.status === 'impaye' || o.status === 'partiel')
        );
        
        setUnpaidOrders(filtered);
        
        // Reset allocations
        form.setValue('allocations', []);
      }
    }
    loadOrders();
  }, [supplierId, suppliers, form]);

  // Auto-allocate logic
  const handleAutoAllocate = () => {
    let remaining = totalAmount;
    const newAllocations: any[] = [];
    
    // Sort oldest first
    const sortedOrders = [...unpaidOrders].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    for (const order of sortedOrders) {
        if (remaining <= 0) break;
        
        const debt = order.totalAmount - order.amountPaid;
        const allocate = Math.min(remaining, debt);
        
        if (allocate > 0) {
            newAllocations.push({
                orderId: parseInt(order.id),
                amount: allocate,
                orderRef: order.orderReference || `#${order.id}`,
                maxAmount: debt
            });
            remaining -= allocate;
        }
    }
    
    form.setValue('allocations', newAllocations);
  };

  const onSubmit = async (data: PaymentFormValues) => {
    setIsSubmitting(true);
    try {
      const result = await createSupplierPayment({
          ...data,
          date: data.date.toISOString(),
      });

      if (result.success) {
        toast({
          title: "Succès",
          description: "Paiement enregistré avec succès",
          className: "bg-green-600 text-white border-none",
        });
        router.push('/dashboard/supplier-payments');
      } else {
        throw new Error((result as any).error);
      }
    } catch (error: any) {
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <UnifiedLoader />;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Left: Payment Info */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Wallet className="h-5 w-5 text-primary" />
                        Détails du Paiement
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                     <FormField
                        control={form.control}
                        name="supplierId"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Fournisseur</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                                <SelectTrigger>
                                <SelectValue placeholder="Choisir un fournisseur" />
                                </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                                {suppliers.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                    {s.nomCommercial}
                                </SelectItem>
                                ))}
                            </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Montant (DH)</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="number" 
                                        step="0.01" 
                                        {...field}
                                        onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="method"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mode</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="Espèces">Espèces</SelectItem>
                                    <SelectItem value="Chèque">Chèque</SelectItem>
                                    <SelectItem value="Virement">Virement</SelectItem>
                                    <SelectItem value="Traite">Traite</SelectItem>
                                </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="date"
                        render={({ field }) => (
                        <FormItem className="flex flex-col">
                            <FormLabel>Date</FormLabel>
                            <Popover modal={false}>
                            <PopoverTrigger asChild>
                                <FormControl>
                                <Button
                                    variant={"outline"}
                                    className={cn(
                                    "pl-3 text-left font-normal",
                                    !field.value && "text-muted-foreground"
                                    )}
                                >
                                    {field.value ? (
                                    format(field.value, "PPP", { locale: fr })
                                    ) : (
                                    <span>Choisir une date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                </Button>
                                </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                initialFocus
                                />
                            </PopoverContent>
                            </Popover>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                     <FormField
                        control={form.control}
                        name="reference"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Référence (N° Chèque/Virement)</FormLabel>
                            <FormControl>
                                <Input placeholder="Optionnel" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    
                     <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Note</FormLabel>
                            <FormControl>
                                <Input placeholder="Optionnel" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                </CardContent>
            </Card>

            {/* Right: Allocation */}
            <Card className="shadow-sm border-slate-200 bg-slate-50/50">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-base text-slate-700">Affectation aux Commandes</CardTitle>
                    {unpaidOrders.length > 0 && totalAmount > 0 && (
                        <Button type="button" variant="outline" size="sm" onClick={handleAutoAllocate}>
                            Affectation Auto
                        </Button>
                    )}
                </CardHeader>
                <CardContent>
                    {unpaidOrders.length === 0 ? (
                        <div className="text-center py-8 text-slate-500">
                            Aucune commande impayée pour ce fournisseur.
                        </div>
                    ) : (
                        <div className="space-y-4">
                             <div className="flex justify-between text-sm font-medium text-slate-500 pb-2 border-b">
                                <span>Commande</span>
                                <span>Reste à Payer</span>
                                <span>Montant Affecté</span>
                             </div>
                             {unpaidOrders.map(order => {
                                 const debt = order.totalAmount - order.amountPaid;
                                 const currentAlloc = allocations.find(a => a.orderId === parseInt(order.id))?.amount || 0;
                                 
                                 return (
                                     <div key={order.id} className="flex items-center justify-between gap-4 py-2">
                                         <div className="flex-1">
                                             <div className="font-medium text-sm">
                                                 {order.orderReference || `Cmd #${order.id}`}
                                             </div>
                                             <div className="text-xs text-slate-500">
                                                 {format(new Date(order.date), 'dd/MM/yyyy')}
                                             </div>
                                         </div>
                                         <div className="text-red-600 font-medium text-sm w-24 text-right">
                                             <SensitiveData value={debt} type="currency" />
                                         </div>
                                         <div className="w-32">
                                             <Input 
                                                type="number"
                                                className="h-8 text-right bg-white"
                                                value={currentAlloc || ''}
                                                max={debt}
                                                onChange={e => {
                                                    const val = Math.min(parseFloat(e.target.value) || 0, debt);
                                                    const existing = allocations.filter(a => a.orderId !== parseInt(order.id));
                                                    if (val > 0) {
                                                        form.setValue('allocations', [...existing, {
                                                            orderId: parseInt(order.id),
                                                            amount: val,
                                                            orderRef: order.orderReference,
                                                            maxAmount: debt
                                                        }]);
                                                    } else {
                                                        form.setValue('allocations', existing);
                                                    }
                                                }}
                                             />
                                         </div>
                                     </div>
                                 );
                             })}
                             
                             <Separator className="my-4" />
                             
                             <div className="flex justify-between items-center font-bold">
                                 <span>Total Affecté</span>
                                 <span className={cn(
                                     allocations.reduce((sum, a) => sum + a.amount, 0) > totalAmount ? "text-red-600" : "text-green-600"
                                 )}>
                                     <SensitiveData value={allocations.reduce((sum, a) => sum + a.amount, 0)} type="currency" />
                                     {' / '}
                                     <SensitiveData value={totalAmount} type="currency" />
                                 </span>
                             </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>

        <div className="flex justify-end gap-3 sticky bottom-4">
             <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
             >
                 Annuler
             </Button>
             <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white min-w-[150px]"
                disabled={isSubmitting}
             >
                {isSubmitting ? <UnifiedLoader className="mr-2 text-white" /> : <Save className="mr-2 h-4 w-4" />}
                Enregistrer Paiement
             </Button>
        </div>
      </form>
    </Form>
  );
}
