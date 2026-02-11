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
import { AlertCircle, Edit, Trash2, ArrowLeft, Truck, FileText, CreditCard, LayoutDashboard } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SensitiveData } from '@/components/ui/sensitive-data';

interface SupplierViewProps {
    supplier: any; 
    orders?: any[];
    payments?: any[];
    error?: string;
}

export default function SupplierView({ supplier, orders = [], payments = [], error }: SupplierViewProps) {
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

    // Normalize Supplier Data
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

    // Financial Calculations
    const totalOrdered = React.useMemo(() => 
        orders.reduce((sum, o) => sum + (Number(o.totalAmount) || 0), 0), 
    [orders]);

    const totalPaid = React.useMemo(() => 
        // Use payments explicitly for total paid to avoid double counting if checking orders.amountPaid
        payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [payments]);

    const balance = totalOrdered - totalPaid;

    // Transaction History (Relevé) - Merged & Sorted
    const history = React.useMemo(() => {
        const combined = [
            ...orders.map(o => ({
                id: o.id,
                date: new Date(o.createdAt || o.dateCommande),
                type: 'ACHAT',
                ref: o.orderReference || o.orderNumber || `BC #${o.id}`, // Prioritize user ref (BL/BC)
                debit: Number(o.totalAmount) || 0,
                credit: 0,
                details: o.items ? `${o.items.length} articles` : 'Commande',
                status: o.status
            })),
            ...payments.map(p => ({
                id: p.id,
                date: new Date(p.date),
                type: 'PAIEMENT',
                ref: p.reference || p.paymentNumber,
                debit: 0,
                credit: Number(p.amount) || 0,
                details: p.method || 'Paiement',
                status: 'PAYÉ'
            }))
        ];
        
        // Sort by Date Ascending for calculating running balance
        combined.sort((a, b) => a.date.getTime() - b.date.getTime());

        // Calculate Running Balance
        let runningBalance = 0;
        return combined.map(item => {
            runningBalance += item.debit - item.credit;
            return { ...item, balance: runningBalance };
        }).reverse(); // Reverse for display (Newest first)
    }, [orders, payments]);


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
        <div className="flex flex-1 flex-col gap-6 p-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild className="rounded-full hover:bg-slate-100 h-10 w-10">
                        <Link href="/suppliers">
                            <ArrowLeft className="h-5 w-5 text-slate-500" />
                        </Link>
                    </Button>
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold text-slate-900 tracking-tight flex items-center gap-3">
                                <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600">
                                    <Truck className="h-6 w-6" />
                                </div>
                                {s.nomCommercial}
                            </h1>
                        </div>
                        <p className="text-slate-500 ml-1">{s.raisonSociale || 'Détails du fournisseur'}</p>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push(`/suppliers/${s.id}/edit`)}>
                        <Edit className="mr-2 h-4 w-4" /> Modifier
                    </Button>
                    <Button variant="destructive" onClick={() => setShowDeleteDialog(true)} disabled={isDeleting}>
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                    </Button>
                </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Achats (TTC)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-900">
                            <SensitiveData value={totalOrdered} type="currency" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium text-slate-500">Total Payé</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                             <SensitiveData value={totalPaid} type="currency" />
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                         <CardTitle className="text-sm font-medium text-slate-500">Reste à Payer (Solde)</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${balance > 0 ? 'text-red-600' : 'text-slate-900'}`}>
                             <SensitiveData value={balance} type="currency" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="bg-white border p-1 h-auto mb-4 w-full justify-start rounded-lg overflow-x-auto">
                    <TabsTrigger value="overview" className="px-4 py-2 flex items-center gap-2">
                        <LayoutDashboard className="h-4 w-4" /> Vue d'ensemble
                    </TabsTrigger>
                    <TabsTrigger value="history" className="px-4 py-2 flex items-center gap-2">
                        <FileText className="h-4 w-4" /> Historique (Relevé)
                    </TabsTrigger>
                    {/* <TabsTrigger value="payments" className="px-4 py-2 flex items-center gap-2">
                        <CreditCard className="h-4 w-4" /> Paiements
                    </TabsTrigger> */}
                </TabsList>

                {/* OVERVIEW TAB */}
                <TabsContent value="overview" className="space-y-6">
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Left Column: Contact & Info */}
                        <div className="lg:col-span-2 space-y-6">
                            <Card>
                                <CardHeader><CardTitle>Informations Générales</CardTitle></CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="space-y-1"><p className="text-sm text-slate-500">Email</p><p className="font-medium">{s.email || '-'}</p></div>
                                     <div className="space-y-1"><p className="text-sm text-slate-500">Téléphone</p><p className="font-medium">{s.telephone || '-'}</p></div>
                                     <div className="space-y-1 md:col-span-2"><p className="text-sm text-slate-500">Adresse</p><p className="font-medium">{s.adresse || '-'} {s.ville} {s.pays}</p></div>
                                </CardContent>
                            </Card>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <Card>
                                    <CardHeader><CardTitle>Légal & Fiscal</CardTitle></CardHeader>
                                    <CardContent className="space-y-3">
                                        <div className="flex justify-between"><span className="text-sm text-slate-500">ICE</span><span className="font-medium">{s.ice || '-'}</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-slate-500">IF</span><span className="font-medium">{s.if || '-'}</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-slate-500">RC</span><span className="font-medium">{s.rc || '-'}</span></div>
                                    </CardContent>
                                </Card>
                                <Card>
                                     <CardHeader><CardTitle>Bancaire</CardTitle></CardHeader>
                                     <CardContent className="space-y-3">
                                        <div className="flex justify-between"><span className="text-sm text-slate-500">Banque</span><span className="font-medium">{s.banque || '-'}</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-slate-500">RIB</span><span className="font-medium break-all">{s.rib || '-'}</span></div>
                                        <div className="flex justify-between"><span className="text-sm text-slate-500">Délai</span><span className="font-medium">{s.delaiPaiement} jours</span></div>
                                     </CardContent>
                                </Card>
                            </div>
                        </div>

                        {/* Right Column: Status & Notes */}
                        <div className="space-y-6">
                             <Card>
                                <CardHeader><CardTitle>Statut</CardTitle></CardHeader>
                                <CardContent>
                                    <Badge variant={s.statut === 'Actif' ? 'default' : 'secondary'} className={s.statut === 'Actif' ? 'bg-green-100 text-green-800' : ''}>
                                        {s.statut}
                                    </Badge>
                                    {s.typeProduits && s.typeProduits.length > 0 && (
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            {s.typeProduits.map((type: string) => <Badge key={type} variant="outline">{type}</Badge>)}
                                        </div>
                                    )}
                                </CardContent>
                             </Card>
                             {s.notes && (
                                <Card>
                                    <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
                                    <CardContent><p className="text-sm whitespace-pre-wrap">{s.notes}</p></CardContent>
                                </Card>
                             )}
                        </div>
                    </div>
                </TabsContent>

                {/* HISTORY (RELEVE) TAB */}
                <TabsContent value="history">
                    <Card>
                        <CardHeader>
                            <CardTitle>Relevé de Compte</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Référence (BC/BL)</TableHead>
                                        <TableHead>Détails</TableHead>
                                        <TableHead className="text-right">Débit (Achat)</TableHead>
                                        <TableHead className="text-right">Crédit (Paiement)</TableHead>
                                        <TableHead className="text-right">Solde</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {history.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Aucune transaction trouvée.</TableCell>
                                        </TableRow>
                                    ) : (
                                        history.map((row) => (
                                            <TableRow key={`${row.type}-${row.id}`}>
                                                <TableCell>{format(row.date, 'dd/MM/yyyy', { locale: fr })}</TableCell>
                                                <TableCell>
                                                    <Badge variant={row.type === 'ACHAT' ? 'outline' : 'default'} className={row.type === 'PAIEMENT' ? 'bg-emerald-600' : ''}>
                                                        {row.type}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-medium">{row.ref}</TableCell>
                                                <TableCell className="text-sm text-muted-foreground">{row.details}</TableCell>
                                                <TableCell className="text-right font-mono">
                                                    {row.debit > 0 ? <SensitiveData value={row.debit} type="currency" /> : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-emerald-600">
                                                     {row.credit > 0 ? <SensitiveData value={row.credit} type="currency" /> : '-'}
                                                </TableCell>
                                                <TableCell className="text-right font-bold font-mono">
                                                     <SensitiveData value={row.balance} type="currency" />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            <AlertDialog modal={false} open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Êtes-vous sûr ?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Cette action est irréversible. Le fournisseur "{s.nomCommercial}" sera définitivement supprimé.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                            {isDeleting ? 'Suppression...' : 'Supprimer'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
