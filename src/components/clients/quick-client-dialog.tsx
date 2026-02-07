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
    DialogTrigger,
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
    /** Controlled: parent controls open state */
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    onClientCreated: (client: Client) => void;
    /** Uncontrolled: render a trigger button to open dialog */
    trigger?: React.ReactNode;
}

/**
 * Unified QuickClientDialog - supports both controlled and uncontrolled usage.
 * Use `open` + `onOpenChange` for controlled mode (e.g. inside client selector).
 * Use `trigger` for uncontrolled mode (e.g. "Nouveau Client" button).
 */
export function QuickClientDialog({
    open: controlledOpen,
    onOpenChange: controlledOnOpenChange,
    onClientCreated,
    trigger,
}: QuickClientDialogProps) {
    const { toast } = useToast();
    const [internalOpen, setInternalOpen] = React.useState(false);

    const isControlled = controlledOnOpenChange !== undefined;
    const open = isControlled ? (controlledOpen ?? false) : internalOpen;
    const setOpen = isControlled ? controlledOnOpenChange! : setInternalOpen;

    const [mutuellesList, setMutuellesList] = React.useState<Array<{ id: string; name: string }>>([]);
    const [isLoadingMutuelles, setIsLoadingMutuelles] = React.useState(true);

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
                name: `${data.prenom} ${data.nom}`,
                nom: data.nom,
                prenom: data.prenom,
                phone: data.telephone1,
                email: '',
                address: '',
                city: data.ville || '',
                mutuelle: data.mutuelle || '',
                cin: data.cni || undefined,
            });

            if (result.success && result.id) {
                toast({
                    title: 'Client créé',
                    description: `${data.prenom} ${data.nom} a été ajouté avec succès.`,
                });

                form.reset();
                const newClient: Client = {
                    id: result.id,
                    nom: data.nom,
                    prenom: data.prenom,
                    telephone1: data.telephone1,
                    cni: data.cni || '',
                    ville: data.ville || '',
                    sexe: 'Homme',
                    creditBalance: 0,
                    lastVisit: new Date().toISOString(),
                } as Client;

                onClientCreated(newClient);
                setOpen(false);
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

    const content = (
        <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Nouveau Client Rapide
                </DialogTitle>
                <DialogDescription>
                    Créez un nouveau client rapidement
                </DialogDescription>
            </DialogHeader>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
    );

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
            {content}
        </Dialog>
    );
}
