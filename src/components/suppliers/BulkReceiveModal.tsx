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
import { Badge } from "@/components/ui/badge";
import { 
    Loader2, 
    CheckCircle2, 
    PackageCheck, 
    Search,
    Plus,
    Trash2,
    Check,
    Coins,
    PackagePlus
} from "lucide-react";
import { getSuppliersList } from '@/app/actions/supplier-actions';
import { getOpenOrdersWithItems, submitBulkReception } from '@/app/actions/goods-receipt-actions';
import { getProducts } from '@/app/actions/products-actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion, AnimatePresence } from 'framer-motion';

interface ReceiptLine {
  productId: number;
  productName: string;
  orderItemId?: number;
  orderId?: string;
  qtyOrdered: number;
  qtyReceived: number;
  qtyRejected: number;
  unitPrice: number;
  lineStatus: 'complete' | 'partial' | 'rejected' | 'extra';
}

interface BulkReceiveModalProps {
    initialSupplierId?: string;
}

export function BulkReceiveModal({ initialSupplierId }: BulkReceiveModalProps = {}) {
    const [open, setOpen] = React.useState(false);
    const { toast } = useToast();
    const router = useRouter();
    
    // Header States
    const [suppliers, setSuppliers] = React.useState<any[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = React.useState<string>(initialSupplierId || "");
    const [blNumber, setBlNumber] = React.useState("");
    
    // Open Orders Data
    const [openOrders, setOpenOrders] = React.useState<any[]>([]);
    const [isLoadingOrders, setIsLoadingOrders] = React.useState(false);
    const [selectedOrderIds, setSelectedOrderIds] = React.useState<string[]>([]);
    
    // Grid State
    const [lines, setLines] = React.useState<ReceiptLine[]>([]);
    
    // Product Selector for Extras
    const [catalogProducts, setCatalogProducts] = React.useState<any[]>([]);
    const [isSearchingProducts, setIsSearchingProducts] = React.useState(false);
    
    // Process State
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [isSuccess, setIsSuccess] = React.useState(false);
    const [stats, setStats] = React.useState({ itemsCount: 0, creditGenerated: 0 });

    // 1. Fetch Suppliers
    React.useEffect(() => {
        if (open) {
            const fetchSuppliers = async () => {
                const res = await getSuppliersList();
                if (res.success) {
                    setSuppliers(res.data || []);
                }
            };
            fetchSuppliers();
            resetModal();
        }
    }, [open]);

    // 2. Fetch Open Orders
    React.useEffect(() => {
        if (!selectedSupplierId || !open) return;
        
        const fetchOrders = async () => {
            setIsLoadingOrders(true);
            try {
                const res = await getOpenOrdersWithItems(selectedSupplierId);
                if (res.success) {
                    setOpenOrders(res.orders || []);
                }
            } finally {
                setIsLoadingOrders(false);
            }
        };
        fetchOrders();
    }, [selectedSupplierId, open]);

    const resetModal = () => {
        setBlNumber("");
        setSelectedOrderIds([]);
        setLines([]);
        setIsSuccess(false);
    };

    const handleToggleOrder = (order: any) => {
        const orderIdStr = String(order.id);
        const isSelected = selectedOrderIds.includes(orderIdStr);
        
        if (isSelected) {
            setSelectedOrderIds(prev => prev.filter(id => id !== orderIdStr));
            setLines(prev => prev.filter(l => l.orderId !== orderIdStr));
        } else {
            setSelectedOrderIds(prev => [...prev, orderIdStr]);
            const newLines: ReceiptLine[] = (order.items || []).map((item: any) => ({
                productId: item.productId,
                productName: item.label,
                orderItemId: item.id,
                orderId: orderIdStr,
                qtyOrdered: item.quantity - item.qtyReceived,
                qtyReceived: item.quantity - item.qtyReceived,
                qtyRejected: 0,
                unitPrice: item.unitPrice,
                lineStatus: 'complete'
            }));
            setLines(prev => [...prev, ...newLines]);
        }
    };

    const handleReceiveAll = () => {
        setLines(prev => prev.map(l => ({
            ...l,
            qtyReceived: l.qtyOrdered,
            qtyRejected: 0,
            lineStatus: 'complete'
        })));
        toast({ title: "Mise à jour", description: "Toutes les lignes ont été marquées comme reçues." });
    };

    const handleAddExtraProduct = async (productId: string) => {
        setIsSearchingProducts(true);
        try {
            const res = await getProducts();
            if (res.success) {
                const prod = (res.data as any[]).find((p: any) => String(p.id) === productId);
                if (prod) {
                    const newLine: ReceiptLine = {
                        productId: prod.id,
                        productName: prod.nom,
                        qtyOrdered: 0,
                        qtyReceived: 1,
                        qtyRejected: 0,
                        unitPrice: Number(prod.prixAchat || 0),
                        lineStatus: 'extra'
                    };
                    setLines(prev => [...prev, newLine]);
                }
            }
        } finally {
            setIsSearchingProducts(false);
        }
    };

    const updateLine = (index: number, updates: Partial<ReceiptLine>) => {
        setLines(prev => {
            const newLines = [...prev];
            const line = { ...newLines[index], ...updates };
            
            // Status Logic
            if (!line.orderItemId) {
                line.lineStatus = 'extra';
            } else if (line.qtyRejected > 0) {
                line.lineStatus = 'rejected';
            } else if (line.qtyReceived < line.qtyOrdered) {
                line.lineStatus = 'partial';
            } else {
                line.lineStatus = 'complete';
            }
            
            newLines[index] = line;
            return newLines;
        });
    };

    const handleSubmit = async () => {
        if (!selectedSupplierId || !blNumber) {
            toast({ title: "Incomplet", description: "Fournisseur et N° BL requis.", variant: "destructive" });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await submitBulkReception({
                supplierId: selectedSupplierId,
                deliveryNoteRef: blNumber,
                items: lines
            }) as any;

            if (res.success) {
                setStats({ 
                    itemsCount: res.itemsCount || 0, 
                    creditGenerated: res.creditGenerated || 0 
                });
                setIsSuccess(true);
                
                toast({ 
                    title: "Succès !", 
                    description: `Réception validée — ${res.itemsCount} produits en stock.` 
                });
                
                if (res.creditGenerated > 0) {
                    setTimeout(() => {
                        toast({ 
                            title: "Avoir généré", 
                            description: `Un avoir de ${res.creditGenerated} MAD a été créé pour les rejets.`,
                            variant: "default",
                            className: "bg-green-600 text-white border-green-700"
                        });
                    }, 500);
                }

                setTimeout(() => {
                    setOpen(false);
                    router.refresh();
                }, 2000);
            } else {
                toast({ title: "Erreur", description: res.error, variant: "destructive" });
            }
        } catch (error: any) {
            toast({ title: "Erreur système", description: error.message, variant: "destructive" });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getRowColor = (line: ReceiptLine) => {
        if (line.lineStatus === 'extra') return "bg-blue-50/50 hover:bg-blue-100/50";
        if (line.lineStatus === 'rejected') return "bg-red-50/50 hover:bg-red-100/50";
        if (line.lineStatus === 'partial') return "bg-yellow-50/50 hover:bg-yellow-100/50";
        if (line.lineStatus === 'complete') return "bg-green-50/50 hover:bg-green-100/50";
        return "";
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-indigo-200 text-indigo-700 hover:bg-indigo-50">
                    <PackageCheck className="h-4 w-4" /> Réception Groupée
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[95vh] flex flex-col p-0 overflow-hidden shadow-2xl border-indigo-100">
                <DialogHeader className="p-6 pb-4 bg-slate-50/50 border-b">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                <PackageCheck className="h-7 w-7" />
                            </div>
                            <div>
                                <DialogTitle className="text-2xl font-black text-slate-900 tracking-tight">Poste de Réception</DialogTitle>
                                <DialogDescription className="text-slate-500 font-medium">Contrôlez et intégrez les marchandises au stock.</DialogDescription>
                            </div>
                        </div>
                        {isSuccess && (
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-full font-bold shadow-md">
                                <CheckCircle2 className="h-5 w-5" /> VALIDÉ
                            </motion.div>
                        )}
                    </div>
                </DialogHeader>

                {!isSuccess ? (
                    <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
                        {/* SIDEBAR: Orders */}
                        <div className="w-full lg:w-80 border-r bg-slate-50/30 flex flex-col shadow-inner">
                            <div className="p-5 space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Fournisseur Partenaire</Label>
                                    <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                                        <SelectTrigger className="bg-white border-slate-200 h-11 rounded-xl shadow-sm">
                                            <SelectValue placeholder="Sélectionner..." />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl p-1">
                                            {suppliers.map(s => <SelectItem key={s.id} value={String(s.id)} className="rounded-lg">{s.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Référence Bon Livraison (BL)</Label>
                                    <div className="relative">
                                        <Input 
                                            placeholder="N° BL reçu..." 
                                            value={blNumber} 
                                            onChange={e => setBlNumber(e.target.value)} 
                                            className="bg-white border-slate-200 h-11 rounded-xl shadow-sm pl-10 font-bold"
                                        />
                                        <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="px-5 py-3 border-y bg-white/50 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bons de Commande</span>
                                {isLoadingOrders && <Loader2 className="h-3 w-3 animate-spin text-indigo-500" />}
                            </div>
                            
                            <ScrollArea className="flex-1">
                                <div className="p-3 space-y-2">
                                    {openOrders.length === 0 && !isLoadingOrders && (
                                        <div className="text-center py-12 px-6">
                                            <div className="h-12 w-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                                                <Search className="h-6 w-6 text-slate-300" />
                                            </div>
                                            <p className="text-slate-400 text-xs font-medium italic">
                                                {selectedSupplierId ? 'Aucune commande pendante' : 'Veuillez choisir un fournisseur'}
                                            </p>
                                        </div>
                                    )}
                                    <AnimatePresence>
                                        {openOrders.map(order => (
                                            <motion.div 
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                key={order.id}
                                                className={cn(
                                                    "p-4 rounded-2xl border-2 cursor-pointer transition-all duration-200",
                                                    selectedOrderIds.includes(String(order.id))
                                                        ? "bg-indigo-600 border-indigo-700 text-white shadow-lg shadow-indigo-100"
                                                        : "bg-white border-slate-100 hover:border-indigo-200 text-slate-700 shadow-sm"
                                                )}
                                                onClick={() => handleToggleOrder(order)}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-black text-sm">{order.orderNumber || order.orderReference}</span>
                                                    <div className={cn("h-5 w-5 rounded-full flex items-center justify-center border-2", selectedOrderIds.includes(String(order.id)) ? "bg-white border-white text-indigo-600" : "bg-slate-50 border-slate-200")}>
                                                        {selectedOrderIds.includes(String(order.id)) && <Check className="h-3 w-3" />}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between text-[10px] opacity-80">
                                                    <span className="font-bold">{format(new Date(order.createdAt), 'dd MMMM yyyy', { locale: fr })}</span>
                                                    <Badge variant="outline" className={cn("rounded-lg px-2", selectedOrderIds.includes(String(order.id)) ? "border-white/30 text-white bg-white/10" : "bg-slate-100")}>
                                                        {order.items?.length || 0} lignes
                                                    </Badge>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                </div>
                            </ScrollArea>
                        </div>

                        {/* MAIN: Grid */}
                        <div className="flex-1 flex flex-col bg-white overflow-hidden">
                            <div className="p-4 border-b bg-slate-50/50 flex items-center justify-between">
                                <div className="flex gap-2">
                                    <Button size="sm" variant="outline" className="h-9 rounded-xl gap-2 font-bold" onClick={handleReceiveAll}>
                                        <Check className="h-4 w-4 text-green-600" /> Tout réceptionner
                                    </Button>
                                    <Select onValueChange={handleAddExtraProduct}>
                                        <SelectTrigger className="h-9 w-44 rounded-xl gap-2 font-bold border-indigo-200 text-indigo-700">
                                            <Plus className="h-4 w-4" /> Ajouter produit
                                        </SelectTrigger>
                                        <SelectContent>
                                            <div className="p-2 border-b bg-slate-50">
                                                <Input 
                                                    placeholder="Chercher dans catalogue..." 
                                                    className="h-8 text-xs"
                                                    onFocus={async () => {
                                                        const res = await getProducts();
                                                        if (res.success) setCatalogProducts(res.data);
                                                    }}
                                                />
                                            </div>
                                            <ScrollArea className="h-48">
                                                {catalogProducts.slice(0, 10).map(p => (
                                                    <SelectItem key={p.id} value={String(p.id)}>{p.nom}</SelectItem>
                                                ))}
                                            </ScrollArea>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-green-500" /> <span className="text-[10px] font-bold text-slate-400">Complet</span></div>
                                    <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-yellow-500" /> <span className="text-[10px] font-bold text-slate-400">Partiel</span></div>
                                    <div className="flex items-center gap-1.5"><div className="h-2 w-2 rounded-full bg-red-500" /> <span className="text-[10px] font-bold text-slate-400">Rejet</span></div>
                                </div>
                            </div>

                            <div className="flex-1 overflow-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-white z-20 shadow-sm">
                                        <TableRow className="bg-slate-50 border-b-2">
                                            <TableHead className="w-[40%] pl-6">Produit / Désignation</TableHead>
                                            <TableHead className="text-center font-black text-slate-400">CDÉ</TableHead>
                                            <TableHead className="text-center w-28 text-green-600 font-black">REÇU</TableHead>
                                            <TableHead className="text-center w-28 text-red-500 font-black">REJETÉ</TableHead>
                                            <TableHead className="text-center">PU (MAD)</TableHead>
                                            <TableHead className="text-center">STATUT</TableHead>
                                            <TableHead className="w-12"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        <AnimatePresence mode="popLayout">
                                            {lines.length === 0 && (
                                                <TableRow>
                                                    <TableCell colSpan={7} className="h-80 border-none">
                                                        <div className="flex flex-col items-center justify-center gap-4 text-slate-300">
                                                            <div className="h-24 w-24 bg-slate-50 rounded-3xl flex items-center justify-center animate-pulse">
                                                                <PackagePlus className="h-12 w-12" />
                                                            </div>
                                                            <p className="text-sm font-bold max-w-xs text-center">Aucune ligne active. Sélectionnez un Bon de Commande à gauche ou un produit du catalogue.</p>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                            {lines.map((line, idx) => (
                                                <motion.tr 
                                                    key={`${line.orderItemId || line.productId}-${idx}`}
                                                    layout
                                                    initial={{ opacity: 0, x: -20 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    exit={{ opacity: 0, scale: 0.95 }}
                                                    className={cn("group transition-colors border-b", getRowColor(line))}
                                                >
                                                    <TableCell className="pl-6 py-4">
                                                        <div className="font-black text-slate-800 tracking-tight">{line.productName}</div>
                                                        {line.orderId && <div className="text-[10px] text-indigo-400 font-black uppercase mt-1 tracking-wider">Origine: BC-#{line.orderId.slice(0, 8)}</div>}
                                                        {!line.orderItemId && <div className="text-[10px] text-blue-500 font-black uppercase mt-1 tracking-wider italic">Article additionnel (Hors commande)</div>}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono font-bold text-slate-500">{line.qtyOrdered}</TableCell>
                                                    <TableCell>
                                                        <Input 
                                                            type="number" 
                                                            className="h-10 text-center font-black bg-white/80 border-slate-200 rounded-xl focus:ring-green-500 focus:border-green-500" 
                                                            value={line.qtyReceived || ''}
                                                            onChange={e => updateLine(idx, { qtyReceived: parseInt(e.target.value) || 0 })}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input 
                                                            type="number" 
                                                            className="h-10 text-center font-black text-red-600 bg-white/80 border-red-100 rounded-xl focus:ring-red-500 focus:border-red-500" 
                                                            value={line.qtyRejected || ''}
                                                            onChange={e => updateLine(idx, { qtyRejected: parseInt(e.target.value) || 0 })}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono font-bold text-slate-700">{line.unitPrice.toLocaleString()} <span className="text-[10px] font-normal">MAD</span></TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge className={cn(
                                                            "rounded-lg px-2 py-1 text-[10px] font-black uppercase border-none",
                                                            line.lineStatus === 'complete' ? 'bg-green-500 text-white' :
                                                            line.lineStatus === 'partial' ? 'bg-yellow-500 text-white' :
                                                            line.lineStatus === 'rejected' ? 'bg-red-500 text-white' :
                                                            'bg-blue-600 text-white'
                                                        )}>
                                                            {line.lineStatus === 'complete' ? 'Complet' :
                                                             line.lineStatus === 'partial' ? 'Partiel' :
                                                             line.lineStatus === 'rejected' ? 'Rejeté' : 'Extra'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="pr-6">
                                                        <Button 
                                                            variant="ghost" 
                                                            size="icon" 
                                                            className="h-8 w-8 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => setLines(prev => prev.filter((_, i) => i !== idx))}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </motion.tr>
                                            ))}
                                        </AnimatePresence>
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="p-6 border-t bg-slate-900 text-white shadow-2xl z-30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-10">
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Articles Consolider</p>
                                            <p className="text-2xl font-black text-white">{lines.length} <span className="text-xs font-normal text-slate-400 uppercase">lignes</span></p>
                                        </div>
                                        <div className="h-10 w-px bg-slate-700" />
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Quantité Reçue</p>
                                            <p className="text-2xl font-black text-indigo-400">{lines.reduce((s: number, l) => s + l.qtyReceived, 0)} <span className="text-xs font-normal text-slate-400 uppercase">unités</span></p>
                                        </div>
                                        <div className="h-10 w-px bg-slate-700" />
                                        <div className="space-y-1">
                                            <p className="text-[10px] font-black uppercase text-red-400 tracking-widest">Total Rejeté</p>
                                            <p className="text-2xl font-black text-red-500">{lines.reduce((s: number, l) => s + l.qtyRejected, 0)}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <Button variant="ghost" className="text-slate-400 hover:text-white hover:bg-white/10 px-6 font-bold" onClick={() => setOpen(false)}>Annuler</Button>
                                        <Button 
                                            className="bg-indigo-600 hover:bg-indigo-500 px-10 rounded-2xl h-14 font-black shadow-xl shadow-indigo-900/40 active:scale-95 transition-all text-lg tracking-tight"
                                            onClick={handleSubmit}
                                            disabled={isSubmitting || lines.length === 0}
                                        >
                                            {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                                            Valider la Réception
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* SUCCESS SCREEN */
                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-16 flex flex-col items-center justify-center text-center space-y-8">
                        <div className="h-28 w-28 bg-green-500 rounded-[2.5rem] flex items-center justify-center text-white shadow-2xl shadow-green-200 ring-8 ring-green-50">
                            <CheckCircle2 className="h-14 w-14" />
                        </div>
                        <div className="space-y-3">
                            <h3 className="text-4xl font-black text-slate-900 tracking-tight">Réception Terminée !</h3>
                            <p className="text-slate-500 text-lg max-w-md mx-auto font-medium">
                                Le stock a été incrémenté de <span className="text-indigo-600 font-black">{stats.itemsCount} articles</span>.
                            </p>
                        </div>
                        
                        {stats.creditGenerated > 0 && (
                            <div className="bg-emerald-50 border-2 border-emerald-100 p-6 rounded-3xl flex items-center gap-5 max-w-md mx-auto shadow-sm">
                                <div className="h-14 w-14 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shadow-lg">
                                    <Coins className="h-8 w-8" />
                                </div>
                                <div className="text-left">
                                    <p className="text-xs font-black text-emerald-600 uppercase tracking-widest">Avoir Automatique</p>
                                    <p className="text-2xl font-black text-emerald-900">{stats.creditGenerated.toLocaleString()} MAD</p>
                                    <p className="text-[10px] text-emerald-600 font-medium">Généré suite aux rejets constatés.</p>
                                </div>
                            </div>
                        )}

                        <div className="pt-8 flex gap-4">
                            <Button 
                                variant="outline" 
                                className="px-10 py-6 border-slate-200 text-slate-600 hover:bg-slate-50 font-black rounded-2xl" 
                                onClick={() => setOpen(false)}
                            >
                                Fermer
                            </Button>
                            <Button className="bg-slate-900 hover:bg-black px-10 py-6 font-black rounded-2xl shadow-xl shadow-slate-200">
                                Imprimer le Bon
                            </Button>
                        </div>
                    </motion.div>
                )}
            </DialogContent>
        </Dialog>
    );
}
