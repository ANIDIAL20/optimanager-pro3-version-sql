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
  FormMessage 
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
import { createSupplierOrder } from '@/app/actions/supplier-orders';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

const orderSchema = z.object({
  supplierId: z.string(),
  reference: z.string().min(1, 'Référence requise'),
  orderDate: z.string(),
  totalAmount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
    message: 'Le montant doit être supérieur à zéro',
  }),
  currency: z.enum(['MAD', 'EUR', 'USD']).default('MAD'),
  status: z.enum(['pending', 'received']).default('pending'),
  notes: z.string().optional(),
});

type OrderFormValues = z.infer<typeof orderSchema>;

interface OrderFormProps {
  supplierId: string;
  onSuccess?: () => void;
}

export function SupplierOrderForm({ supplierId, onSuccess }: OrderFormProps) {
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = React.useState(false);

  const form = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      supplierId,
      reference: '',
      orderDate: new Date().toISOString().split('T')[0],
      totalAmount: '',
      currency: 'MAD',
      status: 'pending',
      notes: '',
    },
  });

  async function onSubmit(data: OrderFormValues) {
    setIsPending(true);
    try {
      await createSupplierOrder({
        ...data,
        totalAmount: Number(data.totalAmount),
      });
      
      toast.success('Commande ajoutée avec succès');
      queryClient.invalidateQueries({ queryKey: ['supplier-statement', supplierId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-balance', supplierId] });
      if (onSuccess) onSuccess();
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'ajout de la commande");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="reference"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Référence</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: BC-2024-001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="orderDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date de commande</FormLabel>
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
            name="totalAmount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Montant Total (TTC)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" placeholder="0.00" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Devise</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir devise" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="MAD">MAD (Dirham)</SelectItem>
                    <SelectItem value="EUR">EUR (€)</SelectItem>
                    <SelectItem value="USD">USD ($)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="status"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Statut</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir statut" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="pending">En attente (Pending)</SelectItem>
                  <SelectItem value="received">Reçue (Received)</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

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

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirmer la Commande
        </Button>
      </form>
    </Form>
  );
}
