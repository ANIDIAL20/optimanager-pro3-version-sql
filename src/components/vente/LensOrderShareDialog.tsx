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

/** 
 * Utility to generate a professional order text (Redaction).
 * Mirroring technical standards for laboratory orders.
 */
const generateOrderText = (order: any) => {
    const clientName = order.client?.fullName || 'Client Anonyme';
    
    // Formatting helper for optical powers (e.g. +0.25, -1.00)
    const f = (v: any) => {
        if (v === null || v === undefined || v === '') return '0.00';
        const num = parseFloat(v);
        if (isNaN(num)) return v;
        return num >= 0 ? `+${num.toFixed(2)}` : num.toFixed(2);
    };

    const lines = [
        '📋 COMMANDE LABORATOIRE',
        '━━━━━━━━━━━━━━━━━━━━',
        `👤 CLIENT: ${clientName.toUpperCase()}`,
        `📅 DATE: ${order.orderDate ? format(new Date(order.orderDate), 'dd/MM/yyyy') : format(new Date(), 'dd/MM/yyyy')}`,
        `🏢 LABO: ${order.supplierName || 'Externe'}`,
        '━━━━━━━━━━━━━━━━━━━━',
        '',
        '🔍 SPÉCIFICATIONS TECHNIQUES:',
        `• Type: ${order.orderType || 'Unifocal'}`,
        `• Verre: ${order.lensType || 'N/A'}`,
        order.indice ? `• Indice: ${order.indice}` : '',
        order.matiere ? `• Matière: ${order.matiere}` : '',
        order.treatment ? `• Traitement: ${order.treatment}` : '',
        '',
        '✨ PUISSANCES MESURÉES:',
        '👁️ ŒIL DROIT (OD):',
        `   Sph ${f(order.sphereR)} Cyl ${f(order.cylindreR)} Axe ${order.axeR || '0'}°`,
        order.additionR && order.additionR !== '0' ? `   ADDITION: ${order.additionR}` : '',
        (order.ecartPupillaireR || order.hauteurR) ? `   EP: ${order.ecartPupillaireR || '-'} / H: ${order.hauteurR || '-'}` : '',
        order.diameterR ? `   Ø Diamètre: ${order.diameterR}` : '',
        '',
        '👁️ ŒIL GAUCHE (OG):',
        `   Sph ${f(order.sphereL)} Cyl ${f(order.cylindreL)} Axe ${order.axeL || '0'}°`,
        order.additionL && order.additionL !== '0' ? `   ADDITION: ${order.additionL}` : '',
        (order.ecartPupillaireL || order.hauteurL) ? `   EP: ${order.ecartPupillaireL || '-'} / H: ${order.hauteurL || '-'}` : '',
        order.diameterL ? `   Ø Diamètre: ${order.diameterL}` : '',
        '',
        order.notes ? `📝 NOTES COMPLÉMENTAIRES:\n${order.notes}` : '',
        '',
        '━━━━━━━━━━━━━━━━━━━━',
        'Généré via OptiManager Pro',
    ];

    // Filter out empty strings from optional fields
    return lines.filter(line => line !== '').join('\n');
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
                        <div className="flex flex-col items-center justify-center p-8 text-slate-500 gap-4 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200">
                            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400">
                                <RefreshCcw className="h-8 w-8" />
                            </div>
                            <div className="text-center space-y-1">
                                <p className="text-base font-bold text-slate-800">Aucun "Bon de Labo" trouvé</p>
                                <p className="text-sm text-slate-500 max-w-[240px]">
                                    Cette vente n&apos;est liée à aucune commande de verres spécifique.
                                </p>
                            </div>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                className="mt-2 h-9 rounded-full border-slate-300 font-semibold"
                                onClick={fetchOrders}
                            >
                                <RefreshCcw className="mr-2 h-3.5 w-3.5" />
                                Actualiser
                            </Button>
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
