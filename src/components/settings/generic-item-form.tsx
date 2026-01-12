
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
import { Loader2 } from 'lucide-react';

const GenericItemSchema = z.object({
  name: z.string().min(2, { message: 'Le nom doit contenir au moins 2 caractères.' }),
});

type FormValues = z.infer<typeof GenericItemSchema>;

interface GenericItemFormProps {
  item?: { id: string, name: string };
  collectionName: string;
  itemName: string;
  onSuccess: () => void;
}

export function GenericItemForm({ item, collectionName, itemName, onSuccess }: GenericItemFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(GenericItemSchema),
    defaultValues: { name: item?.name || '' },
  });

  const { toast } = useToast();
  const firestore = useFirestore();

  const { user } = useFirebase();

  const onSubmit = async (data: FormValues) => {
    if (!firestore || !user) return;

    try {
      if (item) {
        const docRef = doc(firestore, `stores/${user.uid}/${collectionName}`, item.id);
        await updateDocumentNonBlocking(docRef, data);
        toast({
          title: `${itemName} modifié(e)`,
          description: `L'élément "${data.name}" a été mis à jour.`,
        });
      } else {
        const colRef = collection(firestore, `stores/${user.uid}/${collectionName}`);
        await addDocumentNonBlocking(colRef, data);
        toast({
          title: `${itemName} ajouté(e)`,
          description: `L'élément "${data.name}" a été créé.`,
        });
      }
      onSuccess();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Une erreur s'est produite.",
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
              <FormLabel>Nom</FormLabel>
              <FormControl>
                <Input placeholder={`Nom de ${itemName ? `la ${itemName.toLowerCase()}` : "l'élément"}`} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={form.formState.isSubmitting} className="w-full">
          {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {item ? 'Enregistrer' : `Ajouter`}
        </Button>
      </form>
    </Form>
  );
}
