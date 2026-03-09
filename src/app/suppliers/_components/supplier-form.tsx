
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
import { SubmitButton } from '@/components/ui/submit-button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Check, ChevronsUpDown } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import type { Supplier } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getCategoryIcon } from '@/lib/category-icons';

import { getSettings } from '@/app/actions/settings-actions';
import { createSupplier, updateSupplier } from '@/app/actions/supplier-actions';

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

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
  const form = useForm<SupplierFormValues>({
    resolver: zodResolver(SupplierSchema),
    defaultValues: supplier ? {
      nomCommercial: supplier.nomCommercial || '',
      raisonSociale: supplier.raisonSociale || '',
      typeProduits: supplier.typeProduits || [],
      telephone: supplier.telephone || '',
      email: supplier.email || '',
      adresse: supplier.adresse || '',
      ville: supplier.ville || '',
      pays: supplier.pays || '',
      if: supplier.if || '',
      ice: supplier.ice || '',
      rc: supplier.rc || '',
      rib: supplier.rib || '',
      banque: supplier.banque || '', // Combobox might need handling
      delaiPaiement: supplier.delaiPaiement || undefined,
      modePaiement: supplier.modePaiement || undefined,
      remise: supplier.remise || undefined,
      contactNom: supplier.contactNom || '',
      contactTelephone: supplier.contactTelephone || '',
      contactEmail: supplier.contactEmail || '',
      notes: supplier.notes || '',
      statut: supplier.statut || 'Actif',
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
    } as any,
  });

  const { toast } = useToast();

  // Banks State
  const [banksList, setBanksList] = React.useState<{ id: number; name: string }[]>([]);
  const [isLoadingBanks, setIsLoadingBanks] = React.useState(true);

  React.useEffect(() => {
    async function loadBanks() {
      try {
        const data = await getSettings('banks');
        // Handle wrapped response or direct array
        const banksList = Array.isArray(data) ? data : (data?.data || []);
        setBanksList(banksList);
      } catch (error) {
        console.error("Failed to fetch banks:", error);
        setBanksList([]); // Ensure banksList is always an array
      } finally {
        setIsLoadingBanks(false);
      }
    }
    loadBanks();
  }, []);


  const onSubmit = async (data: SupplierFormValues) => {
    try {
      // Map form values to database schema
      const payload = {
        nomCommercial: data.nomCommercial, // Will be mapped to 'name' in action
        email: data.email,
        phone: data.telephone,
        address: data.adresse,
        city: data.ville,
        ice: data.ice,
        if: data.if,
        rc: data.rc,
        rib: data.rib,
        bank: data.banque,
        paymentTerms: data.delaiPaiement, // Map delaiPaiement -> paymentTerms
        paymentMethod: data.modePaiement, // Map modePaiement -> paymentMethod
        typeProduits: data.typeProduits, // Will be joined in action
        notes: data.notes || '',
        status: data.statut,
        // contact info mapped to notes/misc or ignored for now as schema is flat
        contactNom: data.contactNom,
        contactEmail: data.contactEmail,
        contactTelephone: data.contactTelephone,
      };

      if (supplier) {
        await updateSupplier(supplier.id, payload);
        toast({
          title: 'Fournisseur Modifié',
          description: `Le fournisseur "${data.nomCommercial}" a été mis à jour.`,
        });
        router.push(`/suppliers/${supplier.id}`);
        router.refresh();
      } else {
        await createSupplier(payload);
        toast({
          title: 'Fournisseur Ajouté',
          description: `Le fournisseur "${data.nomCommercial}" a été créé.`,
          variant: "default"
        });
        router.push('/suppliers');
      }
    } catch (error: any) {
      console.error("Erreur lors de la sauvegarde du fournisseur:", error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: `Une erreur s'est produite: ${error.message}`,
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
                <FormField
                  control={form.control}
                  name="banque"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Banque</FormLabel>
                      <SearchableSelect
                        options={banksList.map((bank) => ({
                          label: bank.name,
                          value: bank.name,
                        }))}
                        value={field.value}
                        onChange={field.onChange}
                        placeholder={isLoadingBanks ? "Chargement..." : "Sélectionner une banque"}
                        searchPlaceholder="Rechercher banque..."
                        disabled={isLoadingBanks}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField control={form.control} name="rib" render={({ field }) => (
                  <FormItem><FormLabel>RIB / IBAN</FormLabel><FormControl><Input placeholder="Numéro de compte" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="delaiPaiement" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Délai de Paiement</FormLabel>
                    <SearchableSelect
                      options={[
                        { label: 'Comptant', value: 'Comptant' },
                        { label: '30 jours', value: '30 jours' },
                        { label: '60 jours', value: '60 jours' },
                        { label: '90 jours', value: '90 jours' },
                      ]}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="-- Choisir --"
                      searchPlaceholder="Rechercher..."
                    />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="modePaiement" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mode de Paiement</FormLabel>
                    <SearchableSelect
                      options={[
                        { label: 'Espèces', value: 'Espèces' },
                        { label: 'Chèque', value: 'Chèque' },
                        { label: 'Virement', value: 'Virement' },
                        { label: 'Carte', value: 'Carte' },
                      ]}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="-- Choisir --"
                      searchPlaceholder="Rechercher..."
                    />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="remise" render={({ field }) => (
                  <FormItem><FormLabel>Remise Habituelle (%)</FormLabel><FormControl><Input type="number" placeholder="0" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem>
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
                  <FormItem>
                    <FormLabel>Statut du fournisseur</FormLabel>
                    <SearchableSelect
                      options={[
                        { label: 'Actif', value: 'Actif' },
                        { label: 'Inactif', value: 'Inactif' },
                      ]}
                      value={field.value}
                      onChange={field.onChange}
                      placeholder="-- Choisir un statut --"
                      searchPlaceholder="Rechercher..."
                    />
                    <FormMessage />
                  </FormItem>
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
          <SubmitButton
            type="submit"
            isLoading={form.formState.isSubmitting}
            label={supplier ? 'Enregistrer les modifications' : 'Enregistrer le fournisseur'}
            loadingLabel={supplier ? 'Enregistrement...' : 'Enregistrement...'}
          />
        </div>
      </form>
    </Form>
  );
}
