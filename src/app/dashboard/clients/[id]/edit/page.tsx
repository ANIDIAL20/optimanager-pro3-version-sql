'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { Calendar as CalendarIcon, ArrowLeft, Users } from 'lucide-react';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { updateClient, getClient } from '@/app/actions/clients-actions';
import { useToast } from '@/hooks/use-toast';
import { MutuelleSelector } from '@/components/clients/mutuelle-selector';
import type { Client } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';
import { BrandLoader } from '@/components/ui/loader-brand';

const ClientSchema = z.object({
    nom: z.string().min(1, 'Le nom est requis.'),
    prenom: z.string().min(1, 'Le prénom est requis.'),
    sexe: z.string().optional(),
    dateNaissance: z.date().optional(),
    cni: z.string().optional(),
    email: z.string().email('Email invalide.').optional().or(z.literal('')),
    telephone1: z.string().min(1, 'Le téléphone est requis.'),
    telephone2: z.string().optional(),
    ville: z.string().optional(),
    adresse: z.string().optional(),
    assuranceId: z.string().optional(),
    mutuelle: z.string().optional(),
});

type ClientFormValues = z.infer<typeof ClientSchema>;

export default function EditClientPage() {
    const router = useRouter();
    const params = useParams();
    const id = params.id as string;
    const { toast } = useToast();

    const [client, setClient] = React.useState<Client | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    const form = useForm<ClientFormValues>({
        resolver: zodResolver(ClientSchema),
        defaultValues: {
            nom: '',
            prenom: '',
            sexe: 'Homme',
            cni: '',
            email: '',
            telephone1: '',
            telephone2: '',
            ville: '',
            adresse: '',
            mutuelle: '',
        },
    });

    // Replace clientRef with direct ID usage
    
    React.useEffect(() => {
         let isMounted = true;
         async function load() {
             try {
                const res = await getClient(id);
                if (!isMounted) return;
                
                if (res.success && res.client) {
                     const c = res.client;
                     const nameParts = c.name.split(' ');
                     const prenom = nameParts.length > 1 ? nameParts[0] : '';
                     const nom = nameParts.length > 1 ? nameParts.slice(1).join(' ') : c.name;
                     
                     const adapted = {
                         ...c,
                         nom,
                         prenom,
                         telephone1: c.phone || '',
                     } as unknown as Client;
                     
                     setClient(adapted);
                     
                     // Reset form
                     form.reset({
                        nom: nom || '',
                        prenom: prenom || '',
                        sexe: 'Homme',
                        cni: '',
                        email: c.email || '',
                        telephone1: c.phone || '',
                        telephone2: '',
                        ville: '',
                        adresse: c.address || '',
                        mutuelle: c.mutuelle || '',
                        dateNaissance: c.dateOfBirth ? new Date(c.dateOfBirth) : undefined,
                     });
                } else {
                    setError(res.error || "Client introuvable");
                }
             } catch (err) {
                 if (isMounted) setError("Erreur de chargement");
             } finally {
                 if (isMounted) setIsLoading(false);
             }
         }
         load();
         return () => { isMounted = false; };
    }, [id, form]);

    const onSubmit = async (data: ClientFormValues) => {
        try {
            const updatedData = {
                ...data, // This data has nom/prenom
                name: `${data.prenom} ${data.nom}`, // Map to new schema
                phone: data.telephone1,
                sexe: data.sexe === 'Homme' ? 'M' : 'F',
                dateNaissance: data.dateNaissance ? format(data.dateNaissance, 'yyyy-MM-dd') : null,
            };

            // ✅ FIX: secureAction injects userId automatically, only pass clientId and data
            const result = await updateClient(id, updatedData);

            if (result.success) {
                toast({
                    title: 'Client Mis à jour',
                    description: `Le profil de ${data.prenom} ${data.nom} a été modifié avec succès.`,
                });
                router.push(`/dashboard/clients/${id}`);
            } else {
                 toast({
                    variant: 'destructive',
                    title: 'Erreur',
                    description: result.error || "Une erreur s'est produite lors de la mise à jour.",
                });
            }

        } catch (error) {
            console.error(error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: "Une erreur s'est produite lors de la mise à jour.",
            });
        }
    };

    if (isLoading) {
        return <div className="p-8 space-y-4"><Skeleton className="h-10 w-48" /><Skeleton className="h-96 w-full" /></div>;
    }

    if (error || !client) {
        return <div className="p-8">Impossible de charger le client.</div>;
    }

    return (
        <div className="flex flex-1 flex-col gap-6 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-slate-100 h-10 w-10">
                        <Link href={`/dashboard/clients/${id}`}>
                            <ArrowLeft className="h-5 w-5 text-slate-500" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                    <Users className="h-6 w-6" />
                                </div>
                                Modifier le Profil
                            </h1>
                        </div>
                        <p className="text-slate-500 ml-1">Mise à jour des informations pour {client.prenom} {client.nom}</p>
                    </div>
                </div>
            </div>
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)}>
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Informations Personnelles</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <FormField control={form.control} name="nom" render={({ field }) => (<FormItem><FormLabel>Nom</FormLabel><FormControl><Input placeholder="e.g., Dupont" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="prenom" render={({ field }) => (<FormItem><FormLabel>Prénom</FormLabel><FormControl><Input placeholder="e.g., Jean" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="sexe" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Sexe</FormLabel>
                                    <SearchableSelect
                                        options={[
                                            { label: 'Homme', value: 'Homme' },
                                            { label: 'Femme', value: 'Femme' }
                                        ]}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Choisir le sexe"
                                        searchPlaceholder="Rechercher..."
                                    />
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="dateNaissance" render={({ field }) => (<FormItem className="flex flex-col"><FormLabel>Date de Naissance</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={'outline'} className={cn('w-full justify-start text-left font-normal', !field.value && 'text-muted-foreground')}>{field.value ? (format(field.value, 'dd/MM/yyyy')) : (<span>jj/mm/aaaa</span>)}<CalendarIcon className="ml-2 h-4 w-4" /></Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                initialFocus
                                captionLayout="dropdown-buttons"
                                fromYear={1920}
                                toYear={new Date().getFullYear()}
                                classNames={{
                                    caption_label: "hidden",
                                    caption_dropdowns: "flex justify-center gap-2 p-1",
                                    dropdown: "bg-background cursor-pointer p-1 text-sm font-medium border rounded-md hover:bg-accent",
                                    dropdown_month: "ml-0",
                                    dropdown_year: "ml-0",
                                }}
                            /></PopoverContent></Popover><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="cni" render={({ field }) => (<FormItem><FormLabel>CNI</FormLabel><FormControl><Input placeholder="e.g., BK123456" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="mutuelle" render={({ field }) => (<FormItem><FormLabel>Mutuelle</FormLabel><FormControl><MutuelleSelector value={field.value || ''} onSelect={field.onChange} /></FormControl><FormMessage /></FormItem>)} />
                        </CardContent>

                        <CardHeader><CardTitle className="font-headline">Coordonnées</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
                            <FormField control={form.control} name="telephone1" render={({ field }) => (<FormItem><FormLabel>Téléphone 1</FormLabel><FormControl><Input type="tel" placeholder="e.g., 0612345678" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="telephone2" render={({ field }) => (<FormItem><FormLabel>Téléphone 2 (Optionnel)</FormLabel><FormControl><Input type="tel" placeholder="e.g., 0187654321" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" placeholder="e.g., jean.dupont@example.com" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="ville" render={({ field }) => (<FormItem><FormLabel>Ville</FormLabel><FormControl><Input placeholder="e.g., Paris" {...field} /></FormControl><FormMessage /></FormItem>)} />
                            <FormField control={form.control} name="adresse" render={({ field }) => (<FormItem className="md:col-span-2"><FormLabel>Adresse</FormLabel><FormControl><Input placeholder="e.g., 123 Rue de la République" {...field} /></FormControl><FormMessage /></FormItem>)} />
                        </CardContent>

                        <CardFooter className="flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => router.back()}>Annuler</Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && <BrandLoader size="sm" className="mr-2" />}
                                Enregistrer les modifications
                            </Button>
                        </CardFooter>
                    </Card>
                </form>
            </Form>
        </div>
    );
}
