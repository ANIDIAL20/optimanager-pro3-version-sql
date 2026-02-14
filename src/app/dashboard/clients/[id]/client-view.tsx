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
import { BrandLoader } from '@/components/ui/loader-brand';
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
import { InteractionHistory } from './_components/interaction-history';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useBreadcrumbStore } from '@/hooks/use-breadcrumb-store';
import { getClientReservationsAction } from '@/app/actions/reservation-actions';
import { ClientReservationsTab } from '@/features/reservations/components/client-reservations-tab';
import type { FrameReservation } from '@/features/reservations/types/reservation.types';
import { Tag } from 'lucide-react';

interface ClientDetailViewProps {
    initialClient: Client;
    initialReservations: FrameReservation[];
}

export default function ClientDetailView({ initialClient, initialReservations }: ClientDetailViewProps) {
    const params = useParams();
    const id = params.id as string;

    const searchParams = useSearchParams();
    const defaultTab = searchParams.get('tab') || 'overview';
    const [activeTab, setActiveTab] = React.useState(defaultTab);

    const client = initialClient;
    const reservations = initialReservations;
    
    // State to pass reservation to POS when clicking "Utiliser"
    const [reservationToProcess, setReservationToProcess] = React.useState<number | null>(null);
    const [orderToProcess, setOrderToProcess] = React.useState<number | null>(null);

    // Refresh key for other tabs that might still need manual refresh triggers
    const [refreshKey, setRefreshKey] = React.useState(0);
    const { setLabel } = useBreadcrumbStore();
    
    // Update breadcrumb label with client name
    React.useEffect(() => {
        if (client) {
            const name = `${client.prenom || ''} ${client.nom || ''}`.trim() || client.name;
            if (name && id) {
                setLabel(id, name);
            }
        }
    }, [client, id, setLabel]);

    // Update active tab when URL param changes (e.g. back button)
    React.useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        // Optional: Update URL without navigation to keep state in sync
        const url = new URL(window.location.href);
        url.searchParams.set('tab', value);
        window.history.replaceState({}, '', url);
    };

    const handleUseReservation = (res: FrameReservation) => {
        setReservationToProcess(res.id);
        setActiveTab('sales');
    };

    const handleUseOrder = (orderId: number) => {
        setOrderToProcess(orderId);
        setActiveTab('sales');
    };

    return (
        <div className="space-y-6 p-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-slate-100 h-10 w-10">
                    <Link href="/dashboard/clients">
                        <ArrowLeft className="h-5 w-5 text-slate-500" />
                    </Link>
                </Button>
                <div className="flex flex-col">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Navigation</span>
                    <span className="text-sm font-medium text-slate-600">Retour au Répertoire</span>
                </div>
            </div>

            {/* Patient Profile Header */}
            <ClientHeader client={client} clientId={id} />

            {/* Tabs Section */}
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
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
                    <TabsTrigger value="contact-orders" className="gap-2">
                        <ShoppingCart className="h-4 w-4" />
                        Commandes Lentilles
                    </TabsTrigger>
                    <TabsTrigger value="purchase-history" className="gap-2 text-emerald-600 data-[state=active]:bg-emerald-50">
                        <ShoppingBag className="h-4 w-4" />
                        Historique d'Achats
                    </TabsTrigger>
                    <TabsTrigger value="interactions" className="gap-2 text-indigo-600 data-[state=active]:bg-indigo-50">
                        <MessageSquare className="h-4 w-4" />
                        Journal de Bord
                    </TabsTrigger>
                    <TabsTrigger value="reservations" className="gap-2 text-orange-600 data-[state=active]:bg-orange-50">
                        <Tag className="h-4 w-4" />
                        Réservations {reservations.length > 0 && `(${reservations.length})`}
                    </TabsTrigger>
                </TabsList>

                {/* Overview Tab - Mini Bento Grid */}
                <TabsContent value="overview">
                    <ClientOverview client={client} clientId={id} onTabChange={handleTabChange} />
                </TabsContent>

                {/* Point de Vente Tab */}
                <TabsContent value="sales" className="space-y-6">
                    <ClientPOSTab 
                        client={client} 
                        clientId={id} 
                        initialReservationId={reservationToProcess}
                        initialOrderId={orderToProcess}
                    />
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

                <TabsContent value="lens-orders" className="space-y-6">
                    <LensOrderForm clientId={id} mode="glasses" onSuccess={() => setRefreshKey(prev => prev + 1)} />
                    <Separator />
                    <LensOrderList 
                        key={`lens-orders-${refreshKey}`} 
                        mode="glasses" 
                        clientId={id} 
                        clientName={`${client?.prenom || ''} ${client?.nom || ''}`}
                        onUseOrder={handleUseOrder}
                    />
                </TabsContent>

                {/* Contact Lens Orders Tab */}
                <TabsContent value="contact-orders" className="space-y-6">
                    <LensOrderForm clientId={id} mode="contacts" onSuccess={() => setRefreshKey(prev => prev + 1)} />
                    <Separator />
                    <LensOrderList 
                        key={`contact-orders-${refreshKey}`} 
                        mode="contacts" 
                        clientId={id} 
                        clientName={`${client?.prenom || ''} ${client?.nom || ''}`}
                        onUseOrder={handleUseOrder}
                    />
                </TabsContent>

                {/* Purchase History Tab */}
                <TabsContent value="interactions">
                    <InteractionHistory clientId={id} />
                </TabsContent>

                <TabsContent value="purchase-history">
                    <PurchaseHistoryTable clientId={id} />
                </TabsContent>

                {/* Reservations Tab */}
                <TabsContent value="reservations">
                    <ClientReservationsTab 
                        clientId={parseInt(id)} 
                        reservations={reservations}
                        onUseReservation={handleUseReservation}
                    />
                </TabsContent>
            </Tabs>
        </div>
    );
}
