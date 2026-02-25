'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
    Loader2, 
    CheckCircle2, 
    PackageCheck, 
    MessageCircle, 
    ExternalLink,
    Search
} from "lucide-react";
import { getSuppliersList } from '@/app/actions/supplier-actions';
import { getSupplierLensOrders, bulkReceiveLensOrders } from '@/app/actions/lens-orders-actions';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface BulkReceiveModalProps {
    initialSupplierId?: string;
}

export function BulkReceiveModal({ initialSupplierId }: BulkReceiveModalProps = {}) {
    const [open, setOpen] = React.useState(false);
    const { toast } = useToast();
    const [suppliers, setSuppliers] = React.useState<any[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = React.useState<string>(initialSupplierId || "");
    const [orders, setOrders] = React.useState<any[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = React.useState(false);
    const [selectedOrderIds, setSelectedOrderIds] = React.useState<string[]>([]);
    const [blNumber, setBlNumber] = React.useState("");
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSuccess, setIsSuccess] = React.useState(false);
    const [receivedOrders, setReceivedOrders] = React.useState<any[]>([]);

    // 1. Fetch Suppliers on Open
    React.useEffect(() => {
        if (open) {
            const fetchSuppliers = async () => {
                const res = await getSuppliersList();
                if (res.success) {
                    setSuppliers(res.data || []);
                }
            };
            fetchSuppliers();
            setIsSuccess(false);
            setReceivedOrders([]);
            setSelectedOrderIds([]);
            setBlNumber("");
        }
    }, [open]);

    // 2. Fetch Orders when Supplier is selected
    React.useEffect(() => {
        if (selectedSupplierId) {
            const fetchOrders = async () => {
                setIsLoadingOrders(true);
                const res = await getSupplierLensOrders(selectedSupplierId);
                if (res.success) {
                    // Filter for 'pending' or 'ordered'
                    const pending = (res.data || []).filter((o: any) => 
                        o.status === 'pending' || o.status === 'ordered'
                    );
                    setOrders(pending);
                } else {
                    toast({
                        variant: "destructive",
                        title: "Erreur",
                        description: "Impossible de charger les commandes."
                    });
                }
                setIsLoadingOrders(false);
            };
            fetchOrders();
        } else {
            setOrders([]);
        }
    }, [selectedSupplierId, toast]);

    const handleToggleOrder = (id: string) => {
        setSelectedOrderIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedOrderIds(orders.map(o => o.id.toString()));
        } else {
            setSelectedOrderIds([]);
        }
    };

    const handleConfirm = async () => {
        if (!selectedOrderIds.length || !blNumber) return;

        setIsSubmitting(true);
        try {
            const res = await bulkReceiveLensOrders(selectedOrderIds, blNumber);
            if (res.success) {
                toast({
                    title: "Succès",
                    description: res.message
                });
                
                // Keep track of received orders for WhatsApp notification
                const justReceived = orders.filter(o => selectedOrderIds.includes(o.id.toString()));
                setReceivedOrders(justReceived);
                setIsSuccess(true);
            } else {
                toast({
                    variant: "destructive",
                    title: "Erreur",
                    description: res.error
                });
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erreur",
                description: "Une erreur est survenue lors de la réception."
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNotifyWhatsApp = (order: any) => {
        const clientName = order.client?.fullName || "Client";
        const clientPhone = order.client?.phone || "";
        
        if (!clientPhone) {
            toast({
                variant: "destructive",
                description: "Numéro de téléphone du client manquant."
            });
            return;
        }

        const shopName = "OptiManager"; // In a real app, get this from settings
        const message = `Bonjour Mr/Mme ${clientName}, nous vous informons que vos lunettes sont prêtes chez ${shopName}. Vous pouvez passer les récupérer à votre convenance. À bientôt !`.trim();
        const encodedMessage = encodeURIComponent(message);
        
        // Format phone number (remove spaces, etc. - simple version)
        const cleanPhone = clientPhone.replace(/\s+/g, '').replace(/^\+/, '');
        
        window.open(`https://wa.me/${cleanPhone}?text=${encodedMessage}`, '_blank');
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant="outline" 
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm gap-2"
                >
                    📦 Réception Groupée
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <div className="flex items-center gap-2 mb-2">
                        <div className="h-10 w-10 bg-indigo-100 rounded-lg flex items-center justify-center text-indigo-600">
                            <PackageCheck className="h-6 w-6" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl">Réception Groupée de Verres</DialogTitle>
                            <DialogDescription>
                                Sélectionnez un fournisseur et les commandes livrées par BL.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {!isSuccess ? (
                    <div className="space-y-6 flex-1 overflow-hidden flex flex-col">
                        {/* 1. Selection Supplier & BL */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Fournisseur (Labo)</Label>
                                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choisir un labo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map(s => (
                                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>N° Bon de Livraison (BL) <span className="text-red-500">*</span></Label>
                                <Input 
                                    placeholder="Ex: BL-2024-001" 
                                    value={blNumber} 
                                    onChange={(e) => setBlNumber(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* 2. Orders Table */}
                        <div className="flex-1 overflow-hidden border rounded-lg flex flex-col">
                            <TableHeader className="bg-slate-50 sticky top-0 z-10">
                                <TableRow>
                                    <TableHead className="w-[50px]">
                                        <Checkbox 
                                            checked={selectedOrderIds.length > 0 && selectedOrderIds.length === orders.length}
                                            onCheckedChange={handleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Détails Verres</TableHead>
                                    <TableHead>Date Commande</TableHead>
                                    <TableHead className="text-right">Montant</TableHead>
                                </TableRow>
                            </TableHeader>
                            <ScrollArea className="flex-1">
                                <Table>
                                    <TableBody>
                                        {isLoadingOrders ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Loader2 className="h-4 w-4 animate-spin" />
                                                        Chargement des commandes...
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ) : orders.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={5} className="h-24 text-center text-slate-500">
                                                    {selectedSupplierId ? "Aucune commande en attente pour ce fournisseur." : "Veuillez sélectionner un fournisseur."}
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            orders.map(order => (
                                                <TableRow key={order.id} className={selectedOrderIds.includes(order.id.toString()) ? "bg-indigo-50/50" : ""}>
                                                    <TableCell>
                                                        <Checkbox 
                                                            checked={selectedOrderIds.includes(order.id.toString())}
                                                            onCheckedChange={() => handleToggleOrder(order.id.toString())}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {order.client?.fullName || "Inconnu"}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-xs space-y-1">
                                                            <div className="font-semibold text-slate-700">{order.lensType}</div>
                                                            <div className="text-slate-500">
                                                                OD: {order.sphereR} ({order.cylindreR}) {order.axeR}° | 
                                                                OG: {order.sphereL} ({order.cylindreL}) {order.axeL}°
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-slate-500">
                                                        {order.createdAt ? format(new Date(order.createdAt), 'dd/MM/yyyy', { locale: fr }) : '-'}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">
                                                        {order.sellingPrice} DH
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </ScrollArea>
                        </div>

                        <div className="flex justify-between items-center bg-slate-50 p-4 rounded-lg border">
                            <div className="text-sm font-medium text-slate-600">
                                <span className="text-indigo-600 font-bold">{selectedOrderIds.length}</span> commande(s) sélectionnée(s)
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
                                <Button 
                                    disabled={!selectedOrderIds.length || !blNumber || isSubmitting}
                                    onClick={handleConfirm}
                                    className="bg-indigo-600 hover:bg-indigo-700"
                                >
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                                    Confirmer Réception
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-6 py-4">
                        <div className="flex flex-col items-center justify-center text-center space-y-3">
                            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 mb-2">
                                <CheckCircle2 className="h-10 w-10" />
                            </div>
                            <h3 className="text-2xl font-bold text-slate-900">Réception Terminée !</h3>
                            <p className="text-slate-500 max-w-md">
                                {receivedOrders.length} commande(s) ont été marquées comme reçues avec le BL <span className="font-bold text-indigo-600">{blNumber}</span>.
                            </p>
                        </div>

                        <div className="border rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-slate-50 p-3 border-b text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Notifier les clients via WhatsApp
                            </div>
                            <ScrollArea className="max-h-[300px]">
                                <div className="divide-y">
                                    {receivedOrders.map(order => (
                                        <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-xs">
                                                    {order.client?.fullName?.charAt(0) || "C"}
                                                </div>
                                                <div>
                                                    <div className="font-semibold text-sm">{order.client?.fullName}</div>
                                                    <div className="text-xs text-slate-500 flex items-center gap-1">
                                                        <MessageCircle className="h-3 w-3 text-green-500" />
                                                        {order.client?.phone || "Pas de numéro"}
                                                    </div>
                                                </div>
                                            </div>
                                            <Button 
                                                size="sm" 
                                                className="bg-green-600 hover:bg-green-700 h-8 gap-2"
                                                onClick={() => handleNotifyWhatsApp(order)}
                                                disabled={!order.client?.phone}
                                            >
                                                <MessageCircle className="h-4 w-4" />
                                                Envoyer
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>

                        <div className="flex justify-center pt-4">
                            <Button variant="default" className="px-10" onClick={() => setOpen(false)}>
                                Fermer
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
