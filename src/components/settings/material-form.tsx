
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
import { useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking, useFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import type { Material } from '@/lib/types';
import { Loader2 } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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
  const form = useForm<MaterialFormValues>({
    resolver: zodResolver(MaterialSchema),
    defaultValues: {
      name: material?.name || '',
      type: material?.type || 'Monture',
    },
  });

  const { toast } = useToast();
  const firestore = useFirestore();

  const { user } = useFirebase();

  const onSubmit = async (data: MaterialFormValues) => {
    if (!firestore || !user) return;

    try {
      if (material) {
        const docRef = doc(firestore, `stores/${user.uid}/matieres`, material.id);
        await updateDocumentNonBlocking(docRef, data);
        toast({
          title: 'Matière modifiée',
          description: `La matière "${data.name}" a été mise à jour.`,
        });
      } else {
        const colRef = collection(firestore, `stores/${user.uid}/matieres`);
        await addDocumentNonBlocking(colRef, data);
        toast({
          title: 'Matière ajoutée',
          description: `La matière "${data.name}" a été créée.`,
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
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {material ? 'Enregistrer les modifications' : 'Ajouter la matière'}
        </Button>
      </form>
    </Form>
  );
}
