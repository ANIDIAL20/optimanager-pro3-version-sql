
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
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';

// Server Actions
import { getPrescriptions } from '@/app/actions/prescriptions-actions';
import { getSuppliersList } from '@/app/actions/supplier-actions';
import { getSettings } from '@/app/actions/settings-actions';
import { createLensOrder, type LensOrderInput } from '@/app/actions/lens-orders-actions';

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

interface Prescription {
  id: string;
  date: string;
  doctorName?: string;
  data: any;
}

interface Supplier {
  id: number;
  nomCommercial: string;
}

interface Treatment {
  id: number;
  name: string;
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

  const { toast } = useToast();

  // State
  const [prescriptions, setPrescriptions] = React.useState<Prescription[]>([]);
  const [suppliers, setSuppliers] = React.useState<Supplier[]>([]);
  const [treatments, setTreatments] = React.useState<Treatment[]>([]);
  const [isLoadingPrescriptions, setIsLoadingPrescriptions] = React.useState(false);
  const [isLoadingSuppliers, setIsLoadingSuppliers] = React.useState(false);
  const [isLoadingTreatments, setIsLoadingTreatments] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch prescriptions
  React.useEffect(() => {
    const loadPrescriptions = async () => {
      setIsLoadingPrescriptions(true);
      try {
        const result = await getPrescriptions(clientId);
        if (result.success && result.data) {
          setPrescriptions(result.data as any);
        }
      } catch (error) {
        console.error('Error loading prescriptions:', error);
      } finally {
        setIsLoadingPrescriptions(false);
      }
    };

    loadPrescriptions();
  }, [clientId]);

  // Fetch suppliers
  React.useEffect(() => {
    const loadSuppliers = async () => {
      setIsLoadingSuppliers(true);
      try {
        const result = await getSuppliersList();
        if (result.success && result.data) {
          setSuppliers(result.data as any);
        }
      } catch (error) {
        console.error('Error loading suppliers:', error);
      } finally {
        setIsLoadingSuppliers(false);
      }
    };

    loadSuppliers();
  }, []);

  // Fetch treatments
  React.useEffect(() => {
    const loadTreatments = async () => {
      setIsLoadingTreatments(true);
      try {
        const result = await getSettings('treatments');
        if (result.success && result.data) {
          setTreatments(result.data as any);
        }
      } catch (error) {
        console.error('Error loading treatments:', error);
      } finally {
        setIsLoadingTreatments(false);
      }
    };

    loadTreatments();
  }, []);

  const selectedPrescriptionId = form.watch('prescriptionId');
  const selectedPrescription = React.useMemo(
    () => prescriptions?.find(p => p.id === selectedPrescriptionId),
    [prescriptions, selectedPrescriptionId]
  );

  const onSubmit = async (data: LensOrderFormValues) => {
    const fullSelectedPrescription = prescriptions?.find(p => p.id === data.prescriptionId);

    if (!fullSelectedPrescription) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "La prescription sélectionnée n'a pas pu être trouvée. Veuillez réessayer.",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const supplier = suppliers.find(s => s.id.toString() === data.supplierId);
      
      const orderInput: LensOrderInput = {
        clientId: parseInt(clientId),
        prescriptionId: parseInt(data.prescriptionId),
        orderType: 'unifocal',
        lensType: data.lensType,
        treatment: data.treatments?.join(', ') || null,
        supplierName: supplier?.nomCommercial || 'Unknown',
        rightEye: fullSelectedPrescription.data?.od || null,
        leftEye: fullSelectedPrescription.data?.og || null,
        unitPrice: 0,
        quantity: 1,
        totalPrice: 0,
        status: 'pending',
        notes: data.notes
      };

      const result = await createLensOrder(orderInput);

      if (result.success) {
        toast({
          title: 'Commande de verres créée',
          description: 'La nouvelle commande a été enregistrée en tant que brouillon.',
        });
        form.reset();
      } else {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: result.error || "Une erreur s'est produite lors de la création de la commande.",
        });
      }
    } catch (error) {
      console.error("Order creation error:", error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Une erreur s'est produite lors de la création de la commande.",
      });
    } finally {
      setIsSubmitting(false);
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

            <Button type="submit" disabled={isSubmitting || form.formState.isSubmitting}>
              {(isSubmitting || form.formState.isSubmitting) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Créer la Commande
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
