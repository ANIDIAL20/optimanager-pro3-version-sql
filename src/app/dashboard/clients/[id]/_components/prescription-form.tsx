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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { createPrescription } from '@/app/actions/prescriptions-actions';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { BrandLoader } from '@/components/ui/loader-brand';
import Link from 'next/link';
import { Sparkles, Glasses, Trash2, Edit, Save, Plus, ChevronDown, Sparkle } from 'lucide-react';
import { ScannerDialog } from './scanner-dialog';


const PrescriptionSchema = z.object({
  date: z.date({ required_error: 'La date est requise.' }),
  type: z.enum(['Vision de loin', 'Vision de pres', 'Progressif'], { required_error: 'Le type est requis.' }),
  prescripteur: z.string().optional(),

  odSphere: z.string().optional(),
  odCylindre: z.string().optional(),
  odAxe: z.string().optional(),
  odAddition: z.string().optional(),
  odBc: z.string().optional(),
  odDia: z.string().optional(),

  ogSphere: z.string().optional(),
  ogCylindre: z.string().optional(),
  ogAxe: z.string().optional(),
  ogAddition: z.string().optional(),
  ogBc: z.string().optional(),
  ogDia: z.string().optional(),

  odEcartPupillaire: z.string().optional(),
  ogEcartPupillaire: z.string().optional(),
  odHauteurMontage: z.string().optional(),
  ogHauteurMontage: z.string().optional(),
  pontage: z.string().optional(),
  branches: z.string().optional(),
  diametre: z.string().optional(),
  notes: z.string().optional(),
});

type PrescriptionFormValues = z.infer<typeof PrescriptionSchema>;

interface PrescriptionFormProps {
  clientId: string;
  onSuccess?: () => void;
}

export function PrescriptionForm({ clientId, onSuccess }: PrescriptionFormProps) {
  const form = useForm<PrescriptionFormValues>({
    resolver: zodResolver(PrescriptionSchema),
    defaultValues: {
      date: new Date(),
      type: 'Vision de loin',
      odSphere: '',
      odCylindre: '',
      odAxe: '',
      odAddition: '',
      odBc: '',
      odDia: '',
      ogSphere: '',
      ogCylindre: '',
      ogAxe: '',
      ogAddition: '',
      ogBc: '',
      ogDia: '',
      odEcartPupillaire: '',
      ogEcartPupillaire: '',
      odHauteurMontage: '',
      ogHauteurMontage: '',
      pontage: '',
      branches: '',
      diametre: '',
      notes: '',
      prescripteur: '',
    },
  });

  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmit = async (data: PrescriptionFormValues) => {
    setIsSubmitting(true);

    try {
      const prescriptionData: PrescriptionData = {
        od: {
          sphere: data.odSphere || '',
          cylinder: data.odCylindre || '',
          axis: data.odAxe || '',
          addition: data.odAddition || '',
          pd: data.odEcartPupillaire || '',
          height: data.odHauteurMontage || ''
        },
        og: {
          sphere: data.ogSphere || '',
          cylinder: data.ogCylindre || '',
          axis: data.ogAxe || '',
          addition: data.ogAddition || '',
          pd: data.ogEcartPupillaire || '',
          height: data.ogHauteurMontage || ''
        },
        pd: data.odEcartPupillaire && data.ogEcartPupillaire 
          ? (parseFloat(data.odEcartPupillaire) + parseFloat(data.ogEcartPupillaire)).toString() 
          : '',
        doctorName: data.prescripteur
      };

      const result = await createPrescription({
        clientId: clientId,
        date: data.date,
        data: prescriptionData,
        notes: data.notes || ''
      });

      if (result.success) {
        toast({
          title: 'Prescription ajoutée',
          description: 'Les nouvelles mesures optiques ont été enregistrées avec succès.',
        });
        form.reset();
        // Force refresh
        if (onSuccess) onSuccess();
      } else {
        toast({
          variant: 'destructive',
          title: 'Erreur',
          description: result.error || "Une erreur s'est produite lors de l'enregistrement.",
        });
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Une erreur s'est produite lors de l'enregistrement de la prescription.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Ajouter une Prescription</CardTitle>
            <CardDescription>
              Saisissez les détails de la nouvelle prescription ou des mesures optiques.
            </CardDescription>
          </div>
          <ScannerDialog clientId={clientId} onSuccess={onSuccess || (() => {})} />
        </div>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de la mesure</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={'outline'}
                            className={cn(
                              'w-full h-10 justify-start text-left font-normal',
                              !field.value && 'text-muted-foreground'
                            )}
                          >
                            {field.value ? (
                              format(field.value, 'dd/MM/yyyy')
                            ) : (
                              <span>JJ/MM/AAAA</span>
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
                            date > new Date() || date < new Date('1900-01-01')
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
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de Verres</FormLabel>
                    <SearchableSelect
                      options={[
                        { label: 'Vision de loin', value: 'Vision de loin' },
                        { label: 'Vision de près', value: 'Vision de pres' },
                        { label: 'Progressif', value: 'Progressif' },
                      ]}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="-- Choisir un type --"
                      searchPlaceholder="Rechercher un type..."
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prescripteur"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prescripteur (Optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="ex. Dr. Martin" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-headline text-lg">Correction Optique et Lentilles</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                {/* Oeil Droit */}
                <div className="space-y-4 rounded-lg border p-4">
                  <h4 className="font-semibold text-center">Œil Droit (OD)</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField control={form.control} name="odSphere" render={({ field }) => (
                      <FormItem><FormLabel>Sphère</FormLabel><FormControl><Input placeholder="+0.00" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="odCylindre" render={({ field }) => (
                      <FormItem><FormLabel>Cylindre</FormLabel><FormControl><Input placeholder="-0.00" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="odAxe" render={({ field }) => (
                      <FormItem><FormLabel>Axe</FormLabel><FormControl><Input placeholder="0°" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="odAddition" render={({ field }) => (
                      <FormItem><FormLabel>Addition</FormLabel><FormControl><Input placeholder="+0.00" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="odBc" render={({ field }) => (
                      <FormItem><FormLabel>BC (Lentilles)</FormLabel><FormControl><Input placeholder="8.6" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="odDia" render={({ field }) => (
                      <FormItem><FormLabel>DIA (Lentilles)</FormLabel><FormControl><Input placeholder="14.2" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="odEcartPupillaire" render={({ field }) => (
                      <FormItem className="border-t pt-2"><FormLabel className="text-primary font-bold">Écart Pup. (OD)</FormLabel><FormControl><Input placeholder="32" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="odHauteurMontage" render={({ field }) => (
                      <FormItem className="border-t pt-2"><FormLabel className="text-primary font-bold">Hauteur (OD)</FormLabel><FormControl><Input placeholder="18" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                  </div>
                </div>
                {/* Oeil Gauche */}
                <div className="space-y-4 rounded-lg border p-4">
                  <h4 className="font-semibold text-center">Œil Gauche (OG)</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField control={form.control} name="ogSphere" render={({ field }) => (
                      <FormItem><FormLabel>Sphère</FormLabel><FormControl><Input placeholder="+0.00" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="ogCylindre" render={({ field }) => (
                      <FormItem><FormLabel>Cylindre</FormLabel><FormControl><Input placeholder="-0.00" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="ogAxe" render={({ field }) => (
                      <FormItem><FormLabel>Axe</FormLabel><FormControl><Input placeholder="0°" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="ogAddition" render={({ field }) => (
                      <FormItem><FormLabel>Addition</FormLabel><FormControl><Input placeholder="+0.00" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="ogBc" render={({ field }) => (
                      <FormItem><FormLabel>BC (Lentilles)</FormLabel><FormControl><Input placeholder="8.6" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="ogDia" render={({ field }) => (
                      <FormItem><FormLabel>DIA (Lentilles)</FormLabel><FormControl><Input placeholder="14.2" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="ogEcartPupillaire" render={({ field }) => (
                      <FormItem className="border-t pt-2"><FormLabel className="text-primary font-bold">Écart Pup. (OG)</FormLabel><FormControl><Input placeholder="32" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="ogHauteurMontage" render={({ field }) => (
                      <FormItem className="border-t pt-2"><FormLabel className="text-primary font-bold">Hauteur (OG)</FormLabel><FormControl><Input placeholder="18" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                    )} />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-headline text-lg">Mesures de Montage</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <FormField control={form.control} name="pontage" render={({ field }) => (
                  <FormItem><FormLabel>Pontage</FormLabel><FormControl><Input placeholder="e.g., 17" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="branches" render={({ field }) => (
                  <FormItem><FormLabel>Branches</FormLabel><FormControl><Input placeholder="e.g., 145" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="diametre" render={({ field }) => (
                  <FormItem><FormLabel>Diamètre Verre</FormLabel><FormControl><Input placeholder="e.g., 70" {...field} value={field.value ?? ''} /></FormControl></FormItem>
                )} />
              </div>
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Ajouter des notes ou commentaires supplémentaires..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <BrandLoader size="sm" className="mr-2" />}
              Enregistrer la Prescription
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
