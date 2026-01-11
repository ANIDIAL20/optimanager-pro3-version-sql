
'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
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
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, useFirebase } from '@/firebase';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import type { Prescription, Supplier, Traitement } from '@/lib/types';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

const LensOrderSchema = z.object({
  prescriptionId: z.string().min(1, 'Veuillez sélectionner une prescription.'),
  supplierId: z.string().min(1, 'Veuillez sélectionner un fournisseur.'),
  lensType: z.string().min(1, 'Le type de verre est requis.'),
  treatments: z.array(z.string()).optional(),
  notes: z.string().optional(),
});

type LensOrderFormValues = z.infer<typeof LensOrderSchema>;

interface LensOrderFormProps {
  clientId: string;
}

export function LensOrderForm({ clientId }: LensOrderFormProps) {
  const form = useForm<LensOrderFormValues>({
    resolver: zodResolver(LensOrderSchema),
    defaultValues: {
      prescriptionId: '',
      supplierId: '',
      lensType: '',
      treatments: [],
      notes: '',
    },
  });

  const firestore = useFirestore();
  const { user } = useFirebase();
  const { toast } = useToast();

  // Fetch client's prescriptions
  const prescriptionsQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(collection(firestore, `stores/${user.uid}/clients/${clientId}/prescriptions`), orderBy('date', 'desc'))
        : null,
    [firestore, user, clientId]
  );
  const { data: prescriptions, isLoading: isLoadingPrescriptions } = useCollection<Prescription>(prescriptionsQuery);

  // Fetch lens suppliers
  const suppliersQuery = useMemoFirebase(
    () =>
      firestore && user
        ? query(collection(firestore, `stores/${user.uid}/suppliers`), where('typeProduits', 'array-contains', 'Verres'))
        : null,
    [firestore, user]
  );
  const { data: suppliers, isLoading: isLoadingSuppliers } = useCollection<Supplier>(suppliersQuery);

  // Fetch lens treatments
  const treatmentsQuery = useMemoFirebase(
    () => (firestore && user ? query(collection(firestore, `stores/${user.uid}/traitements`), orderBy('name', 'asc')) : null),
    [firestore, user]
  );
  const { data: treatments, isLoading: isLoadingTreatments } = useCollection<Traitement>(treatmentsQuery);

  const selectedPrescriptionId = form.watch('prescriptionId');
  const selectedPrescription = React.useMemo(
    () => prescriptions?.find(p => p.id === selectedPrescriptionId),
    [prescriptions, selectedPrescriptionId]
  );

  const onSubmit = async (data: LensOrderFormValues) => {
    if (!firestore) return;

    const fullSelectedPrescription = prescriptions?.find(p => p.id === data.prescriptionId);

    if (!fullSelectedPrescription) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "La prescription sélectionnée n'a pas pu être trouvée. Veuillez réessayer.",
      });
      return;
    }

    try {
      const orderData = {
        ...data,
        clientId,
        orderDate: new Date().toISOString(),
        status: 'Draft' as const,
        correction: {
          odSphere: fullSelectedPrescription.odSphere || '',
          odCylindre: fullSelectedPrescription.odCylindre || '',
          odAxe: fullSelectedPrescription.odAxe || '',
          odAddition: fullSelectedPrescription.odAddition || '',
          ogSphere: fullSelectedPrescription.ogSphere || '',
          ogCylindre: fullSelectedPrescription.ogCylindre || '',
          ogAxe: fullSelectedPrescription.ogAxe || '',
          ogAddition: fullSelectedPrescription.ogAddition || '',
          ecartPupillaire: fullSelectedPrescription.ecartPupillaire || '',
          hauteurMontage: fullSelectedPrescription.hauteurMontage || ''
        }
      };
      if (!user) return;
      const lensOrdersRef = collection(firestore, `stores/${user.uid}/clients/${clientId}/lens_orders`);
      await addDocumentNonBlocking(lensOrdersRef, orderData); // Changed ordersRef to lensOrdersRef

      toast({
        title: 'Commande de verres créée',
        description: 'La nouvelle commande a été enregistrée en tant que brouillon.',
      });
      form.reset();
    } catch (error) {
      console.error("Order creation error:", error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Une erreur s'est produite lors de la création de la commande.",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nouvelle Commande de Verres</CardTitle>
        <CardDescription>
          Créez une nouvelle commande de verres pour ce client à partir d'une prescription existante.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="prescriptionId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prescription de référence</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingPrescriptions}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingPrescriptions ? "Chargement..." : "-- Sélectionner une prescription --"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {prescriptions?.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {new Date(p.date).toLocaleDateString()} - {p.prescripteur} ({p.type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="supplierId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fournisseur de verres</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value} disabled={isLoadingSuppliers}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={isLoadingSuppliers ? "Chargement..." : "-- Sélectionner un fournisseur --"} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {suppliers?.map(s => (
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
            </div>

            {selectedPrescription && (
              <Card className="bg-muted/50">
                <CardHeader><CardTitle className="text-lg">Détails de la Prescription</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div><FormLabel>OD</FormLabel><p>{`${selectedPrescription.odSphere || '-'} (${selectedPrescription.odCylindre || '-'}) ${selectedPrescription.odAxe || '-'}`}</p></div>
                  <div><FormLabel>OG</FormLabel><p>{`${selectedPrescription.ogSphere || '-'} (${selectedPrescription.ogCylindre || '-'}) ${selectedPrescription.ogAxe || '-'}`}</p></div>
                  <div><FormLabel>Add</FormLabel><p>{`OD: ${selectedPrescription.odAddition || '-'} | OG: ${selectedPrescription.ogAddition || '-'}`}</p></div>
                  <div><FormLabel>E.P</FormLabel><p>{selectedPrescription.ecartPupillaire || '-'}</p></div>
                </CardContent>
              </Card>
            )}

            <FormField
              control={form.control}
              name="lensType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type de verre</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Progressif, Unifocal, etc." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="treatments"
              render={() => (
                <FormItem>
                  <div className="mb-4">
                    <FormLabel className="text-base">Traitements des verres</FormLabel>
                    <FormDescription>
                      Sélectionnez les traitements à appliquer.
                    </FormDescription>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {isLoadingTreatments && <p>Chargement...</p>}
                    {treatments?.map((item) => (
                      <FormField
                        key={item.id}
                        control={form.control}
                        name="treatments"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={item.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(item.name)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...(field.value || []), item.name])
                                      : field.onChange(
                                        field.value?.filter(
                                          (value) => value !== item.name
                                        )
                                      );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {item.name}
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
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
                    <Textarea
                      placeholder="Ajoutez des notes ou des instructions spécifiques pour la commande..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer la Commande
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
