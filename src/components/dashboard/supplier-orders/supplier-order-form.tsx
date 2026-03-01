'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarIcon, Plus, Trash2, Save, FileText, Truck, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { UnifiedLoader } from '@/components/ui/unified-loader';
import { SensitiveData } from '@/components/ui/sensitive-data';

import { createSupplierOrder } from '@/app/actions/supplier-orders-actions';
import { getSuppliersList } from '@/app/actions/supplier-actions';

// Schema
const orderSchema = z.object({
  supplierId: z.string().min(1, "Fournisseur requis"),
  date: z.date(),
  orderReference: z.string().optional(),
  notes: z.string().optional(), // Changed 'note' to 'notes'
  items: z.array(z.object({
    type: z.enum(['monture', 'verre', 'lentille', 'divers']),
    nomProduit: z.string().min(1, "Nom requis"),
    quantity: z.number().min(1),
    unitPrice: z.number().min(0),
    reference: z.string().optional(),
    description: z.string().optional(),
  })).min(1, "Au moins un article requis"),
  shippingCost: z.number().optional().default(0),
  discount: z.number().optional().default(0),
  tva: z.number().optional().default(0),
}).refine(data => {
    const subTotal = data.items.reduce((acc, item) => acc + (item.quantity * item.unitPrice), 0);
    return data.discount <= subTotal;
}, {
    message: "La remise ne peut pas dépasser le sous-total HT",
    path: ["discount"],
});

type OrderFormValues = z.infer<typeof orderSchema>;

export function SupplierOrderForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [suppliers, setSuppliers] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      date: new Date(),
      items: [{ type: 'monture', nomProduit: '', quantity: 1, unitPrice: 0 }],
      shippingCost: 0,
      discount: 0,
      tva: 0,
      notes: '', // Added 'notes' to defaultValues
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

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

  // Calculations
  const items = form.watch('items');
  const discount = form.watch('discount') || 0;
  const shipping = form.watch('shippingCost') || 0;
  const tva = form.watch('tva') || 0;

  // Calculate total from items
  const subTotal = items.reduce((acc, item) => acc + (Number(item.quantity) * Number(item.unitPrice)), 0);

  // Standard logic: Net = SubTotal - Discount; TVA = Net * 20%; Total = Net + TVA + Shipping
  const netHT = Math.max(0, subTotal - discount);
  
  React.useEffect(() => {
      const calculatedTva = netHT * 0.20;
      form.setValue('tva', parseFloat(calculatedTva.toFixed(2)));
  }, [subTotal, discount, form]); // depends on netHT which depends on subTotal & discount

  const total = netHT + tva + shipping;

  // Submit Handler
  const onSubmit = async (data: OrderFormValues) => {
    setIsSubmitting(true);
    try {
      const supplier = suppliers.find(s => s.id === data.supplierId);
      
      const payload = {
        ...data,
        supplierName: supplier?.nomCommercial || 'Inconnu',
        subTotal,
        tva,
        totalAmount: total,
        amountPaid: 0, // Default to unpaid
      };

      const result = await createSupplierOrder(payload);

      if (result.success) {
        toast({
          title: "Succès",
          description: "Bon de commande créé avec succès",
          variant: "default",
          className: "bg-green-600 text-white border-none",
        });
        router.push('/dashboard/supplier-orders');
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
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-6">
          <Card className="flex-1 shadow-sm border-slate-200">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                <Truck className="h-5 w-5 text-primary" />
                Informations Fournisseur
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4">
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fournisseur</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="bg-slate-50 border-slate-200 h-11">
                          <SelectValue placeholder="Sélectionner un fournisseur" />
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date de Commande</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "h-11 pl-3 text-left font-normal bg-slate-50 border-slate-200",
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
                            disabled={(date) =>
                              date > new Date() || date < new Date("1900-01-01")
                            }
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
                  name="orderReference"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>N° Bon de Commande (Optionnel)</FormLabel>
                      <FormControl>
                        <Input placeholder="ex: BC-2024-001" className="h-11 bg-slate-50 border-slate-200" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="w-full md:w-80 shadow-sm border-slate-200 bg-slate-50/50">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                <FileText className="h-5 w-5 text-slate-500" />
                Détails Financiers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Sous-total HT</span>
                <span className="font-medium"><SensitiveData value={subTotal} type="currency" /></span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Sous-total HT</span>
                <span className="font-medium"><SensitiveData value={subTotal} type="currency" /></span>
              </div>
              
               <FormField
                  control={form.control}
                  name="tva"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-y-0">
                      <FormLabel className="text-sm font-normal text-slate-500">TVA (Auto 20%)</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            className="w-24 h-9 text-right bg-white" 
                            {...field}
                            onChange={e => {
                                const val = parseFloat(e.target.value);
                                field.onChange(isNaN(val) ? 0 : val);
                            }}
                        />
                      </FormControl>
                    </FormItem>
                  )}
              />
              
              <Separator />
              
              <FormField
                  control={form.control}
                  name="discount"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-y-0">
                      <FormLabel className="text-sm font-normal text-slate-500">Remise (DH)</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            className="w-24 h-9 text-right bg-white" 
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
              />

              <FormField
                  control={form.control}
                  name="shippingCost"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between space-y-0">
                      <FormLabel className="text-sm font-normal text-slate-500">Livraison</FormLabel>
                      <FormControl>
                        <Input 
                            type="number" 
                            className="w-24 h-9 text-right bg-white" 
                            {...field}
                            onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                        />
                      </FormControl>
                    </FormItem>
                  )}
              />

              <Separator className="bg-slate-300" />

              <div className="flex justify-between items-center">
                <span className="text-base font-bold text-slate-900">Total TTC</span>
                <span className="text-xl font-bold text-primary">
                    <SensitiveData value={total} type="currency" />
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Items Section */}
        <Card className="shadow-sm border-slate-200 overflow-hidden">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold text-slate-800">Articles Commandés</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => append({ type: 'monture', nomProduit: '', quantity: 1, unitPrice: 0 })}
              className="bg-white hover:bg-slate-50 text-primary border-primary/20 hover:border-primary/50"
            >
              <Plus className="h-4 w-4 mr-2" />
              Ajouter un article
            </Button>
          </CardHeader>
          <div className="p-0">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-500 font-medium">
                <tr>
                  <th className="px-4 py-3 w-[150px]">Type</th>
                  <th className="px-4 py-3">Produit / Référence</th>
                  <th className="px-4 py-3 w-[100px] text-center">Qté</th>
                  <th className="px-4 py-3 w-[120px] text-right">P.U (HT)</th>
                  <th className="px-4 py-3 w-[120px] text-right">Total</th>
                  <th className="px-4 py-3 w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fields.map((field, index) => (
                  <tr key={field.id} className="group hover:bg-slate-50/50">
                    <td className="px-4 py-2 align-top pt-3">
                         <FormField
                            control={form.control}
                            name={`items.${index}.type`}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-9 border-slate-200">
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="monture">Monture</SelectItem>
                                        <SelectItem value="verre">Verre</SelectItem>
                                        <SelectItem value="lentille">Lentille</SelectItem>
                                        <SelectItem value="divers">Divers</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </td>
                    <td className="px-4 py-2 align-top pt-3 space-y-2">
                        <FormField
                            control={form.control}
                            name={`items.${index}.nomProduit`}
                            render={({ field }) => (
                                <Input placeholder="Nom du produit" className="h-9 border-slate-200" {...field} />
                            )}
                        />
                         <FormField
                            control={form.control}
                            name={`items.${index}.reference`}
                            render={({ field }) => (
                                <Input placeholder="Référence (optionnel)" className="h-8 text-xs border-transparent bg-slate-100 focus:bg-white focus:border-slate-300 placeholder:text-slate-400" {...field} />
                            )}
                        />
                    </td>
                    <td className="px-4 py-2 align-top pt-3">
                        <FormField
                            control={form.control}
                            name={`items.${index}.quantity`}
                            render={({ field }) => (
                                <Input 
                                    type="number" 
                                    min="1" 
                                    className="h-9 text-center border-slate-200" 
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 1)}
                                />
                            )}
                        />
                    </td>
                    <td className="px-4 py-2 align-top pt-3">
                        <FormField
                            control={form.control}
                            name={`items.${index}.unitPrice`}
                            render={({ field }) => (
                                <Input 
                                    type="number" 
                                    min="0" 
                                    step="0.01" 
                                    className="h-9 text-right border-slate-200" 
                                    {...field}
                                    onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                />
                            )}
                        />
                    </td>
                    <td className="px-4 py-2 align-top pt-3 text-right font-medium text-slate-700">
                        <SensitiveData 
                            value={(form.watch(`items.${index}.quantity`) || 0) * (form.watch(`items.${index}.unitPrice`) || 0)} 
                            type="currency" 
                        />
                    </td>
                    <td className="px-4 py-2 align-top pt-3 text-center">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50"
                            onClick={() => remove(index)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Footer */}
        <div className="flex justify-end gap-3 sticky bottom-4 z-10">
            <Button
                type="button"
                variant="outline"
                className="bg-white shadow-sm"
                onClick={() => router.back()}
            >
                Annuler
            </Button>
            <Button
                type="submit"
                className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 min-w-[150px]"
                disabled={isSubmitting}
            >
                {isSubmitting ? (
                    <UnifiedLoader className="mr-2 text-white" />
                ) : (
                    <Save className="h-4 w-4 mr-2" />
                )}
                Enregistrer la Commande
            </Button>
        </div>

      </form>
    </Form>
  );
}
