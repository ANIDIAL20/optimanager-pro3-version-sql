'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { useFirebase } from '@/firebase';
import { createClient, Client } from '@/app/actions/clients-actions';
import { ClientForm } from '@/components/clients/client-form';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function NewClientPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { user } = useFirebase();
    const [isSaving, setIsSaving] = React.useState(false);

    const handleSubmit = async (data: Partial<Client>) => {
        if (!user) return;
        setIsSaving(true);
        try {
            // Ensure mandatory fields are present. ClientForm validates this already via HTML required attributes,
            // but we double check or just cast.
            const newClientData = {
                name: data.name!,
                phone: data.phone!,
                email: data.email,
                mutuelle: data.mutuelle,
                address: data.address,
                dateOfBirth: data.dateOfBirth,
            };

            const result = await createClient(newClientData);
            if (result.success && result.id) {
                toast({
                    title: '✅ Succès',
                    description: 'Client créé avec succès',
                });
                router.push(`/dashboard/clients/${result.id}`); // Redirect to new client dossier
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
        <div className="container mx-auto max-w-2xl py-10 space-y-6">
            <Button asChild variant="ghost" className="mb-4">
                <Link href="/dashboard/clients">
                    <ChevronLeft className="mr-2 h-4 w-4" />
                    Retour aux clients
                </Link>
            </Button>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                            <UserPlus className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                            <CardTitle>Nouveau Client</CardTitle>
                            <CardDescription>
                                Créez un nouveau dossier client.
                            </CardDescription>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <ClientForm
                        onSubmit={handleSubmit}
                        isSubmitting={isSaving}
                        submitLabel="Créer le Client"
                        onCancel={() => router.back()}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
