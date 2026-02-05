'use client';

import { useState } from 'react';
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
import type { Material } from '@/lib/types';
import { BrandLoader } from '@/components/ui/loader-brand';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { createSetting, updateSetting } from '@/app/actions/settings-actions';

const MaterialSchema = z.object({
  name: z.string().min(2, { message: 'Le nom doit contenir au moins 2 caractères.' }),
  type: z.enum(['Monture', 'Verre', 'Lentille'], { required_error: 'Veuillez sélectionner un type.' }),
});

type MaterialFormValues = z.infer<typeof MaterialSchema>;

interface MaterialFormProps {
  material?: Material;
  onSuccess: () => void;
}

export function MaterialForm({ material, onSuccess }: MaterialFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(MaterialSchema),
    defaultValues: {
      name: material?.name || '',
      type: material?.type || 'Monture',
    },
  });

  const { toast } = useToast();

  const onSubmit = async (data: MaterialFormValues) => {
    setIsSubmitting(true);
    try {
      if (material) {
        const materialId = typeof material.id === 'string' ? parseInt(material.id) : material.id;
        await updateSetting('materials', materialId, data as any);
        toast({
          title: '! modifiée',
          description: `La matière "${data.name}" a été mise à jour.`,
        });
      } else {
        await createSetting('materials', data as any);
        toast({
          title: 'Matière ajoutée',
          description: `La matière "${data.name}" a été créée.`,
        });
      }
      onSuccess();
    } catch (error: any) {
      console.error('Error saving material:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || "Une erreur s'est produite. Veuillez réessayer.",
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
              <FormLabel>Nom de la matière</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Titane" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="-- Choisir un type --" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Monture">Monture</SelectItem>
                  <SelectItem value="Verre">Verre</SelectItem>
                  <SelectItem value="Lentille">Lentille</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? <BrandLoader size="xs" className="mr-2 inline-flex" /> : null}
          {material ? 'Enregistrer les modifications' : 'Ajouter la matière'}
        </Button>
      </form>
    </Form>
  );
}
