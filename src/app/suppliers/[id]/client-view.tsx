'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { deleteSupplier } from '@/app/actions/supplier-actions';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/page-header';
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
import { AlertCircle, Edit, Trash2, ChevronLeft } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { BackButton } from '@/components/ui/back-button';

interface SupplierViewProps {
    supplier: any; 
    error?: string;
}

export default function SupplierView({ supplier, error }: SupplierViewProps) {
    const router = useRouter();
    const { toast } = useToast();
    const [showDeleteDialog, setShowDeleteDialog] = React.useState(false);
    const [isDeleting, setIsDeleting] = React.useState(false);

    if (error || !supplier) {
        return (
            <div className="flex flex-1 flex-col gap-4">
                 <div className="w-fit"><BackButton /></div>
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Erreur</AlertTitle>
                    <AlertDescription>
                        {error || "Impossible de charger les informations du fournisseur."}
                    </AlertDescription>
                </Alert>
            </div>
        );
    }

    // Normalize data from DB (English keys) to View (French keys expected by JSX)
    const s = {
        id: supplier.id,
        nomCommercial: supplier.name || supplier.nomCommercial,
        raisonSociale: supplier.raisonSociale, 
        telephone: supplier.phone || supplier.telephone,
        email: supplier.email,
        adresse: supplier.address || supplier.adresse,
        ville: supplier.city || supplier.ville,
        pays: supplier.country || supplier.pays,
        if: supplier.if,
        ice: supplier.ice,
        rc: supplier.rc,
        contactNom: supplier.contactNom,
        contactTelephone: supplier.contactTelephone,
        contactEmail: supplier.contactEmail,
        banque: supplier.bank || supplier.banque,
        rib: supplier.rib,
        delaiPaiement: supplier.paymentTerms || supplier.delaiPaiement,
        modePaiement: supplier.paymentMethod || supplier.modePaiement,
        remise: supplier.remise,
        notes: supplier.notes,
        statut: supplier.status || supplier.statut || 'Actif',
        typeProduits: supplier.category ? supplier.category.split(', ') : (supplier.typeProduits || []),
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await deleteSupplier(s.id);
            toast({
                title: 'Fournisseur supprimé',
                description: `Le fournisseur "${s.nomCommercial}" a été supprimé.`,
            });
            router.push('/suppliers');
            router.refresh();
        } catch (err) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: "Erreur lors de la suppression.",
            });
            setIsDeleting(false);
        }
    };

    return (
        <div className="flex flex-1 flex-col gap-4">
            <div className="w-fit">
                <Button
                    variant="ghost"
                    onClick={() => router.push('/suppliers')}
                    className="mb-4 flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors"
                >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Retour à la liste
                </Button>
            </div>
            <PageHeader
                title={s.nomCommercial}
                description={s.raisonSociale || 'Détails du fournisseur'}
            >
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        onClick={() => router.push(`/suppliers/${s.id}/edit`)}
                    >
                        <Edit className="mr-2 h-4 w-4" />
                        Modifier
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={() => setShowDeleteDialog(true)}
                        disabled={isDeleting}
                    >
                        <Trash2 className="mr-2 h-4 w-4" />
                        {isDeleting ? 'Suppression...' : 'Supprimer'}
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
                                <p className="font-medium">{s.nomCommercial}</p>
                            </div>
                            {s.raisonSociale && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Raison Sociale</p>
                                    <p className="font-medium">{s.raisonSociale}</p>
                                </div>
                            )}
                            <div>
                                <p className="text-sm text-muted-foreground">Téléphone</p>
                                <p className="font-medium">{s.telephone}</p>
                            </div>
                            {s.email && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Email</p>
                                    <p className="font-medium">{s.email}</p>
                                </div>
                            )}
                            {s.adresse && (
                                <div className="col-span-2">
                                    <p className="text-sm text-muted-foreground">Adresse</p>
                                    <p className="font-medium">{s.adresse}</p>
                                </div>
                            )}
                            {s.ville && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Ville</p>
                                    <p className="font-medium">{s.ville}</p>
                                </div>
                            )}
                            {s.pays && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Pays</p>
                                    <p className="font-medium">{s.pays}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Informations Légales / Fiscales</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-3 gap-4">
                            {s.if && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Identifiant Fiscal (IF)</p>
                                    <p className="font-medium">{s.if}</p>
                                </div>
                            )}
                            {s.ice && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Identifiant Commun de l'Entreprise (ICE)</p>
                                    <p className="font-medium">{s.ice}</p>
                                </div>
                            )}
                            {s.rc && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Registre de Commerce (RC)</p>
                                    <p className="font-medium">{s.rc}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Informations de Contact</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            {s.contactNom && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Nom du contact</p>
                                    <p className="font-medium">{s.contactNom}</p>
                                </div>
                            )}
                            {s.contactTelephone && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Téléphone du contact</p>
                                    <p className="font-medium">{s.contactTelephone}</p>
                                </div>
                            )}
                            {s.contactEmail && (
                                <div className="col-span-2">
                                    <p className="text-sm text-muted-foreground">Email du contact</p>
                                    <p className="font-medium">{s.contactEmail}</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="font-headline">Informations Bancaires et Commerciales</CardTitle>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            {s.banque && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Banque</p>
                                    <p className="font-medium">{s.banque}</p>
                                </div>
                            )}
                            {s.rib && (
                                <div>
                                    <p className="text-sm text-muted-foreground">RIB / IBAN</p>
                                    <p className="font-medium">{s.rib}</p>
                                </div>
                            )}
                            {s.delaiPaiement && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Délai de Paiement</p>
                                    <p className="font-medium">{s.delaiPaiement}</p>
                                </div>
                            )}
                            {s.modePaiement && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Mode de Paiement</p>
                                    <p className="font-medium">{s.modePaiement}</p>
                                </div>
                            )}
                            {s.remise !== undefined && (
                                <div>
                                    <p className="text-sm text-muted-foreground">Remise Habituelle</p>
                                    <p className="font-medium">{s.remise}%</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {s.notes && (
                        <Card>
                            <CardHeader>
                                <CardTitle className="font-headline">Notes</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm whitespace-pre-wrap">{s.notes}</p>
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
                                variant={s.statut === 'Actif' ? 'default' : 'secondary'}
                                className={s.statut === 'Actif' ? 'bg-green-100 text-green-800' : ''}
                            >
                                {s.statut}
                            </Badge>
                        </CardContent>
                    </Card>

                    {s.typeProduits && s.typeProduits.length > 0 && (
                        <Card>
                            <CardHeader>
                                <CardTitle>Type de Produits</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2">
                                    {s.typeProduits.map((type: string) => (
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

            <AlertDialog modal={false} open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent
                    onOpenAutoFocus={(e) => e.preventDefault()}
                    onCloseAutoFocus={(e) => e.preventDefault()}
                >
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Le fournisseur "{s.nomCommercial}" sera
                            définitivement supprimé.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-destructive hover:bg-destructive/90"
                        >
                            {isDeleting ? 'Suppression...' : 'Supprimer'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
