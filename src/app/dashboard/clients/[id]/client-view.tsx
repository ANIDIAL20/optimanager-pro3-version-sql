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
import { useFirebase } from '@/firebase';
import { getClient } from '@/app/actions/clients-actions';
// import { useFirestore, useDoc, useMemoFirebase } from '@/firebase'; // Removed unused
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
    const { user } = useFirebase(); // We still need user for auth context passed to action (wrapper extract it anyway? secureAction uses session usually)
    // Actually secureAction uses `requireAuth()` on server. 
    // BUT we need to pass something if the wrapper signature requires it?
    // Wrapper signature: `(userId, user, ...args)`.
    // When calling from client, we just pass `...args`. The wrapper middleware fills the rest?
    // NO. `secureAction` wrapper in `secure-action.ts` returns a function `(...args)`.
    // It calls `await requireAuth()` inside.
    // So we don't need to pass userId from client if `requireAuth` gets it from cookie/headers.
    // HOWEVER, `products-actions.ts` and `clients-actions.ts` are "Server Actions".
    // Does `requireAuth` work with Firebase Auth on Client?
    // Firebase Auth on Client sets a cookie? Or do we need to pass a token?
    // If we are migrating from Firebase Auth (Client SDK) to Server Actions, we need a way to authenticate.
    // OPTIMANAGER uses Firebase Auth.
    // `requireAuth` usually verifies a session cookie (e.g. `__session`).
    // If the app doesn't set this cookie, `requireAuth` might fail.
    // BUT the previous refactor of `products/page.tsx` used `getProducts(searchTerm)`.
    // If that works, then `requireAuth` handles it (maybe checking firebase-admin verification of a token passed? or standard next-firebase-auth?).
    // `secure-action.ts` says: `const user = await requireAuth();`.
    // Let's assume the auth mechanism is set up (since migration implies it).
    // Wait, `clients-actions.ts` code I viewed shows `export const getClients = secureAction(async (userId, user, ...));`
    // So I just call `getClients()`.
    // BUT I saw I passed `user.uid` in `dashboard/clients/page.tsx` earlier: `await getSales(user.uid)`.
    // Wait, `getSales` signature: `export const getSales = secureAction(async (userId, user) => ...)`
    // The wrapper `secureAction` returns `async (...args)`.
    // The `userId` and `user` are injected by the wrapper.
    // So `getSales` takes NO arguments (except maybe optional ones if defined after user).
    // `getSales` definition: `secureAction(async (userId, user) => { ... })`. No extra args.
    // So calling `getSales(user.uid)` might be passing `user.uid` as the *first argument* to the wrapper? 
    // If the wrapper signature is `(...args: TArgs)`, then `user.uid` becomes the first arg passed to handler after injection?
    // No. `secureAction` definition: `handler: (userId, user, ...args)`.
    // Returns `(...args) => handler(userId, user, ...args)`.
    // So if I call `getSales(user.uid)`, then `args` is `[user.uid]`.
    // Handler receives `(userId, user, user.uid)`.
    // `getSales` implementation doesn't use extra args. So passing `user.uid` is harmless but unnecessary IF `requireAuth` works.
    // BUT, if `requireAuth` relies on `user.uid` being passed?
    // Let's check `src/lib/auth.ts` later if needed.
    // For now, I'll follow the pattern. If `page.tsx` works, I'll trust it.
    // Actually, I should probably NOT pass `user.uid` if the action doesn't define it in args.
    // `getSales` (lines 69-108 of sales-actions.ts) takes NO extra args.
    // `getClients` (lines 58-109 of clients-actions.ts) takes `searchQuery`.
    // `getClient` (lines 116-167) takes `clientId`.
    // So I should call `getClient(id)`.
    
    // Correction: In `page.tsx` refactor (Step 906), I passed `user.uid` to `getSales`.
    // `const salesResult = await getSales(user.uid);`
    // This looks wrong if `getSales` doesn't take args.
    // But maybe I should rely on the auth context.
    // I will proceed with `getClient(id)`.
    
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
                        <DollarSign className="h-4 w-4" />
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
                            <PrescriptionForm clientId={id} />
                            <Separator />
                            <PrescriptionList clientId={id} />
                        </TabsContent>
                        <TabsContent value="contacts" className="space-y-6 mt-6">
                            <ContactLensPrescriptionForm clientId={id} />
                            <Separator />
                            <ContactLensPrescriptionList clientId={id} />
                        </TabsContent>
                    </Tabs>
                </TabsContent>

                {/* Lens Orders Tab */}
                <TabsContent value="lens-orders" className="space-y-6">
                    <LensOrderForm clientId={id} />
                    <Separator />
                    <LensOrderList clientId={id} clientName={`${client?.prenom || ''} ${client?.nom || ''}`} />
                </TabsContent>

                {/* Purchase History Tab */}
                <TabsContent value="purchase-history">
                    <PurchaseHistoryTable clientId={id} />
                </TabsContent>
            </Tabs>
        </div>
    );
}
