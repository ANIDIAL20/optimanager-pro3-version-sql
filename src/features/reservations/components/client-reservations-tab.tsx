'use client';

import { useState } from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cancelFrameReservation } from '../services/cancel-frame-reservation';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import type { FrameReservation } from '../types/reservation.types';
import { Package, Trash2, CheckCircle2, AlertTriangle, Calendar, Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ClientReservationsTabProps {
    clientId: number;
    reservations: FrameReservation[];
    onUseReservation: (reservation: FrameReservation) => void;
}

export function ClientReservationsTab({
    clientId,
    reservations,
    onUseReservation,
}: ClientReservationsTabProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [loading, setLoading] = useState<number | null>(null);

    // State for Alert Dialog
    const [reservationToDelete, setReservationToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Open the dialog
    const requestDelete = (id: number) => {
        setReservationToDelete(id);
    };

    // Perform the deletion
    const confirmDelete = async () => {
        if (!reservationToDelete) return;

        setIsDeleting(true);
        setLoading(reservationToDelete);

        try {
            const reservation = await cancelFrameReservation({
                reservationId: reservationToDelete,
                reason: 'Annulation manuelle',
            });

            if (reservation) {
                toast({
                    title: 'Réservation annulée',
                    description: 'La réservation a été annulée avec succès.',
                    className: "bg-green-50 border-green-200 text-green-800"
                });
                router.refresh(); // Refresh to update the list
            }
        } catch (error) {
            console.error(error);
            toast({
                title: "Erreur critique",
                description: "Impossible d'annuler la réservation",
                variant: "destructive"
            });
        } finally {
            setLoading(null);
            setIsDeleting(false);
            setReservationToDelete(null);
        }
    };

    const getStatusBadge = (status: string) => {
        const styles = {
            PENDING: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
            COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
            CANCELLED: "bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200", // Gray for cancelled
            EXPIRED: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
        };

        const labels = {
            PENDING: 'En attente',
            COMPLETED: 'Complétée',
            CANCELLED: 'Annulée',
            EXPIRED: 'Expirée',
        };

        // Default fallback
        const statusKey = status as keyof typeof styles;
        const badgeClass = styles[statusKey] || "bg-gray-100 text-gray-800";

        return (
            <Badge variant="outline" className={cn("font-medium", badgeClass)}>
                {labels[status as keyof typeof labels] || status}
            </Badge>
        );
    };

    if (reservations.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-8 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center animate-in fade-in zoom-in duration-500">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <Package className="h-8 w-8 text-slate-400" />
                </div>
                <h3 className="text-lg font-semibold text-slate-900 mb-1">Aucune réservation</h3>
                <p className="text-sm text-slate-500 max-w-sm">
                    Il n'y a aucune réservation de monture active ou passée pour ce client.
                </p>
            </div>
        );
    }

    return (
        <>
            <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b pb-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-1">
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <Package className="h-5 w-5 text-indigo-600" />
                                Réservations de montures
                            </CardTitle>
                            <CardDescription>
                                Gérez les montures réservées par ce client.
                            </CardDescription>
                        </div>
                        <Badge variant="secondary" className="bg-white shadow-sm border">
                            {reservations.length} Total
                        </Badge>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                                    <TableHead className="w-[100px] font-semibold text-slate-700"># Réf</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Articles Réservés</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Dates</TableHead>
                                    <TableHead className="font-semibold text-slate-700 text-center">Finances</TableHead>
                                    <TableHead className="font-semibold text-slate-700">Statut</TableHead>
                                    <TableHead className="text-right font-semibold text-slate-700 pr-6">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {reservations.map((res) => (
                                    <TableRow key={res.id} className="hover:bg-slate-50/40 transition-colors group">
                                        <TableCell className="font-mono text-xs font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">
                                            #{res.id}
                                        </TableCell>
                                        <TableCell>
                                            <div className="space-y-1.5 py-1">
                                                {res.items.map((item, idx) => (
                                                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 text-sm">
                                                        <span className="font-medium text-slate-900 line-clamp-1">{item.productName}</span>
                                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                                            <span className="bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-mono">
                                                                Qté: {item.quantity}
                                                            </span>
                                                            {item.reference && (
                                                                <span className="text-slate-400 font-mono">• {item.reference}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 text-xs">
                                                <div className="flex items-center gap-1.5 text-slate-600">
                                                    <Calendar className="h-3 w-3 text-slate-400" />
                                                    <span>Du: {format(new Date(res.reservationDate), 'dd/MM', { locale: fr })}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-slate-500">
                                                    <AlertTriangle className="h-3 w-3 text-orange-400" />
                                                    <span>Au: {format(new Date(res.expiryDate), 'dd/MM/yyyy', { locale: fr })}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col items-center gap-1 min-w-[120px]">
                                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Total: {Number(res.totalAmount).toFixed(2)}</div>
                                                <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 px-2 py-0 h-5 text-[10px] font-bold">
                                                    Avance: {Number(res.depositAmount).toFixed(0)} DH
                                                </Badge>
                                                <div className="text-[11px] font-black text-amber-700 bg-amber-50 px-2 rounded-full border border-amber-100">
                                                    Reste: {Number(res.remainingAmount).toFixed(0)} DH
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(res.status)}</TableCell>

                                        <TableCell className="text-right pr-4">
                                            {res.status === 'PENDING' ? (
                                                <div className="flex justify-end gap-2 opacity-100 transition-opacity">
                                                    <Button
                                                        size="sm"
                                                        onClick={() => onUseReservation(res)}
                                                        className="bg-indigo-600 hover:bg-indigo-700 h-8 shadow-sm transition-all hover:shadow-md"
                                                    >
                                                        Utiliser
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="outline"
                                                        onClick={() => requestDelete(res.id)}
                                                        disabled={loading === res.id}
                                                        className="h-8 w-8 border-red-200 text-red-500 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            ) : res.status === 'COMPLETED' && res.saleId ? (
                                                <div className="flex justify-end">
                                                    <Button variant="ghost" size="sm" asChild className="text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 h-7 text-xs gap-1.5">
                                                        <div className="flex items-center gap-1">
                                                            <CheckCircle2 className="h-3.5 w-3.5" />
                                                            <span>Vente #{res.saleId}</span>
                                                        </div>
                                                    </Button>
                                                </div>
                                            ) : (
                                                <span className="text-slate-400 text-xs italic">Aucune action</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <AlertDialog open={!!reservationToDelete} onOpenChange={(open) => !open && setReservationToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-red-600">
                            <AlertTriangle className="h-5 w-5" />
                            Confirmer l'annulation
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir annuler cette réservation ?
                            <br className="mb-2" />
                            Cette action libérera les articles réservés et les remettra en stock. Cette action est irréversible.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Retour</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmDelete();
                            }}
                            disabled={isDeleting}
                            className="bg-red-600 hover:bg-red-700 text-white"
                        >
                            {isDeleting ? "Annulation..." : "Oui, annuler la réservation"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
