'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { deleteSupplier } from '@/app/actions/supplier-actions';
import { BulkReceiveModal } from '@/components/suppliers/BulkReceiveModal';
import { ApplyCreditDialog } from '@/components/suppliers/apply-credit-dialog';
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { useBreadcrumbStore } from '@/hooks/use-breadcrumb-store';
import { AlertCircle, ArrowLeft, Truck, FileText, LayoutDashboard, Package, TrendingDown, Minus, Coins } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SupplierStatement } from './statement';
import { SupplierProductsTab } from './products-tab';
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
import { SupplierActions } from '@/components/dashboard/fournisseurs/supplier-actions';

import { cn } from '@/lib/utils';

interface SupplierViewProps {
    supplier: any; 
    orders?: any[];
    payments?: any[];
    lensOrders?: any[];
    availableCredit?: number;
    credits?: any[];
    error?: string;
}

function CreditActions({ credit }: { credit: any }) {
    const [open, setOpen] = React.useState(false);

    return (
        <>
            <Button 
                variant="outline" 
                size="sm" 
                className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-200"
                onClick={() => setOpen(true)}
            >
                <Coins className="h-4 w-4 mr-2" />
                Utiliser cet avoir
            </Button>
            <ApplyCreditDialog 
                credit={credit} 
                open={open} 
                onOpenChange={setOpen} 
            />
        </>
    );
}

export default function SupplierView({ supplier, orders = [], payments = [], lensOrders = [], availableCredit = 0, credits = [], error }: SupplierViewProps) {
    const router = useRouter();
    const { toast } = useToast();
    const { setLabel } = useBreadcrumbStore();

    // Update Breadcrumb Label with Supplier Name
    React.useEffect(() => {
        if (supplier) {
            const name = supplier.name || supplier.nomCommercial;
            if (name && supplier.id) {
                setLabel(supplier.id, name);
            }
        }
    }, [supplier, setLabel]);

    // ✅ FIX: All hooks MUST be called before any conditional return
    // Financial Calculations (always called, safe when orders/payments are empty arrays)
    const totalOrdered = React.useMemo(() =>
        orders.reduce((sum: number, o: any) => sum + (Number(o.totalAmount) || 0), 0),
    [orders]);

    const totalPaid = React.useMemo(() =>
        payments.reduce((sum: number, p: any) => sum + (Number(p.amount) || 0), 0),
    [payments]);

    const balance = totalOrdered - totalPaid;

    // Transaction History (Relevé) - Merged & Sorted
    const history = React.useMemo(() => {
        const combined = [
            ...orders.map(o => ({
                id: o.id,
                date: new Date(o.createdAt || o.dateCommande),
                type: 'ACHAT',
                ref: o.orderReference || o.orderNumber || `BC #${o.id}`,
                debit: Number(o.totalAmount) || 0,
                credit: 0,
                details: o.items ? `${o.items.length} articles` : 'Commande',
                status: o.status
            })),
            ...payments.map((p: any) => ({
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

        combined.sort((a, b) => a.date.getTime() - b.date.getTime());

        let runningBalance = 0;
        return combined.map(item => {
            runningBalance += item.debit - item.credit;
            return { ...item, balance: runningBalance };
        }).reverse();
    }, [orders, payments]);

    // ✅ Conditional return is AFTER all hooks
    if (error || !supplier) {
        return (
            <div className="flex flex-1 flex-col gap-4">
                 <div className="w-fit">
                    <Button variant="ghost" size="sm" onClick={() => router.back()}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Retour
                    </Button>
                 </div>
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
                        <div className="flex items-center gap-2">
                             <p className="text-slate-500 ml-1">{s.raisonSociale || 'Détails du fournisseur'}</p>
                             {s.typeProduits && s.typeProduits.length > 0 && (
                                <div className="flex flex-wrap gap-2 ml-4">
                                    {s.typeProduits.map((type: string) => (
                                        <Badge key={type} variant="outline" className="text-[10px] px-1.5 py-0 h-4 uppercase tracking-wider font-bold border-slate-200 text-slate-500">
                                            {type}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <BulkReceiveModal initialSupplierId={s.id} />
                    <SupplierActions 
                        supplierId={s.id} 
                        supplierName={s.nomCommercial} 
                        variant="header" 
                    />
                </div>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
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

                {/* KPI Avoir Dispo */}
                <Card className={`${Number(availableCredit || 0) > 0 ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50/50 border-slate-100'}`}>
                    <CardHeader className="pb-2 flex flex-row items-center justify-between">
                         <CardTitle className={`text-sm font-medium ${Number(availableCredit || 0) > 0 ? 'text-emerald-600' : 'text-slate-500'}`}>
                            Avoirs Disponibles
                         </CardTitle>
                         {Number(availableCredit || 0) > 0 ? (
                            <TrendingDown className="h-4 w-4 text-emerald-500" />
                         ) : (
                            <Minus className="h-4 w-4 text-slate-400" />
                         )}
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${Number(availableCredit || 0) > 0 ? 'text-emerald-700' : 'text-slate-400'}`}>
                             <SensitiveData value={Number(availableCredit || 0)} type="currency" />
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
                    <TabsTrigger value="lens-orders" className="px-4 py-2 flex items-center gap-2">
                        <Truck className="h-4 w-4 text-blue-500" /> Commandes de Verres (Labo)
                    </TabsTrigger>
                    <TabsTrigger value="products" className="px-4 py-2 flex items-center gap-2">
                        <Package className="h-4 w-4" /> Catalogue Produits
                    </TabsTrigger>
                    <TabsTrigger value="credits" className="px-4 py-2 flex items-center gap-2">
                        <Coins className="h-4 w-4 text-emerald-500" /> Avoirs & Crédits
                        {credits.filter((c: any) => c.status !== 'closed').length > 0 && (
                            <Badge className="ml-1 bg-emerald-500 text-white border-none h-4 px-1 min-w-4 flex items-center justify-center text-[10px]">
                                {credits.filter((c: any) => c.status !== 'closed').length}
                            </Badge>
                        )}
                    </TabsTrigger>
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

                        {/* Right Column: Notes */}
                        <div className="space-y-6">
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
                    <SupplierStatement supplierId={s.id} credits={credits} />
                </TabsContent>

                {/* LENS ORDERS TAB */}
                <TabsContent value="lens-orders">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Commandes de Verres (Labo)</CardTitle>
                                <p className="text-sm text-slate-500">Liste des verres commandés chez ce laboratoire</p>
                            </div>
                            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-100">
                                {lensOrders.length} commandes
                            </Badge>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50">
                                        <TableHead className="font-bold">Date</TableHead>
                                        <TableHead className="font-bold">Client</TableHead>
                                        <TableHead className="font-bold">Réf Vente</TableHead>
                                        <TableHead className="font-bold">Type de Verre</TableHead>
                                        <TableHead className="font-bold">Correction</TableHead>
                                        <TableHead className="font-bold">Statut</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lensOrders.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-slate-400 italic">
                                                Aucune commande de verres trouvée pour ce fournisseur.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        lensOrders.map((order: any) => (
                                            <TableRow key={order.id} className="hover:bg-slate-50/50 transition-colors">
                                                <TableCell className="font-medium whitespace-nowrap">
                                                    {order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy', { locale: fr }) : '-'}
                                                </TableCell>
                                                <TableCell className="font-bold text-slate-900">
                                                    {order.client?.fullName || 'Client inconnu'}
                                                </TableCell>
                                                <TableCell>
                                                    {order.sale?.saleNumber ? (
                                                        <Badge variant="secondary" className="bg-slate-100 text-slate-600 font-bold">
                                                            #{order.sale.saleNumber}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-slate-400 italic text-xs">Non facturé</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-bold text-slate-700 capitalize">{order.lensType}</span>
                                                        <span className="text-[10px] text-slate-400 uppercase font-black">{order.orderType}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-[11px] font-mono text-slate-500">
                                                    <div className="grid grid-cols-2 gap-x-2">
                                                        <span>OD: {order.sphereR || '0'}({order.cylindreR || '0'})</span>
                                                        <span>OG: {order.sphereL || '0'}({order.cylindreL || '0'})</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge 
                                                        className={`
                                                            font-bold uppercase text-[10px] px-2 py-0.5 rounded-full
                                                            ${order.status === 'pending' ? 'bg-amber-100 text-amber-700' : ''}
                                                            ${order.status === 'ordered' ? 'bg-blue-100 text-blue-700' : ''}
                                                            ${order.status === 'received' ? 'bg-emerald-100 text-emerald-700' : ''}
                                                            ${order.status === 'delivered' ? 'bg-slate-100 text-slate-600' : ''}
                                                        `}
                                                    >
                                                        {order.status === 'pending' && 'En attente'}
                                                        {order.status === 'ordered' && 'Commandé'}
                                                        {order.status === 'received' && 'Reçu'}
                                                        {order.status === 'delivered' && 'Livré'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* PRODUCTS CATALOGUE TAB */}
                <TabsContent value="products">
                    <SupplierProductsTab supplierName={s.nomCommercial} />
                </TabsContent>

                {/* CREDITS TAB */}
                <TabsContent value="credits" className="space-y-6">
                    {/* Widget Solde */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6 flex items-center justify-between shadow-sm">
                        <div>
                            <p className="text-sm font-medium text-emerald-600 mb-1">Solde d'avoirs disponible</p>
                            <p className="text-3xl font-black text-emerald-700">{availableCredit.toFixed(2)} MAD</p>
                        </div>
                        <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center shadow-inner">
                            <TrendingDown className="h-7 w-7 text-emerald-500" />
                        </div>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Liste des Avoirs</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50/50">
                                        <TableHead className="font-bold">Date</TableHead>
                                        <TableHead className="font-bold">Motif</TableHead>
                                        <TableHead className="font-bold">Référence</TableHead>
                                        <TableHead className="text-right font-bold">Montant Initial</TableHead>
                                        <TableHead className="text-right font-bold">Reste à imputer</TableHead>
                                        <TableHead className="text-center font-bold">Statut</TableHead>
                                        <TableHead className="text-right font-bold">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {credits.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-20">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="h-16 w-16 bg-emerald-50 rounded-full flex items-center justify-center">
                                                        <TrendingDown className="h-8 w-8 text-emerald-400" />
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="font-bold text-slate-700">Aucun avoir fournisseur</p>
                                                        <p className="text-sm text-slate-400 max-w-xs mx-auto">
                                                            Les avoirs seront créés automatiquement lors de retours de marchandise ou gérés manuellement.
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        credits.map((c: any) => (
                                            <TableRow key={c.id}>
                                                <TableCell>{format(new Date(c.createdAt), 'dd/MM/yyyy')}</TableCell>
                                                <TableCell>
                                                    <span className="text-sm font-medium text-slate-600">
                                                        {c.sourceType === 'return' ? 'Retour marchandise' : 
                                                         c.sourceType === 'overcharge' ? 'Erreur de facturation' : 
                                                         c.sourceType === 'manual' ? 'Avoir manuel' : (c.sourceType || 'Autre')}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{c.reference || `AV-${c.id.slice(0,8)}`}</TableCell>
                                                <TableCell className="text-right font-bold">{Number(c.amount).toFixed(2)}</TableCell>
                                                <TableCell className="text-right font-bold text-emerald-600">{Number(c.remainingAmount).toFixed(2)}</TableCell>
                                                <TableCell className="text-center">
                                                    <Badge className={cn(
                                                        "font-bold uppercase text-[10px]",
                                                        c.status === 'closed' ? 'bg-slate-100 text-slate-600' : 
                                                        c.status === 'partial' ? 'bg-amber-100 text-amber-700' : 
                                                        'bg-emerald-100 text-emerald-700'
                                                    )}>
                                                        {c.status === 'open' ? 'Ouvert' : c.status === 'partial' ? 'Partiel' : 'Clôturé'}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    {c.status !== 'closed' && (
                                                        <CreditActions credit={c} />
                                                    )}
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

        </div>
    );
}
