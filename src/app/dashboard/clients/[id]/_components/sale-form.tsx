'use client';

import * as React from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
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
// import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase'; // REMOVED
// import { collection, doc, writeBatch } from 'firebase/firestore'; // REMOVED
import type { Client, Product, Sale, OrderDetail } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Check, ChevronsUpDown, PlusCircle, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SensitiveData } from '@/components/ui/sensitive-data';
// import { Invoice } from './invoice'; // This probably also imports firebase? If so, stub.
import { BrandLoader } from '@/components/ui/loader-brand';

const SaleItemSchema = z.object({
  productId: z.string().min(1),
  productName: z.string(),
  quantity: z.coerce.number().min(1, 'La quantité doit être au moins 1'),
  price: z.number(),
  stock: z.number(),
});

const SaleFormSchema = z.object({
  items: z.array(SaleItemSchema).min(1, 'Veuillez ajouter au moins un produit.'),
  totalPaye: z.coerce.number().min(0),
  methode: z.enum(['Especes', 'Carte', 'Cheque', 'Virement']),
  notes: z.string().optional(),
});

type SaleFormValues = z.infer<typeof SaleFormSchema>;

interface SaleFormProps {
  client: Client;
}

export function SaleForm({ client }: SaleFormProps) {
  const { toast } = useToast();
  
  // Minimal form setup
  const form = useForm<SaleFormValues>({
    resolver: zodResolver(SaleFormSchema),
    defaultValues: {
      items: [],
      totalPaye: 0,
      methode: 'Especes',
      notes: '',
    },
  });

  const onSubmit = async (data: SaleFormValues) => {
    toast({
        title: "Migration en cours",
        description: "La création de vente est désactivée pendant la migration SQL.",
        variant: "destructive"
    });
  };

  return (
    <Card>
        <CardHeader>
          <CardTitle>Nouvelle Vente</CardTitle>
          <CardDescription>Module en maintenance (Migration SQL)</CardDescription>
        </CardHeader>
        <CardContent>
            <p className="text-muted-foreground">
                Ce formulaire est temporairement désactivé. Veuillez utiliser le module de Devis ou attendre la finalisation de la migration.
            </p>
        </CardContent>
        <CardFooter>
            <Button disabled>Enregistrer la Vente</Button>
        </CardFooter>
    </Card>
  );
}

