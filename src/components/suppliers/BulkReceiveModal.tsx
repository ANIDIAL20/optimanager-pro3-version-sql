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
import { useQueryClient } from "@tanstack/react-query";
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
    Pencil,
    User,
    ScanLine,
    Calendar,
    Search
} from "lucide-react";
import { getSuppliersList } from '@/app/actions/supplier-actions';
import { getPendingOrdersBySupplier, bulkReceiveLensOrders } from '@/app/actions/lens-orders-actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * WhatsApp formatting helper
 */
function formatPhoneForWhatsapp(phone: string | null | undefined): string {
    if (!phone) return "";
    let clean = phone.replace(/\s+/g, '');
    if (clean.startsWith('0')) {
        clean = '212' + clean.slice(1);
    } else if (clean.startsWith('+')) {
        clean = clean.replace('+', '');
    }
    return clean;
}

interface BulkReceiveModalProps {
    initialSupplierId?: string;
}

export function BulkReceiveModal({ initialSupplierId }: BulkReceiveModalProps = {}) {
    const [open, setOpen] = React.useState(false);
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const router = useRouter();
    const [suppliers, setSuppliers] = React.useState<any[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = React.useState<string>(initialSupplierId || "");
    
    // Core Data States (As per Step 2)
    const [pendingOrders, setPendingOrders] = React.useState<any[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    
    // Selection States
    const [selectedOrderIds, setSelectedOrderIds] = React.useState<string[]>([]);
    const [purchasePrices, setPurchasePrices] = React.useState<Record<number, number>>({});
    const [blNumber, setBlNumber] = React.useState("");
    


    // Submission Progress States
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSuccess, setIsSuccess] = React.useState(false);
    const [receivedOrders, setReceivedOrders] = React.useState<any[]>([]);



    // 1. Fetch Suppliers on Open
    React.useEffect(() => {
        if (open) {
            const fetchSuppliers = async () => {
                const res = await getSuppliersList();
                if (res.success) {
                    const allSuppliers = res.data || [];
                    const sorted = [...allSuppliers].sort((a, b) => a.name.localeCompare(b.name));
                    const labs = sorted.filter(s => 
                        (s.category || '').toLowerCase().includes('labo') || 
                        (s.category || '').toLowerCase().includes('laboratoire')
                    );
                    setSuppliers(labs.length > 0 ? labs : sorted);
                }
            };
            fetchSuppliers();
            setIsSuccess(false);
            setReceivedOrders([]);
            setSelectedOrderIds([]);
            setPurchasePrices({});
            setBlNumber("");
        }
    }, [open]);

    // 2. Fetch Pending Orders when Supplier is selected (As per Step 2)
    React.useEffect(() => {
        if (!selectedSupplierId) {
            setPendingOrders([]);
            setPurchasePrices({});
            return;
        }

        console.log("🔄 Triggering fetch for supplier:", selectedSupplierId);

        const fetchOrders = async () => {
            setIsLoading(true);
            try {
                const res = await getPendingOrdersBySupplier(selectedSupplierId);
                console.log("📦 Server response:", res);
                
                if (res?.success) {
                    const data = res.data || [];
                    setPendingOrders(data);
                    
                    // Pre-populate purchase prices with estimated/selling price
                    const prices: Record<number, number> = {};
                    data.forEach((o: any) => {
                        prices[o.id] = parseFloat(o.estimatedBuyingPrice || o.sellingPrice || '0');
                    });
                    setPurchasePrices(prices);
                } else {
                    console.error("Fetch failed:", res?.error);
                    toast({ variant: "destructive", title: "Erreur", description: "Impossible de charger les commandes." });
                }
            } catch (err) {
                console.error("Network error:", err);
                toast({ variant: "destructive", title: "Erreur réseau", description: "Une erreur est survenue lors du chargement." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchOrders();
    }, [selectedSupplierId, toast]);



    const handleToggleOrder = (id: string) => {
        setSelectedOrderIds(prev => 
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };



    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            setSelectedOrderIds(pendingOrders.map(o => o.id.toString()));
        } else {
            setSelectedOrderIds([]);
        }
    };

    const handleConfirm = async () => {
        if (!selectedOrderIds.length || !blNumber) return;
        setIsSubmitting(true);
        try {
            const res = await bulkReceiveLensOrders({
                supplierId: selectedSupplierId,
                selectedOrderIds: selectedOrderIds.map(id => parseInt(id)),
                blNumber
            } as any);
            if (res.success) {
                toast({ title: "Succès", description: "Réception effectuée !" });
                // 🚀 Smart Refetch: Invalidate notifications queries immediately
                queryClient.invalidateQueries({ queryKey: ["notifications"] });
                queryClient.invalidateQueries({ queryKey: ["notification-count"] });
                
                setReceivedOrders((res as any).receivedOrders || []);
                setIsSuccess(true);
            } else {
                toast({ variant: "destructive", title: "Erreur", description: res.error });
            }
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erreur", description: error.message || "Erreur de connexion" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleNotifyWhatsApp = (order: any) => {
        if (!order.clientPhone) {
            toast({ variant: "destructive", description: "Numéro de téléphone manquant." });
            return;
        }
        const clientName = order.clientName || "Client";
        const message = encodeURIComponent(`Bonjour Mr/Mme ${clientName}, nous vous informons que vos lunettes sont prêtes chez OptiManager ! Vous pouvez passer les récupérer à votre convenance. À bientôt !`);
        const cleanPhone = formatPhoneForWhatsapp(order.clientPhone);
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
    };

    const handleFinalize = () => {
        router.refresh();
        setOpen(false);
    };

    const selectedCount = selectedOrderIds.length;
    const totalMAD = selectedOrderIds.reduce((sum, id) => sum + (purchasePrices[parseInt(id)] || 0), 0);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 shadow-sm gap-2">
                    <PackageCheck className="h-4 w-4" /> Réception Groupée
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-5xl max-h-[95vh] flex flex-col p-6 overflow-hidden">
                <DialogHeader className="mb-4">
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 bg-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 shadow-inner">
                            <PackageCheck className="h-7 w-7" />
                        </div>
                        <div>
                            <DialogTitle className="text-2xl font-bold text-slate-900">Réception Groupée</DialogTitle>
                            <DialogDescription className="text-slate-500">
                                Cochez les commandes pour valider le Bon de Livraison (BL).
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {!isSuccess ? (
                    <div className="space-y-6 flex-1 overflow-hidden flex flex-col">
                        {/* Inputs Section */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase text-slate-500">Fournisseur (Labo)</Label>
                                <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                                    <SelectTrigger className="bg-white"><SelectValue placeholder="Choisir un labo..." /></SelectTrigger>
                                    <SelectContent>
                                        {suppliers.map(s => <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold uppercase text-slate-500">N° BL <span className="text-red-500">*</span></Label>
                                <Input placeholder="Ref BL..." value={blNumber} onChange={(e) => setBlNumber(e.target.value)} className="bg-white font-bold" />
                            </div>
                        </div>

                        {/* Table UI (As per Step 2) */}
                        <div className="flex-1 overflow-hidden border border-slate-200 rounded-xl bg-white flex flex-col">
                            <div className="bg-slate-50/50 p-2 border-b flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-600 px-2 flex items-center gap-2">
                                    <Search className="h-3 w-3" /> Commandes en attente
                                </span>
                                <Badge variant="outline" className="bg-white font-bold">
                                    {pendingOrders.length} commandes trouvées
                                </Badge>
                            </div>
                            <div className="flex-1 overflow-y-auto min-h-0 relative">
                                <Table>
                                    <TableHeader className="bg-slate-50 sticky top-0 z-10 border-b">
                                        <TableRow className="hover:bg-transparent">
                                            <TableHead className="w-[40px]">
                                                <Checkbox 
                                                    checked={pendingOrders.length > 0 && selectedOrderIds.length === pendingOrders.length} 
                                                    onCheckedChange={handleSelectAll} 
                                                />
                                            </TableHead>
                                            <TableHead className="w-[110px]">Date</TableHead>
                                            <TableHead className="w-[80px]">ID</TableHead>
                                            <TableHead>Client</TableHead>
                                            <TableHead>Type Verre</TableHead>
                                            <TableHead>Corrections (OD/OG)</TableHead>
                                            <TableHead className="text-right w-[140px]">Prix Achat BL</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {isLoading ? (
                                            <TableRow><TableCell colSpan={7} className="h-40 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-slate-300" /></TableCell></TableRow>
                                        ) : pendingOrders.length === 0 ? (
                                            <TableRow><TableCell colSpan={7} className="h-40 text-center text-slate-400 italic">Aucune commande en attente pour ce fournisseur.</TableCell></TableRow>
                                        ) : (
                                            pendingOrders.map(order => {
                                                const isSelected = selectedOrderIds.includes(order.id.toString());
                                                return (
                                                    <TableRow
                                                        key={order.id}
                                                        className={cn("border-b transition-colors hover:bg-slate-50/50 cursor-pointer", isSelected && "bg-indigo-50/50")}
                                                    >
                                                        <TableCell><Checkbox checked={isSelected} onCheckedChange={() => handleToggleOrder(order.id.toString())} /></TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 whitespace-nowrap">
                                                                <Calendar className="h-3 w-3" />
                                                                {order.createdAt ? format(new Date(order.createdAt), 'dd MMM yyyy', { locale: fr }) : "-"}
                                                            </div>
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs font-bold text-slate-400">#{order.id}</TableCell>
                                                        <TableCell>
                                                            <div className="flex items-center gap-2">
                                                                <div className="h-7 w-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><User className="h-4 w-4" /></div>
                                                                <div className="text-sm font-semibold text-slate-700">{order.client?.fullName || "N/A"}</div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <Badge variant="secondary" className="text-[10px] font-bold bg-indigo-50 text-indigo-700 border-indigo-100">
                                                                {order.lensType}
                                                            </Badge>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="text-[10px] font-mono leading-tight">
                                                                <div className="text-slate-600 uppercase">OD: <span className="font-bold">{order.sphereR || '0.00'}/{order.cylindreR || '0.00'}</span></div>
                                                                <div className="text-slate-600 uppercase">OG: <span className="font-bold">{order.sphereL || '0.00'}/{order.cylindreL || '0.00'}</span></div>
                                                            </div>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="flex justify-end gap-1.5 items-center">
                                                                <Pencil className="h-3 w-3 text-indigo-300" />
                                                                <Input 
                                                                    type="number"
                                                                    value={purchasePrices[order.id] || ''}
                                                                    onChange={(e) => setPurchasePrices(prev => ({ ...prev, [order.id]: parseFloat(e.target.value) || 0 }))}
                                                                    className="h-8 w-24 text-right font-mono text-xs bg-transparent focus:bg-white border-slate-200"
                                                                />
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>

                        {/* Footer Bar Summary */}
                        <div className="flex items-center justify-between p-4 bg-slate-900 text-white rounded-xl shadow-lg border-t-4 border-indigo-500">
                            <div className="flex items-center gap-6">
                                <div className="space-y-0.5 text-center">
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Total Sélectionné</div>
                                    <div className="text-lg font-bold"><span className="text-indigo-400">{selectedCount}</span> <span className="text-sm text-slate-400">/ {pendingOrders.length}</span></div>
                                </div>
                                <div className="h-8 w-px bg-slate-700" />
                                <div className="space-y-0.5">
                                    <div className="text-[10px] uppercase font-bold text-slate-400">Total Achat (MAD)</div>
                                    <div className="text-lg font-bold text-green-400">{totalMAD.toLocaleString()} <span className="text-xs font-normal">MAD</span></div>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <Button variant="ghost" onClick={() => setOpen(false)} className="text-slate-400 hover:text-white hover:bg-white/5">Annuler</Button>
                                <Button 
                                    disabled={!selectedCount || !blNumber || isSubmitting}
                                    onClick={handleConfirm}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 font-bold shadow-xl active:scale-95 transition-all"
                                >
                                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                                    Valider la Réception ({selectedCount})
                                </Button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Success Screen */
                    <div className="space-y-6 py-6 animate-in zoom-in-95 duration-300">
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <div className="h-20 w-20 bg-green-50 rounded-2xl flex items-center justify-center text-green-600 shadow-inner ring-1 ring-green-100">
                                <CheckCircle2 className="h-12 w-12" />
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-3xl font-black text-slate-900">{receivedOrders.length} Commandes Reçues !</h3>
                                <p className="text-slate-500">Bon de Livraison: <span className="font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">{blNumber}</span></p>
                            </div>
                        </div>

                        <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
                            <div className="bg-slate-50 px-4 py-3 border-b text-[10px] font-black uppercase text-slate-400 tracking-widest">Informer les clients</div>
                            <ScrollArea className="h-[300px]">
                                <div className="divide-y divide-slate-100">
                                    {receivedOrders.map(order => {
                                        const clientName = order.clientName || "Client";
                                        const rawPhone = order.clientPhone;
                                        const message = encodeURIComponent(`Bonjour Mr/Mme ${clientName}, nous vous informons que vos lunettes sont prêtes chez OptiManager ! Vous pouvez passer les récupérer à votre convenance. À bientôt !`);
                                        const waLink = rawPhone ? `https://wa.me/${formatPhoneForWhatsapp(rawPhone)}?text=${message}` : "#";

                                        return (
                                            <div key={order.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="h-10 w-10 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-sm">#{order.id}</div>
                                                    <div>
                                                        <div className="font-bold text-slate-800">{clientName}</div>
                                                        <div className="text-xs text-slate-500 mt-0.5">{rawPhone || "Aucun numéro"}</div>
                                                    </div>
                                                </div>
                                                {rawPhone ? (
                                                    <a href={waLink} target="_blank" rel="noopener noreferrer">
                                                        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white font-bold gap-2">
                                                            <MessageCircle className="h-4 w-4" /> WhatsApp
                                                        </Button>
                                                    </a>
                                                ) : (
                                                    <span className="text-xs text-slate-400 italic">Aucun numéro</span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>

                        <div className="flex justify-center">
                            <Button variant="outline" className="px-12 py-6 border-slate-200 text-slate-600 hover:bg-slate-50 font-black rounded-2xl shadow-sm" onClick={handleFinalize}>
                                Terminer & Fermer
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
