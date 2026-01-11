'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase, useUser, useCollection } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import type { Purchase, Supplier, Product } from '@/lib/types';
import { PageHeader } from '@/components/page-header';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
    TableFooter
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle, CheckCircle, PackageCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { confirmReception } from '@/services/commercial';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';


function PurchaseDetailsPageContent({ purchaseId }: { purchaseId: string }) {
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useUser();
    const { toast } = useToast();

    const [isConfirming, setIsConfirming] = React.useState(false);
    const [isConfirmOpen, setIsConfirmOpen] = React.useState(false);

    // --- Data Fetching ---
    const purchaseRef = useMemoFirebase(
        () => (firestore && user ? doc(firestore, `stores/${user.uid}/purchases`, purchaseId) : null),
        [firestore, purchaseId, user]
    );
    const { data: purchase, isLoading: isLoadingPurchase, error: purchaseError } = useDoc<Purchase>(purchaseRef);

    const supplierRef = useMemoFirebase(
        () => (firestore && purchase?.supplierId && user ? doc(firestore, `stores/${user.uid}/suppliers`, purchase.supplierId) : null),
        [firestore, purchase, user]
    );
    const { data: supplier, isLoading: isLoadingSupplier } = useDoc<Supplier>(supplierRef);

    // This is a simplification. In a real app, you'd fetch only the products in the purchase.
    const productsRef = useMemoFirebase(() => (firestore && user ? collection(firestore, `stores/${user.uid}/products`) : null), [firestore, user]);
    const { data: allProducts, isLoading: isLoadingProducts } = useCollection<Product>(productsRef);

    const productMap = React.useMemo(() => {
        if (!allProducts) return new Map();
        return new Map(allProducts.map(p => [p.id, p]));
    }, [allProducts]);

    const isLoading = isLoadingPurchase || isLoadingSupplier || isLoadingProducts;
    const error = purchaseError;

    const handleConfirmReception = async () => {
        if (!user || !firestore) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: "Vous n'êtes pas authentifié ou la connexion à la base de données a échoué.",
            });
            return;
        }

        setIsConfirming(true);
        try {
            await confirmReception(firestore, purchaseId);
            toast({
                title: 'Réception validée !',
                description: 'Le stock a été mis à jour avec succès.',
            });
            // Auto-update via real-time subscription
        } catch (e: any) {
            toast({
                variant: 'destructive',
                title: 'Erreur lors de la validation',
                description: e.message || 'Une erreur inconnue est survenue.',
            });
        } finally {
            setIsConfirming(false);
            setIsConfirmOpen(false);
        }
    };


    if (isLoading) {
        return (
            <>
                <PageHeader title={<Skeleton className="h-8 w-48" />} description={<Skeleton className="h-4 w-64" />} />
                <div className="space-y-6">
                    <Skeleton className="h-48 w-full" />
                    <Skeleton className="h-64 w-full" />
                </div>
            </>
        );
    }

    if (error) {
        return (
            <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Erreur</AlertTitle>
                <AlertDescription>Impossible de charger le bon de commande. {error.message}</AlertDescription>
            </Alert>
        );
    }

    if (!purchase) {
        return (
            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Bon de commande introuvable</AlertTitle>
                <AlertDescription>Aucun bon de commande trouvé avec cet identifiant.</AlertDescription>
            </Alert>
        )
    }

    const getStatusBadge = (status: Purchase['status']) => {
        switch (status) {
            case 'pending':
                return <Badge variant="destructive">En attente de réception</Badge>;
            case 'completed':
                return <Badge className="bg-green-100 text-green-800">Complété</Badge>;
            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };


    return (
        <>
            <PageHeader
                title={`Bon de Commande #${purchase.id.slice(0, 6)}`}
                description={`Détails du bon de commande passé le ${new Date(purchase.date).toLocaleDateString()}.`}
            />
            <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Articles Commandés</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Produit</TableHead>
                                        <TableHead className="text-center">Quantité</TableHead>
                                        <TableHead className="text-right">Coût Unitaire</TableHead>
                                        <TableHead className="text-right">Total</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {purchase.items.map((item, index) => {
                                        const product = productMap.get(item.productId);
                                        return (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{product?.nomProduit || 'Produit inconnu'}</TableCell>
                                                <TableCell className="text-center">{item.quantity}</TableCell>
                                                <TableCell className="text-right">{item.cost.toFixed(2)} MAD</TableCell>
                                                <TableCell className="text-right">{(item.quantity * item.cost).toFixed(2)} MAD</TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-right font-bold">Montant Total</TableCell>
                                        <TableCell className="text-right font-bold">{purchase.totalAmount.toFixed(2)} MAD</TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Statut</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {getStatusBadge(purchase.status)}
                        </CardContent>
                        {purchase.status === 'pending' && (
                            <CardFooter>
                                <Button onClick={() => setIsConfirmOpen(true)} disabled={isConfirming} className="w-full">
                                    {isConfirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                                    Valider la Réception
                                </Button>
                            </CardFooter>
                        )}
                    </Card>
                    <Card>
                        <CardHeader>
                            <CardTitle>Fournisseur</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {isLoadingSupplier ? <Skeleton className="h-6 w-3/4" /> : (
                                <div className="space-y-2">
                                    <p className="font-semibold">{supplier?.nomCommercial}</p>
                                    <p className="text-sm text-muted-foreground">{supplier?.telephone}</p>
                                    <p className="text-sm text-muted-foreground">{supplier?.email}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmer la réception ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action mettra à jour le stock pour tous les articles de ce bon de commande.
                            Elle est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmReception}>Confirmer</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}


export default function PurchaseClientView() {
    const params = useParams();
    const id = params.id as string;

    return (
        <div className="flex flex-1 flex-col gap-4">
            {id ? <PurchaseDetailsPageContent purchaseId={id} /> : <p>ID de commande non valide.</p>}
        </div>
    )
}
