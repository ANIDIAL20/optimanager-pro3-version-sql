
'use client';

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription
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
import { Phone, Mail, MapPin, Globe, Building2, User, CreditCard, Loader2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { useFirestore, useUser, updateDocumentNonBlocking } from '@/firebase';
import { doc, serverTimestamp } from 'firebase/firestore';
import type { Supplier } from '@/lib/types';
import { createCompany } from '@/services/commercial';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/category-icons';


const productTypes = ["Montures", "Verres", "Lentilles", "Produits d'entretien", "Cordons", "Etuis", "Accessoires", "Matériel", "Divers"] as const;



const SupplierSchema = z.object({
  nomCommercial: z.string().min(2, { message: "Le nom commercial est requis." }),
  raisonSociale: z.string().optional(),
  typeProduits: z.array(z.string()).optional(),
  telephone: z.string().min(10, { message: "Le numéro de téléphone est requis." }),
  email: z.string().email({ message: "Veuillez entrer une adresse e-mail valide." }).optional().or(z.literal('')),
  adresse: z.string().optional(),
  ville: z.string().optional(),
  pays: z.string().optional(),
  if: z.string().optional(),
  ice: z.string().optional(),
  rc: z.string().optional(),
  rib: z.string().optional(),
  banque: z.string().optional(),
  delaiPaiement: z.enum(["Comptant", "30 jours", "60 jours", "90 jours"]).optional(),
  modePaiement: z.enum(["Espèces", "Chèque", "Virement", "Carte"]).optional(),
  remise: z.coerce.number().optional(),
  contactNom: z.string().optional(),
  contactTelephone: z.string().optional(),
  contactEmail: z.string().email().optional().or(z.literal('')),
  notes: z.string().optional(),
  statut: z.enum(["Actif", "Inactif"]),
});

type SupplierFormValues = z.infer<typeof SupplierSchema>;

interface SupplierFormProps {
  supplier?: Supplier;
}

export function SupplierForm({ supplier }: SupplierFormProps) {
  const router = useRouter();
  const { user } = useUser();
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(SupplierSchema),
    defaultValues: supplier ? {
      ...supplier,
      remise: supplier.remise || undefined,
    } : {
      nomCommercial: '',
      raisonSociale: '',
      typeProduits: [],
      telephone: '',
      email: '',
      adresse: '',
      ville: '',
      pays: '',
      if: '',
      ice: '',
      rc: '',
      rib: '',
      banque: '',
      remise: undefined,
      contactNom: '',
      contactTelephone: '',
      contactEmail: '',
      notes: '',
      statut: 'Actif',
    },
  });

  const { toast } = useToast();
  const firestore = useFirestore();

  const onSubmit = async (data: SupplierFormValues) => {
    if (!firestore || !user) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Vous devez être connecté pour effectuer cette action.",
      });
      return;
    };

    try {
      if (supplier) {
        // The collection should be 'suppliers' not 'stores/${user.uid}/suppliers' if it's at the root
        const docRef = doc(firestore, `stores/${user.uid}/suppliers`, supplier.id);
        // Filter out undefined values before updating
        const cleanedData = Object.fromEntries(
          Object.entries({ ...data, dateModification: serverTimestamp() }).filter(([_, v]) => v !== undefined)
        );
        await updateDocumentNonBlocking(docRef, cleanedData);
        toast({
          title: 'Fournisseur Modifié',
          description: `Le fournisseur "${data.nomCommercial}" a été mis à jour.`,
        });
        router.push(`/suppliers/${supplier.id}`);
      } else {
        // Filter out undefined values before creating
        const cleanedData = Object.fromEntries(
          Object.entries({
            name: data.nomCommercial,
            type: 'supplier' as const,
            phone: data.telephone,
            email: data.email,
            if: data.if,
            ice: data.ice,
            rc: data.rc,
            ...data
          }).filter(([_, v]) => v !== undefined)
        );
        await createCompany(firestore, user.uid, cleanedData as any);
        toast({
          title: 'Fournisseur Ajouté',
          description: `Le fournisseur "${data.nomCommercial}" a été créé.`,
        });
        router.push('/suppliers');
      }
    } catch (error) {
      console.error("Erreur lors de la sauvegarde du fournisseur:", error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "Une erreur s'est produite. Veuillez réessayer.",
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader><CardTitle className="font-headline">Informations Générales</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="nomCommercial" render={({ field }) => (
                  <FormItem><FormLabel>Nom Commercial</FormLabel><FormControl><Input placeholder="Nom du fournisseur" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="raisonSociale" render={({ field }) => (
                  <FormItem><FormLabel>Raison Sociale</FormLabel><FormControl><Input placeholder="Raison sociale (optionnel)" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="telephone" render={({ field }) => (
                  <FormItem><FormLabel>Téléphone</FormLabel><FormControl><Input type="tel" placeholder="+212 6 00 00 00 00" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="contact@fournisseur.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="adresse" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Adresse</FormLabel><FormControl><Input placeholder="Adresse complète" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="ville" render={({ field }) => (
                  <FormItem><FormLabel>Ville</FormLabel><FormControl><Input placeholder="e.g., Casablanca" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="pays" render={({ field }) => (
                  <FormItem><FormLabel>Pays</FormLabel><FormControl><Input placeholder="e.g., Maroc" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-headline">Informations Légales / Fiscales</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row gap-4 items-end">
                  <FormField control={form.control} name="if" render={({ field }) => (<FormItem className="flex-1"><FormLabel>Identifiant Fiscal (IF)</FormLabel><FormControl><Input placeholder="e.g., 12345678" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="ice" render={({ field }) => (<FormItem className="flex-1"><FormLabel>Identifiant Commun de l'Entreprise (ICE)</FormLabel><FormControl><Input placeholder="e.g., 001234567000089" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                  <FormField control={form.control} name="rc" render={({ field }) => (<FormItem className="flex-1"><FormLabel>Registre de Commerce (RC)</FormLabel><FormControl><Input placeholder="e.g., 98765" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="font-headline">Informations de Contact</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="contactNom" render={({ field }) => (
                  <FormItem><FormLabel>Nom du contact</FormLabel><FormControl><Input placeholder="Prénom et Nom" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contactTelephone" render={({ field }) => (
                  <FormItem><FormLabel>Téléphone du contact</FormLabel><FormControl><Input type="tel" placeholder="Ligne directe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="contactEmail" render={({ field }) => (
                  <FormItem className="md:col-span-2"><FormLabel>Email du contact</FormLabel><FormControl><Input type="email" placeholder="email@contact.com" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-headline">Informations Bancaires et Commerciales</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="banque" render={({ field }) => (
                  <FormItem><FormLabel>Banque</FormLabel><FormControl><Input placeholder="Nom de la banque" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="rib" render={({ field }) => (
                  <FormItem><FormLabel>RIB / IBAN</FormLabel><FormControl><Input placeholder="Numéro de compte" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="delaiPaiement" render={({ field }) => (
                  <FormItem><FormLabel>Délai de Paiement</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="-- Choisir --" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Comptant">Comptant</SelectItem><SelectItem value="30 jours">30 jours</SelectItem><SelectItem value="60 jours">60 jours</SelectItem><SelectItem value="90 jours">90 jours</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="modePaiement" render={({ field }) => (
                  <FormItem><FormLabel>Mode de Paiement</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="-- Choisir --" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Espèces">Espèces</SelectItem><SelectItem value="Chèque">Chèque</SelectItem><SelectItem value="Virement">Virement</SelectItem><SelectItem value="Carte">Carte</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="remise" render={({ field }) => (
                  <FormItem><FormLabel>Remise Habituelle (%)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-headline">Notes</CardTitle></CardHeader>
              <CardContent>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel>Notes Additionnelles</FormLabel><FormControl><Textarea placeholder="Ajoutez des notes ou commentaires..." {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
          </div>
          <div className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader><CardTitle>Statut</CardTitle></CardHeader>
              <CardContent>
                <FormField control={form.control} name="statut" render={({ field }) => (
                  <FormItem><FormLabel>Statut du fournisseur</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger><SelectValue placeholder="-- Choisir un statut --" /></SelectTrigger></FormControl><SelectContent><SelectItem value="Actif">Actif</SelectItem><SelectItem value="Inactif">Inactif</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                )} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Type de Produits</CardTitle></CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="typeProduits"
                  render={() => (
                    <FormItem>
                      {productTypes.map((item) => (
                        <FormField
                          key={item}
                          control={form.control}
                          name="typeProduits"
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={item}
                                className="flex flex-row items-start space-x-3 space-y-0"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(item)}
                                    onCheckedChange={(checked) => {
                                      return checked
                                        ? field.onChange([...(field.value || []), item])
                                        : field.onChange(
                                          field.value?.filter(
                                            (value) => value !== item
                                          )
                                        )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal flex items-center">
                                  {(() => {
                                    const Icon = getCategoryIcon(item);
                                    return <Icon className="mr-2 h-4 w-4" />;
                                  })()}
                                  {item}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {supplier ? 'Enregistrer les modifications' : 'Enregistrer le fournisseur'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
