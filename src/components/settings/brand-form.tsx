
'use client';

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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, useFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Brand, BrandCategory } from '@/lib/types';
import { Loader2 } from 'lucide-react';

const brandCategories = ['Premium', 'Populaire', 'Française', 'Autre'] as const;

const BrandSchema = z.object({
  name: z.string().min(2, { message: 'Le nom doit contenir au moins 2 caractères.' }),
  category: z.enum(brandCategories, { required_error: 'Veuillez sélectionner une catégorie.' }),
});

type BrandFormValues = z.infer<typeof BrandSchema>;

interface BrandFormProps {
  brand?: Brand;
  onSuccess: () => void;
}

export function BrandForm({ brand, onSuccess }: BrandFormProps) {
  const form = useForm<BrandFormValues>({
    resolver: zodResolver(BrandSchema),
    defaultValues: {
      name: brand?.name || '',
      category: brand?.category || undefined,
    },
  });

  const { toast } = useToast();
  const firestore = useFirestore();

  const { user } = useFirebase();

  const onSubmit = async (data: BrandFormValues) => {
    if (!firestore || !user) return;

    try {
      if (brand) {
        const docRef = doc(firestore, `stores/${user.uid}/marques`, brand.id);
        await updateDocumentNonBlocking(docRef, data);
        toast({
          title: 'Marque modifiée',
          description: `La marque "${data.name}" a été mise à jour.`,
        });
      } else {
        const colRef = collection(firestore, `stores/${user.uid}/marques`);
        await addDocumentNonBlocking(colRef, data);
        toast({
          title: 'Marque ajoutée',
          description: `La marque "${data.name}" a été créée.`,
        });
      }
      onSuccess();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Une erreur s'est produite. Veuillez réessayer.",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nom de la marque</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Ray-Ban" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Catégorie</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Choisir une catégorie --" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {brandCategories.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {brand ? 'Enregistrer les modifications' : 'Ajouter la marque'}
        </Button>
      </form>
    </Form>
  );
}
