'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { createClient, Client } from '@/app/actions/clients-actions';
import { ClientForm } from '@/components/clients/client-form';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Users } from 'lucide-react';
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
                router.push(`/dashboard/clients/${result.id}`); 
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
        <div className="flex flex-1 flex-col gap-8 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-slate-100 h-10 w-10">
                        <Link href="/dashboard/clients">
                            <ArrowLeft className="h-5 w-5 text-slate-500" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                <div className="h-10 w-10 bg-blue-50 rounded-lg flex items-center justify-center text-blue-600">
                                    <Users className="h-6 w-6" />
                                </div>
                                Nouveau Client
                            </h1>
                        </div>
                        <p className="text-slate-500 ml-1">Enregistrement d'un nouveau patient dans la base de données</p>
                    </div>
                </div>
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
