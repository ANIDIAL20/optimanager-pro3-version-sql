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
import { createContactLensPrescription } from '@/app/actions/contact-lens-prescriptions-actions';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BrandLoader } from '@/components/ui/loader-brand';

const ContactLensPrescriptionSchema = z.object({
  date: z.date({ required_error: 'La date est requise.' }),
  lensType: z.enum(['Souple journalière', 'Souple mensuelle', 'Rigide', 'Torique', 'Multifocale'], { required_error: 'Le type de lentilles est requis.' }),
  prescripteur: z.string().optional(),
  lensBrand: z.string().optional(),

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

  portDuree: z.enum(['Journalière', 'Hebdomadaire', 'Mensuelle']).optional(),
  dateExpiration: z.date().optional(),
  notes: z.string().optional(),
});

type FormValues = z.infer<typeof ContactLensPrescriptionSchema>;

interface ContactLensPrescriptionFormProps {
  clientId: string;
  onSuccess?: () => void;
}

export function ContactLensPrescriptionForm({ clientId, onSuccess }: ContactLensPrescriptionFormProps) {
  const form = useForm<FormValues>({
    resolver: zodResolver(ContactLensPrescriptionSchema),
    defaultValues: {
      prescripteur: '',
      lensBrand: '',
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
      notes: '',
    }
  });

  const { toast } = useToast();
  const watchLensType = form.watch('lensType');
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const onSubmit = async (data: FormValues) => {
    setIsSubmitting(true);

    try {
      const prescriptionData = {
        rightEye: {
          baseCurve: data.odBc || '',
          diameter: data.odDia || '',
          power: data.odSphere || '',
          cylinder: data.odCylindre || '',
          axis: data.odAxe || '',
          addition: data.odAddition || ''
        },
        leftEye: {
          baseCurve: data.ogBc || '',
          diameter: data.ogDia || '',
          power: data.ogSphere || '',
          cylinder: data.ogCylindre || '',
          axis: data.ogAxe || '',
          addition: data.ogAddition || ''
        },
        brand: data.lensBrand || '',
        lensType: data.lensType,
        doctorName: data.prescripteur,
        duration: data.portDuree,
        expirationDate: data.dateExpiration ? data.dateExpiration.toISOString() : undefined
      };

      const result = await createContactLensPrescription({
        clientId: clientId,
        date: data.date,
        data: prescriptionData,
        notes: data.notes || ''
      });

      if (result.success) {
        toast({
          title: 'Prescription lentilles ajoutée',
          description: 'Les nouvelles mesures de lentilles de contact ont été enregistrées.',
        });
        form.reset();
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
        description: "Une erreur s'est produite lors de l'enregistrement.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ajouter une Prescription de Lentilles</CardTitle>
        <CardDescription>
          Saisissez les détails de la nouvelle prescription pour lentilles de contact.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                          disabled={(date) => date > new Date() || date < new Date('1900-01-01')} 
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
                name="lensType" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de Lentilles</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="-- Choisir un type --" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Souple journalière">Souple journalière</SelectItem>
                        <SelectItem value="Souple mensuelle">Souple mensuelle</SelectItem>
                        <SelectItem value="Rigide">Rigide</SelectItem>
                        <SelectItem value="Torique">Torique</SelectItem>
                        <SelectItem value="Multifocale">Multifocale</SelectItem>
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
                    <FormLabel>Prescripteur (Optionnel)</FormLabel>
                    <FormControl>
                      <Input placeholder="ex. Dr. Martin" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField 
                control={form.control} 
                name="lensBrand" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marque des lentilles</FormLabel>
                    <FormControl>
                      <Input placeholder="ex. Acuvue" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
              {/* Oeil Droit */}
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-semibold text-center">Œil Droit (OD)</h4>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField control={form.control} name="odSphere" render={({ field }) => (
                    <FormItem><FormLabel>Puissance/Sphère</FormLabel><FormControl><Input placeholder="+0.00" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="odBc" render={({ field }) => (
                    <FormItem><FormLabel>Courbe (BC)</FormLabel><FormControl><Input placeholder="8.6" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="odDia" render={({ field }) => (
                    <FormItem><FormLabel>Diamètre (DIA)</FormLabel><FormControl><Input placeholder="14.2" {...field} /></FormControl></FormItem>
                  )} />
                  {(watchLensType === 'Torique') && <>
                    <FormField control={form.control} name="odCylindre" render={({ field }) => (
                      <FormItem><FormLabel>Cylindre</FormLabel><FormControl><Input placeholder="-0.00" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="odAxe" render={({ field }) => (
                      <FormItem><FormLabel>Axe</FormLabel><FormControl><Input placeholder="0°" {...field} /></FormControl></FormItem>
                    )} />
                  </>}
                  {(watchLensType === 'Multifocale') && <FormField control={form.control} name="odAddition" render={({ field }) => (
                    <FormItem><FormLabel>Addition</FormLabel><FormControl><Input placeholder="+0.00" {...field} /></FormControl></FormItem>
                  )} />}
                </div>
              </div>
              {/* Oeil Gauche */}
              <div className="space-y-4 rounded-lg border p-4">
                <h4 className="font-semibold text-center">Œil Gauche (OG)</h4>
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField control={form.control} name="ogSphere" render={({ field }) => (
                    <FormItem><FormLabel>Puissance/Sphère</FormLabel><FormControl><Input placeholder="+0.00" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="ogBc" render={({ field }) => (
                    <FormItem><FormLabel>Courbe (BC)</FormLabel><FormControl><Input placeholder="8.6" {...field} /></FormControl></FormItem>
                  )} />
                  <FormField control={form.control} name="ogDia" render={({ field }) => (
                    <FormItem><FormLabel>Diamètre (DIA)</FormLabel><FormControl><Input placeholder="14.2" {...field} /></FormControl></FormItem>
                  )} />
                  {(watchLensType === 'Torique') && <>
                    <FormField control={form.control} name="ogCylindre" render={({ field }) => (
                      <FormItem><FormLabel>Cylindre</FormLabel><FormControl><Input placeholder="-0.00" {...field} /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="ogAxe" render={({ field }) => (
                      <FormItem><FormLabel>Axe</FormLabel><FormControl><Input placeholder="0°" {...field} /></FormControl></FormItem>
                    )} />
                  </>}
                  {(watchLensType === 'Multifocale') && <FormField control={form.control} name="ogAddition" render={({ field }) => (
                    <FormItem><FormLabel>Addition</FormLabel><FormControl><Input placeholder="+0.00" {...field} /></FormControl></FormItem>
                  )} />}
                </div>
              </div>
            </div>
            <div className="space-y-4">
              <h3 className="font-headline text-lg">Informations Complémentaires</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                <FormField control={form.control} name="portDuree" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Durée de port</FormLabel>
                    <SearchableSelect
                      options={[
                        { label: 'Journalière', value: 'Journalière' },
                        { label: 'Hebdomadaire', value: 'Hebdomadaire' },
                        { label: 'Mensuelle', value: 'Mensuelle' }
                      ]}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="-- Choisir --"
                      searchPlaceholder="Rechercher..."
                    />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="dateExpiration" render={({ field }) => (
                  <FormItem><FormLabel>Date d'expiration</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'} className={cn('w-full h-10 justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>{field.value ? (format(field.value, 'dd/MM/yyyy')) : (<span>JJ/MM/AAAA</span>)}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Notes</FormLabel><FormControl><Textarea placeholder="Ajouter des notes ou commentaires supplémentaires..." {...field} /></FormControl><FormMessage /></FormItem>
            )} />

            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <BrandLoader size="sm" className="mr-2" />}
              Enregistrer la Prescription Lentilles
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
