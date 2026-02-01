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
import { useToast } from '@/hooks/use-toast';
import { createSetting, updateSetting } from '@/app/actions/settings-actions';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';

const GenericItemSchema = z.object({
  name: z.string().min(2, { message: 'Le nom doit contenir au moins 2 caractères.' }),
});

type FormValues = z.infer<typeof GenericItemSchema>;

// Map collection names to setting types
const collectionToTypeMap: Record<string, string> = {
  'brands': 'brands',
  'categories': 'categories',
  'materials': 'materials',
  'colors': 'colors',
  'treatments': 'treatments',
  'mountingTypes': 'mountingTypes',
  'banks': 'banks',
  'insurances': 'insurances',
  'marques': 'brands',
  'categories': 'categories',
  'matieres': 'materials',
  'couleurs': 'colors',
  'traitements': 'treatments',
  'typesMontage': 'mountingTypes',
  'banques': 'banks',
  'mutuelles': 'insurances',
};

interface GenericItemFormProps {
  item?: { id: string | number, name: string };
  collectionName: string;
  itemName: string;
  onSuccess: () => void;
}

export function GenericItemForm({ item, collectionName, itemName, onSuccess }: GenericItemFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<FormValues>({
    resolver: zodResolver(GenericItemSchema),
    defaultValues: { name: item?.name || '' },
  });

  const { toast } = useToast();

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);
    try {
      // Map collection name to setting type
      const settingType = collectionToTypeMap[collectionName] || collectionName;

      if (item) {
        // Update existing item
        const itemId = typeof item.id === 'string' ? parseInt(item.id) : item.id;
        await updateSetting(settingType as any, itemId, data);
        toast({
          title: `${itemName} modifié(e)`,
          description: `L'élément "${data.name}" a été mis à jour.`,
        });
      } else {
        // Create new item
        await createSetting(settingType as any, data);
        toast({
          title: `${itemName} ajouté(e)`,
          description: `L'élément "${data.name}" a été créé.`,
        });
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error saving setting:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || "Une erreur s'est produite.",
      });
    } finally {
      setIsSubmitting(false);
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
              <FormLabel>Nom</FormLabel>
              <FormControl>
                <Input placeholder={`Nom de ${itemName ? `la ${itemName.toLowerCase()}` : "l'élément"}`} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {item ? 'Enregistrer' : `Ajouter`}
        </Button>
      </form>
    </Form>
  );
}
