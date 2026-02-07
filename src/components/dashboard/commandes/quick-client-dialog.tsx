'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/app/actions/clients-actions';
import { UserPlus } from 'lucide-react';
import type { Client } from '@/lib/types';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { getInsurances } from '@/app/actions/settings-actions';
import { BrandLoader } from '@/components/ui/loader-brand';

const quickClientSchema = z.object({
    nom: z.string().min(1, 'Le nom est requis'),
    prenom: z.string().min(1, 'Le prénom est requis'),
    telephone1: z.string().min(1, 'Le téléphone est requis'),
    cni: z.string().optional(),
    ville: z.string().optional(),
    mutuelle: z.string().optional(),
});

type QuickClientFormValues = z.infer<typeof quickClientSchema>;

interface QuickClientDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onClientCreated: (client: Client) => void;
}

export function QuickClientDialog({
    open,
    onOpenChange,
    onClientCreated,
}: QuickClientDialogProps) {
    const { toast } = useToast();
    const [mutuellesList, setMutuellesList] = React.useState<Array<{ id: string; name: string }>>([]);
    const [isLoadingMutuelles, setIsLoadingMutuelles] = React.useState(true);

    // Fetch mutuelles on mount
    React.useEffect(() => {
        async function fetchMutuelles() {
            try {
                const result = await getInsurances();
                if (Array.isArray(result)) {
                    setMutuellesList(result);
                }
            } catch (error) {
                console.error('Error fetching mutuelles:', error);
            } finally {
                setIsLoadingMutuelles(false);
            }
        }
        fetchMutuelles();
    }, []);

    const form = useForm<QuickClientFormValues>({
        resolver: zodResolver(quickClientSchema),
        defaultValues: {
            nom: '',
            prenom: '',
            telephone1: '',
            cni: '',
            ville: '',
            mutuelle: '',
        },
    });

    const onSubmit = async (data: QuickClientFormValues) => {
        try {
            const result = await createClient({
                fullName: `${data.prenom} ${data.nom}`,
                phone: data.telephone1,
                email: '',
                address: '',
                city: data.ville || '',
                mutuelle: data.mutuelle || '',
                notes: ''
            });

            if (result.success) {
                toast({
                    title: 'Client créé',
                    description: `${data.prenom} ${data.nom} a été ajouté avec succès.`,
                });

                // Reset form
                form.reset();

                // Create client object for parent
                const newClient: Client = {
                    id: result.id!,
                    nom: data.nom,
                    prenom: data.prenom,
                    telephone1: data.telephone1,
                    cni: data.cni || '',
                    ville: data.ville || '',
                    sexe: 'Homme',
                    creditBalance: 0,
                    lastVisit: new Date().toISOString()
                } as Client;

                // Notify parent and close
                onClientCreated(newClient);
                onOpenChange(false);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Erreur',
                    description: result.error || 'Impossible de créer le client.',
                });
            }
        } catch (error) {
            console.error('Error creating client:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Impossible de créer le client.',
            });
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        Nouveau Client Rapide
                    </DialogTitle>
                    <DialogDescription>
                        Créez un nouveau client rapidement pour cette commande
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        {/* Row 1: Nom | Prénom */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="nom"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Nom *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Dupont" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="prenom"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Prénom *</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Jean" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Row 2: Téléphone | CNI */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="telephone1"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Téléphone *</FormLabel>
                                        <FormControl>
                                            <Input type="tel" placeholder="0612345678" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="cni"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>CNI</FormLabel>
                                        <FormControl>
                                            <Input placeholder="BK123456" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* Row 3: Ville (Full width) */}
                        <FormField
                            control={form.control}
                            name="ville"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ville</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Casablanca" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        {/* Row 4: Mutuelle (Full width) */}
                        <FormField
                            control={form.control}
                            name="mutuelle"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mutuelle</FormLabel>
                                    <SearchableSelect
                                        options={[
                                            { label: 'Aucune', value: 'AUCUNE' },
                                            ...mutuellesList.map((m) => ({
                                                label: m.name,
                                                value: m.name,
                                            }))
                                        ]}
                                        value={field.value}
                                        onChange={field.onChange}
                                        placeholder="Sélectionner..."
                                        searchPlaceholder="Rechercher une mutuelle..."
                                        disabled={isLoadingMutuelles}
                                    />
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                            >
                                Annuler
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting && (
                                    <BrandLoader size="sm" className="mr-2" />
                                )}
                                Créer et Sélectionner
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
