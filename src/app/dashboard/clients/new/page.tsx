'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient, Client } from '@/app/actions/clients-actions';
import { ClientForm } from '@/components/clients/client-form';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function NewClientPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [isSaving, setIsSaving] = React.useState(false);

    const handleSubmit = async (data: Partial<Client>) => {
        setIsSaving(true);
        try {
            const newClientData = {
                name: data.name!,
                phone: data.phone!,
                email: data.email,
                mutuelle: data.mutuelle,
                address: data.address,
                city: data.city, // Ensure city is passed
                dateOfBirth: data.dateOfBirth,
                prenom: data.prenom,
                nom: data.nom,
                gender: data.gender,
                cin: data.cin,
                phone2: data.phone2,
            };

            const result = await createClient(newClientData);
            if (result.success && result.id) {
                toast({
                    title: '✅ Succès',
                    description: 'Client créé avec succès',
                });
                router.push('/dashboard/clients'); 
            } else {
                toast({
                    title: '❌ Erreur',
                    description: result.error || "Erreur lors de la création",
                    variant: 'destructive',
                });
            }
        } catch (err) {
            toast({
                title: '❌ Erreur',
                description: "Une erreur est survenue",
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-6 p-6">
            <div className="w-fit">
                <Button asChild variant="outline" size="sm">
                    <Link href="/dashboard/clients" className="flex items-center gap-2">
                        <ChevronLeft className="h-4 w-4" />
                        Retour
                    </Link>
                </Button>
            </div>
            
            <div className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">Nouveau Client</h1>
                <p className="text-muted-foreground">Remplissez les informations ci-dessous pour créer un nouveau dossier client.</p>
            </div>

            <ClientForm
                onSubmit={handleSubmit}
                isSubmitting={isSaving}
                submitLabel="Créer le Client"
                onCancel={() => router.back()}
            />
        </div>
    );
}
