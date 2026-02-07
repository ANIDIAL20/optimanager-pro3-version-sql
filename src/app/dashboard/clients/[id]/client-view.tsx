'use client';

import * as React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import {
    ChevronLeft,
    FileText,
    History,
    ShoppingCart,
    DollarSign,
    User,
    Eye,
    Glasses,
    ShoppingBag,
} from 'lucide-react';
import Link from 'next/link';
import { getClient } from '@/app/actions/clients-actions';
import type { Client } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { PrescriptionForm } from './_components/prescription-form';
import { ContactLensPrescriptionForm } from './_components/contact-lens-prescription-form';
import { PrescriptionList } from './_components/prescription-list';
import { ContactLensPrescriptionList } from './_components/contact-lens-prescription-list';
import { Separator } from '@/components/ui/separator';
import { LensOrderForm } from './_components/lens-order-form';
import { LensOrderList } from './_components/lens-order-list';
import { ClientPOSTab } from '@/components/clients/client-pos-tab';
import { PurchaseHistoryTable } from './_components/purchase-history-table';
import { ClientHeader } from '@/components/dashboard/clients/client-header';
import { ClientOverview } from '@/components/dashboard/clients/tabs/client-overview';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { BackButton } from '@/components/ui/back-button';

export default function ClientDetailView() {
    const params = useParams();
    const id = params.id as string;

    const searchParams = useSearchParams();
    const activeTab = searchParams.get('tab') || 'overview';

    const [client, setClient] = React.useState<Client | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [refreshKey, setRefreshKey] = React.useState(0);
    
    React.useEffect(() => {
        async function fetchClient() {
            try {
                const result = await getClient(id);
                if (result.success && result.client) {
                    const c = result.client;
                    // Adapter: Map Server Action Client (name, phone) to Legacy Client (nom, prenom, telephone1)
                    const nameParts = c.name.split(' ');
                    const prenom = nameParts.length > 1 ? nameParts[0] : '';
                    const nom = nameParts.length > 1 ? nameParts.slice(1).join(' ') : c.name;

                    const adaptedClient: Client = {
                        ...c,
                        id: c.id!, // ensure ID
                        nom,
                        prenom,
                        telephone1: c.phone || '', // Map phone
                        // Ensure other required legacy fields if missing
                    } as unknown as Client; // Force cast for now to avoid extensive type rewrites

                    setClient(adaptedClient);
                } else {
                    setError(result.error || "Impossible de charger le client");
                }
            } catch (err) {
                console.error(err);
                setError("Erreur de connexion");
            } finally {
                setIsLoading(false);
            }
        }
        if (id) fetchClient();
    }, [id]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Skeleton className="h-9 w-24" />
                </div>
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-10 w-full max-w-md" />
                <Skeleton className="h-96 w-full" />
            </div>
        );
    }

    if (error) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Erreur</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-destructive">
                        {error}
                    </p>
                </CardContent>
            </Card>
        );
    }

    if (!client) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Client non trouvé</CardTitle>
                </CardHeader>
                <CardContent>
                    <p>
                        Le client avec l'ID {id} n'a pas été trouvé.
                    </p>
                    <Button asChild className="mt-4">
                        <Link href="/clients">
                            <ChevronLeft /> Retour à la liste des clients
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            <div className="w-fit">
                <BackButton />
            </div>

            {/* Patient Profile Header */}
            <ClientHeader client={client} clientId={id} />

            {/* Tabs Section */}
            <Tabs defaultValue={activeTab} className="space-y-6">
                <TabsList className="bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
                    <TabsTrigger value="overview" className="gap-2">
                        <User className="h-4 w-4" />
                        Aperçu
                    </TabsTrigger>
                    <TabsTrigger value="sales" className="gap-2">
                        <DollarSign className="h-4 w-4"/>
                        Point de Vente
                    </TabsTrigger>
                    <TabsTrigger value="prescriptions" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Prescriptions
                    </TabsTrigger>
                    <TabsTrigger value="lens-orders" className="gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Commandes Verres
                    </TabsTrigger>
                    <TabsTrigger value="purchase-history" className="gap-2">
                        <ShoppingBag className="h-4 w-4" />
                        Historique d'Achats
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab - Mini Bento Grid */}
                <TabsContent value="overview">
                    <ClientOverview client={client} clientId={id} />
                </TabsContent>

                {/* Point de Vente Tab */}
                <TabsContent value="sales" className="space-y-6">
                    <ClientPOSTab client={client} clientId={id} />
                </TabsContent>

                {/* Prescriptions Tab */}
                <TabsContent value="prescriptions">
                    <Tabs defaultValue="glasses">
                        <TabsList className="bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
                            <TabsTrigger value="glasses" className="gap-2">
                                <Glasses className="h-4 w-4" />
                                Lunettes
                            </TabsTrigger>
                            <TabsTrigger value="contacts" className="gap-2">
                                <Eye className="h-4 w-4" />
                                Lentilles de Contact
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="glasses" className="space-y-6 mt-6">
                            <PrescriptionForm clientId={id} onSuccess={() => setRefreshKey(prev => prev + 1)} />
                            <Separator />
                            <PrescriptionList key={refreshKey} clientId={id} />
                        </TabsContent>
                        <TabsContent value="contacts" className="space-y-6 mt-6">
                            <ContactLensPrescriptionForm clientId={id} onSuccess={() => setRefreshKey(prev => prev + 1)} />
                            <Separator />
                            <ContactLensPrescriptionList key={refreshKey} clientId={id} />
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                {/* Lens Orders Tab */}
                <TabsContent value="lens-orders" className="space-y-6">
                    <LensOrderForm clientId={id} onSuccess={() => setRefreshKey(prev => prev + 1)} />
                    <Separator />
                    <LensOrderList key={`lens-orders-${refreshKey}`} clientId={id} clientName={`${client?.prenom || ''} ${client?.nom || ''}`} />
                </TabsContent>

                {/* Purchase History Tab */}
                <TabsContent value="purchase-history">
                    <PurchaseHistoryTable clientId={id} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
