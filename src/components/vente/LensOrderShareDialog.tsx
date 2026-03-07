"use client";

import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Printer, Glasses, Loader2, RefreshCcw } from "lucide-react";
import { getLensOrdersBySaleId } from "@/app/actions/lens-orders-actions";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { printInPlace } from "@/lib/print-in-place";

/** Utility to generate order text mirroring what's in /lens-orders/[id]/print */
const generateOrderText = (order: any) => {
    const clientName = order.client?.fullName || 'Client Anonyme';
    const lines = [
        '📋 COMMANDE DE VERRES (LABO)',
        '━━━━━━━━━━━━━━━━━━━━',
        '',
        `📅 Date: ${order.orderDate ? format(new Date(order.orderDate), 'dd/MM/yyyy') : '-'}`,
        `👤 Client: ${clientName}`,
        '',
        '🔍 DÉTAILS:',
        `• Type de verre: ${order.lensType || 'N/A'}`,
        `• Géométrie: ${order.orderType || 'N/A'}`,
        `• Traitement: ${order.treatment || 'Aucun'}`,
        order.sphereR || order.cylindreR ? `• OD: Sph ${order.sphereR || '-'} Cyl ${order.cylindreR || '-'} Axe ${order.axeR || '-'} Add ${order.additionR || '-'}` : '',
        order.sphereL || order.cylindreL ? `• OG: Sph ${order.sphereL || '-'} Cyl ${order.cylindreL || '-'} Axe ${order.axeL || '-'} Add ${order.additionL || '-'}` : '',
        '',
        order.notes ? `📝 Notes: ${order.notes}` : '',
        '',
        '━━━━━━━━━━━━━━━━━━━━',
    ];
    return lines.filter((l) => l !== '').join('\n');
};

/**
 * A dialog to share (Email/WhatsApp/Print) Bon de Labo linked to a Sale.
 * It takes a saleId, fetches linked lens orders automatically.
 */
export function LensOrderShareDialog({
    saleId,
    open,
    onOpenChange,
}: {
    saleId: string | number;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { toast } = useToast();
    const [loading, setLoading] = useState(false);
    const [orders, setOrders] = useState<any[] | null>(null);
    const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

    // Fetch immediately when opened
    React.useEffect(() => {
        if (open) {
            fetchOrders();
        } else {
            // Reset state
            setOrders(null);
            setSelectedOrder(null);
        }
    }, [open, saleId]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const res = await getLensOrdersBySaleId(saleId);
            if (res.success && res.orders && res.orders.length > 0) {
                setOrders(res.orders);
                setSelectedOrder(res.orders[0]); // Select first by default
            } else {
                setOrders([]);
            }
        } catch (err) {
            console.error(err);
            setOrders([]);
        } finally {
            setLoading(false);
        }
    };

    const handleEmailShare = () => {
        if (!selectedOrder) return;
        const subject = `Commande de verres - ${selectedOrder.lensType || 'Labo'}`;
        const body = encodeURIComponent(generateOrderText(selectedOrder));
        window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${body}`, '_blank');
        toast({ title: "Boîte mail ouverte", description: "Vérifiez votre application ou navigateur." });
        onOpenChange(false);
    };

    const handleWhatsAppShare = () => {
        if (!selectedOrder) return;
        const text = encodeURIComponent(generateOrderText(selectedOrder));
        window.open(`https://wa.me/?text=${text}`, '_blank');
        toast({ title: "WhatsApp ouvert", description: "Le texte de commande est prêt à être envoyé." });
        onOpenChange(false);
    };

    const handlePrint = () => {
        if (!selectedOrder) return;
        printInPlace(`/dashboard/lens-orders/${selectedOrder.id}/print`);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Glasses className="h-5 w-5 text-indigo-600" />
                        Bon de Labo / Commande
                    </DialogTitle>
                    <DialogDescription>
                        Options de génération et partage de commande verres liées à cette vente.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 flex flex-col gap-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center p-6 text-slate-500 gap-3">
                            <Loader2 className="h-6 w-6 animate-spin" />
                            <p className="text-sm">Recherche des commandes reliées...</p>
                        </div>
                    ) : (orders === null || orders.length === 0) ? (
                        <div className="flex flex-col items-center justify-center p-6 text-orange-600 gap-3 bg-orange-50 rounded-lg">
                            <RefreshCcw className="h-6 w-6" />
                            <p className="text-sm font-medium text-center">Aucun "Bon de Labo" associé trouvé pour cette vente.</p>
                            <p className="text-xs text-orange-500 opacity-80 text-center">Ajoutez un verre avec type de verre via la caisse pour lier une commande.</p>
                        </div>
                    ) : (
                        <>
                            {orders.length > 1 && (
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Sélectionner Verre:</label>
                                    <div className="flex flex-wrap gap-2">
                                        {orders.map(o => (
                                            <Button
                                                key={o.id}
                                                variant={selectedOrder?.id === o.id ? 'default' : 'outline'}
                                                size="sm"
                                                onClick={() => setSelectedOrder(o)}
                                                className={selectedOrder?.id === o.id ? "bg-indigo-600" : ""}
                                            >
                                                {o.lensType?.substring(0, 15) || 'Verre'} (#{o.id})
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="grid gap-3 pt-2">
                                <Button variant="outline" className="w-full justify-start h-auto p-4 hover:border-slate-300 transition-all hover:bg-slate-50 shadow-sm" onClick={handleEmailShare}>
                                    <Mail className="mr-3 h-5 w-5 text-blue-600" />
                                    <div className="text-left">
                                        <div className="font-semibold text-slate-800">Partager par Email</div>
                                        <div className="text-xs text-slate-500">Envoyer les détails du modèle via mail</div>
                                    </div>
                                </Button>
                                <Button variant="outline" className="w-full justify-start h-auto p-4 border-[#25d366]/20 hover:border-[#25d366]/60 transition-all hover:bg-[#25d366]/5 shadow-sm" onClick={handleWhatsAppShare}>
                                    <MessageCircle className="mr-3 h-5 w-5 text-[#25d366]" />
                                    <div className="text-left">
                                        <div className="font-semibold text-slate-800">Partager par WhatsApp</div>
                                        <div className="text-xs text-slate-500">Générer le texte modèle WhatsApp</div>
                                    </div>
                                </Button>
                                <Button variant="outline" className="w-full justify-start h-auto p-4 hover:border-indigo-300 transition-all hover:bg-indigo-50 shadow-sm border-indigo-100 bg-indigo-50/30" onClick={handlePrint}>
                                    <Printer className="mr-3 h-5 w-5 text-indigo-700" />
                                    <div className="text-left">
                                        <div className="font-semibold text-indigo-900">Imprimer le Bon de Labo</div>
                                        <div className="text-xs text-indigo-600/70">Ouvrir la page pour générer ou imprimer le PDF</div>
                                    </div>
                                </Button>
                            </div>
                        </>
                    )}
                </div>

                <DialogFooter className="sm:justify-between">
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Fermer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
