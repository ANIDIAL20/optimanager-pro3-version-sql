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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { createPrescription } from '@/app/actions/prescriptions-actions';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';


const PrescriptionSchema = z.object({
  date: z.date({ required_error: 'La date est requise.' }),
  type: z.enum(['Vision de loin', 'Vision de pres', 'Progressif'], { required_error: 'Le type est requis.' }),
  prescripteur: z.string().min(1, 'Le nom du prescripteur est requis.'),

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

  ecartPupillaire: z.string().optional(),
  hauteurMontage: z.string().optional(),
  pontage: z.string().optional(),
  branches: z.string().optional(),
  diametre: z.string().optional(),
  notes: z.string().optional(),
});

type PrescriptionFormValues = z.infer<typeof PrescriptionSchema>;

interface PrescriptionFormProps {
  clientId: string;
}

export function PrescriptionForm({ clientId }: PrescriptionFormProps) {
  const form = useForm<PrescriptionFormValues>({
    resolver: zodResolver(PrescriptionSchema),
    defaultValues: {
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
      ecartPupillaire: '',
      hauteurMontage: '',
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
      const prescriptionData = {
        od: {
          sphere: data.odSphere || '',
          cylinder: data.odCylindre || '',
          axis: data.odAxe || '',
          addition: data.odAddition || ''
        },
        og: {
          sphere: data.ogSphere || '',
          cylinder: data.ogCylindre || '',
          axis: data.ogAxe || '',
          addition: data.ogAddition || ''
        },
        pd: data.ecartPupillaire || '',
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
        <CardTitle>Ajouter une Prescription</CardTitle>
        <CardDescription>
          Saisissez les détails de la nouvelle prescription ou des mesures optiques.
        </CardDescription>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="-- Choisir un type --" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Vision de loin">Vision de loin</SelectItem>
                        <SelectItem value="Vision de pres">Vision de près</SelectItem>
                        <SelectItem value="Progressif">Progressif</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="prescripteur"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prescripteur</FormLabel>
                    <FormControl>
                      <Input placeholder="ex. Dr. Martin" {...field} />
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
                      <FormItem><FormLabel>Sphère</FormLabel><FormControl><Input placeholder="+0.00" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="odCylindre" render={({ field }) => (
                      <FormItem><FormLabel>Cylindre</FormLabel><FormControl><Input placeholder="-0.00" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="odAxe" render={({ field }) => (
                      <FormItem><FormLabel>Axe</FormLabel><FormControl><Input placeholder="0°" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="odAddition" render={({ field }) => (
                      <FormItem><FormLabel>Addition</FormLabel><FormControl><Input placeholder="+0.00" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="odBc" render={({ field }) => (
                      <FormItem><FormLabel>BC (Lentilles)</FormLabel><FormControl><Input placeholder="8.6" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="odDia" render={({ field }) => (
                      <FormItem><FormLabel>DIA (Lentilles)</FormLabel><FormControl><Input placeholder="14.2" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                </div>
                {/* Oeil Gauche */}
                <div className="space-y-4 rounded-lg border p-4">
                  <h4 className="font-semibold text-center">Œil Gauche (OG)</h4>
                  <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                    <FormField control={form.control} name="ogSphere" render={({ field }) => (
                      <FormItem><FormLabel>Sphère</FormLabel><FormControl><Input placeholder="+0.00" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="ogCylindre" render={({ field }) => (
                      <FormItem><FormLabel>Cylindre</FormLabel><FormControl><Input placeholder="-0.00" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="ogAxe" render={({ field }) => (
                      <FormItem><FormLabel>Axe</FormLabel><FormControl><Input placeholder="0°" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="ogAddition" render={({ field }) => (
                      <FormItem><FormLabel>Addition</FormLabel><FormControl><Input placeholder="+0.00" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="ogBc" render={({ field }) => (
                      <FormItem><FormLabel>BC (Lentilles)</FormLabel><FormControl><Input placeholder="8.6" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="ogDia" render={({ field }) => (
                      <FormItem><FormLabel>DIA (Lentilles)</FormLabel><FormControl><Input placeholder="14.2" {...field} /></FormControl></FormItem>
                    )} />
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-headline text-lg">Mesures de Montage</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <FormField control={form.control} name="ecartPupillaire" render={({ field }) => (
                  <FormItem><FormLabel>Écart Pupillaire</FormLabel><FormControl><Input placeholder="e.g., 62" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="hauteurMontage" render={({ field }) => (
                  <FormItem><FormLabel>Hauteur Montage</FormLabel><FormControl><Input placeholder="e.g., 18" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="pontage" render={({ field }) => (
                  <FormItem><FormLabel>Pontage</FormLabel><FormControl><Input placeholder="e.g., 17" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="branches" render={({ field }) => (
                  <FormItem><FormLabel>Branches</FormLabel><FormControl><Input placeholder="e.g., 145" {...field} /></FormControl></FormItem>
                )} />
                <FormField control={form.control} name="diametre" render={({ field }) => (
                  <FormItem><FormLabel>Diamètre Verre</FormLabel><FormControl><Input placeholder="e.g., 70" {...field} /></FormControl></FormItem>
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
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Enregistrer la Prescription
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
