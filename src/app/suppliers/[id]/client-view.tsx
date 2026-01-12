'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc } from 'firebase/firestore';
import {
    useFirestore,
    useDoc,
    useFirebase,
    deleteDocumentNonBlocking,
} from '@/firebase';
import type { Supplier } from '@/lib/types';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import { BackButton } from '@/components/ui/back-button';

export default function SupplierView() {
    const params = useParams();
    const router = useRouter();
    const firestore = useFirestore();
    const { user } = useFirebase();
    const { toast } = useToast();
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);

    const supplierId = params.id as string;

    const supplierRef = React.useMemo(
        () =>
            firestore && user
                ? doc(firestore, `stores/${user.uid}/suppliers`, supplierId)
                : null,
        [firestore, user, supplierId]
    );

    const { data: supplier, isLoading, error } = useDoc<Supplier>(supplierRef);

    const handleDelete = () => {
        if (!supplierRef || !supplier) return;
        deleteDocumentNonBlocking(supplierRef);
        toast({
            title: 'Fournisseur supprimé',
            description: `Le fournisseur "${supplier.nomCommercial}" a été supprimé.`,
        });
        router.push('/suppliers');
    };

    if (isLoading) {
        return (
            <div className="flex flex-1 flex-col gap-4">
                <div className="flex items-center justify-between">
                    <div className="space-y-2">
                        <Skeleton className="h-8 w-64" />
                        <Skeleton className="h-4 w-96" />
                    </div>
                    <div className="flex gap-2">
                        <Skeleton className="h-10 w-24" />
                        <Skeleton className="h-10 w-24" />
                    </div>
                </div>
                <div className="grid gap-6 lg:grid-cols-3">
                    <div className="lg:col-span-2 space-y-6">
                        <Skeleton className="h-64 w-full" />
                        <Skeleton className="h-40 w-full" />
                        <Skeleton className="h-40 w-full" />
                    </div>
                    <div className="space-y-6">
                        <Skeleton className="h-32 w-full" />
                    </div>
                </div>
            </div>
        );
    }

    if (error || !supplier) {
        return (
            <div className="flex flex-1 flex-col gap-4">
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>
                        Impossible de charger les informations du fournisseur. Le fournisseur n'existe peut-être pas.
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    return (
        <div className="flex flex-1 flex-col gap-4">
            <div className="w-fit">
                <BackButton />
            </div>
            <PageHeader
                title={supplier.nomCommercial}
                description={supplier.raisonSociale || 'Détails du fournisseur'}
            >
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/suppliers/${supplierId}/edit`)}
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => setShowDeleteDialog(true)}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                    </Button>
                </div>
            </PageHeader>

            <div className="grid gap-6 lg:grid-cols-3">
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Informations Générales</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-muted-foreground">Nom Commercial</p>
                                <p className="font-medium">{supplier.nomCommercial}</p>
                            </div>
                            {supplier.raisonSociale && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Raison Sociale</p>
                                    <p className="font-medium">{supplier.raisonSociale}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-muted-foreground">Téléphone</p>
                                <p className="font-medium">{supplier.telephone}</p>
                            </div>
                            {supplier.email && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <p className="font-medium">{supplier.email}</p>
                                </div>
                            )}
                            {supplier.adresse && (
                                <div className="col-span-2">
                                    <p className="text-sm text-muted-foreground">Adresse</p>
                                    <p className="font-medium">{supplier.adresse}</p>
                                </div>
                            )}
                            {supplier.ville && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Ville</p>
                                    <p className="font-medium">{supplier.ville}</p>
                                </div>
                            )}
                            {supplier.pays && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Pays</p>
                                    <p className="font-medium">{supplier.pays}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Informations Légales / Fiscales</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 gap-4">
                            {supplier.if && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Identifiant Fiscal (IF)</p>
                                    <p className="font-medium">{supplier.if}</p>
                                </div>
                            )}
                            {supplier.ice && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Identifiant Commun de l'Entreprise (ICE)</p>
                                    <p className="font-medium">{supplier.ice}</p>
                                </div>
                            )}
                            {supplier.rc && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Registre de Commerce (RC)</p>
                                    <p className="font-medium">{supplier.rc}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Informations de Contact</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            {supplier.contactNom && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Nom du contact</p>
                                    <p className="font-medium">{supplier.contactNom}</p>
                                </div>
                            )}
                            {supplier.contactTelephone && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Téléphone du contact</p>
                                    <p className="font-medium">{supplier.contactTelephone}</p>
                                </div>
                            )}
                            {supplier.contactEmail && (
                                <div className="col-span-2">
                                    <p className="text-sm text-muted-foreground">Email du contact</p>
                                    <p className="font-medium">{supplier.contactEmail}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Informations Bancaires et Commerciales</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            {supplier.banque && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Banque</p>
                                    <p className="font-medium">{supplier.banque}</p>
                                </div>
                            )}
                            {supplier.rib && (
                                <div>
                                    <p className="text-sm text-muted-foreground">RIB / IBAN</p>
                                    <p className="font-medium">{supplier.rib}</p>
                                </div>
                            )}
                            {supplier.delaiPaiement && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Délai de Paiement</p>
                                    <p className="font-medium">{supplier.delaiPaiement}</p>
                                </div>
                            )}
                            {supplier.modePaiement && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Mode de Paiement</p>
                                    <p className="font-medium">{supplier.modePaiement}</p>
                                </div>
                            )}
                            {supplier.remise !== undefined && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Remise Habituelle</p>
                                    <p className="font-medium">{supplier.remise}%</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {supplier.notes && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm whitespace-pre-wrap">{supplier.notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Statut</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Badge
                                variant={supplier.statut === 'Actif' ? 'default' : 'secondary'}
                                className={supplier.statut === 'Actif' ? 'bg-green-100 text-green-800' : ''}
                            >
                                {supplier.statut}
                            </Badge>
                        </CardContent>
                    </Card>

                    {supplier.typeProduits && supplier.typeProduits.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Type de Produits</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {supplier.typeProduits.map((type) => (
                                        <Badge key={type} variant="outline">
                                            {type}
                                        </Badge>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>

            {/* @ts-ignore - modal prop exists but not in types */}
            <AlertDialog modal={false} open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Le fournisseur "{supplier.nomCommercial}" sera
                            définitivement supprimé.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
