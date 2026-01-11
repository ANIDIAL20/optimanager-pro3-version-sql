'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, CreditCard, History } from 'lucide-react';
import { useFirestore, useFirebase } from '@/firebase';
import { doc, updateDoc, arrayUnion, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { Sale } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PaymentDialogProps {
    order: Sale;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

interface PaymentHistoryItem {
    id: string;
    amount: number;
    date: string;
    method: string;
    note?: string;
    receivedBy?: string;
}

const PAYMENT_METHODS = [
    { value: 'cash', label: 'Espèces' },
    { value: 'card', label: 'Carte Bancaire' },
    { value: 'check', label: 'Chèque' },
    { value: 'transfer', label: 'Virement' },
];

const METHOD_LABELS: Record<string, string> = {
    cash: 'Espèces',
    card: 'Carte',
    check: 'Chèque',
    transfer: 'Virement',
};

export function PaymentDialog({ order, open, onOpenChange }: PaymentDialogProps) {
    const [amount, setAmount] = React.useState<string>('');
    const [method, setMethod] = React.useState<string>('cash');
    const [note, setNote] = React.useState<string>('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [paymentHistory, setPaymentHistory] = React.useState<PaymentHistoryItem[]>([]);

    const firestore = useFirestore();
    const { user } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();

    // Calculate amounts from history
    const totalAmount = order.totalNet || 0;
    const totalPaid = React.useMemo(() => {
        return paymentHistory.reduce((sum, payment) => sum + payment.amount, 0);
    }, [paymentHistory]);
    const remainingAmount = totalAmount - totalPaid;

    // Fetch payment history when dialog opens
    React.useEffect(() => {
        const fetchPaymentHistory = async () => {
            if (!open || !firestore || !user || !order.id) return;

            try {
                const orderRef = doc(firestore, `stores/${user.uid}/sales`, order.id);
                const orderSnap = await getDoc(orderRef);

                if (orderSnap.exists()) {
                    const data = orderSnap.data();
                    setPaymentHistory(data.paymentHistory || []);
                }
            } catch (error) {
                console.error('Error fetching payment history:', error);
            }
        };

        if (open) {
            fetchPaymentHistory();
            setAmount(Math.max(0, remainingAmount).toFixed(2));
            setMethod('cash');
            setNote('');
        }
    }, [open, firestore, user, order.id, remainingAmount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!firestore || !user) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Service non disponible',
            });
            return;
        }

        const paymentAmount = parseFloat(amount);

        // Validation
        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            toast({
                variant: 'destructive',
                title: 'Montant invalide',
                description: 'Veuillez entrer un montant valide',
            });
            return;
        }

        if (paymentAmount > remainingAmount + 0.5) {
            toast({
                variant: 'destructive',
                title: 'Montant trop élevé',
                description: `Le montant ne peut pas dépasser le reste à payer (${remainingAmount.toFixed(2)} MAD)`,
            });
            return;
        }

        setIsSubmitting(true);

        try {
            // Step A: Create new payment object
            const newPayment: PaymentHistoryItem = {
                id: `PAY-${Date.now()}`,
                amount: paymentAmount,
                date: new Date().toISOString(),
                method: method,
                ...(note && { note }),
                ...(user.email && { receivedBy: user.email }),
            };

            // Step B: Calculate new totals
            const newTotalPaid = totalPaid + paymentAmount;
            const newRest = totalAmount - newTotalPaid;

            // Step C: Determine new status
            let newStatus: string;
            if (newRest <= 0.5) {
                newStatus = 'payée';
            } else if (newTotalPaid > 0) {
                newStatus = 'partiel';
            } else {
                newStatus = 'impayée';
            }

            // Step D: Atomic update with arrayUnion
            const orderRef = doc(firestore, `stores/${user.uid}/sales`, order.id);
            await updateDoc(orderRef, {
                paymentHistory: arrayUnion(newPayment),
                totalPaye: newTotalPaid,
                resteAPayer: Math.max(0, newRest),
                status: newStatus,
                lastPaymentDate: newPayment.date,
            });

            toast({
                title: '✅ Paiement enregistré',
                description: `${paymentAmount.toFixed(2)} MAD ajouté. ${newRest <= 0.5 ? 'Commande payée!' : `Reste: ${newRest.toFixed(2)} MAD`}`,
            });

            onOpenChange(false);
            router.refresh();

        } catch (error: any) {
            console.error('Payment error:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Impossible d\'enregistrer le paiement',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Enregistrer un Paiement
                    </DialogTitle>
                    <DialogDescription>
                        Commande #{order.id?.substring(0, 8)}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit}>
                    <div className="space-y-6 py-4">

                        {/* Payment History Timeline */}
                        {paymentHistory.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                    <History className="h-4 w-4" />
                                    Historique des Paiements
                                </div>
                                <ScrollArea className="h-[120px] rounded-md border">
                                    <div className="p-4 space-y-2">
                                        {paymentHistory.map((payment, index) => (
                                            <div
                                                key={payment.id}
                                                className="flex items-center justify-between text-sm py-2 border-b last:border-b-0"
                                            >
                                                <div className="flex-1">
                                                    <p className="font-medium text-slate-900">
                                                        Tranche {index + 1}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {format(new Date(payment.date), 'dd MMM yyyy HH:mm', { locale: fr })}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-green-600">
                                                        +{payment.amount.toFixed(2)} MAD
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {METHOD_LABELS[payment.method] || payment.method}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}

                        {/* Summary */}
                        <div className="rounded-lg bg-slate-50 p-4 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Total Commande:</span>
                                <span className="font-semibold text-slate-900">{totalAmount.toFixed(2)} MAD</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Total Versé ({paymentHistory.length} tranche{paymentHistory.length > 1 ? 's' : ''}):</span>
                                <span className="font-semibold text-green-600">{totalPaid.toFixed(2)} MAD</span>
                            </div>
                            <div className="h-px bg-slate-200" />
                            <div className="flex justify-between">
                                <span className="text-slate-700 font-medium">Reste à Payer:</span>
                                <span className="font-bold text-orange-600 text-lg">{Math.max(0, remainingAmount).toFixed(2)} MAD</span>
                            </div>
                        </div>

                        {/* New Payment Amount */}
                        <div className="space-y-2">
                            <Label htmlFor="amount">Nouveau Paiement (MAD)</Label>
                            <Input
                                id="amount"
                                type="number"
                                step="0.01"
                                min="0"
                                max={Math.max(0, remainingAmount)}
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="0.00"
                                required
                            />
                            <p className="text-xs text-muted-foreground">
                                Maximum: {Math.max(0, remainingAmount).toFixed(2)} MAD
                            </p>
                        </div>

                        {/* Payment Method */}
                        <div className="space-y-2">
                            <Label htmlFor="method">Méthode de paiement</Label>
                            <Select value={method} onValueChange={setMethod}>
                                <SelectTrigger id="method">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {PAYMENT_METHODS.map((pm) => (
                                        <SelectItem key={pm.value} value={pm.value}>
                                            {pm.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Note */}
                        <div className="space-y-2">
                            <Label htmlFor="note">Note (optionnel)</Label>
                            <Textarea
                                id="note"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Ex: Paiement reçu en magasin"
                                rows={2}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Annuler
                        </Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Enregistrer le Paiement
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
