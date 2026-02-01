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
import { addPayment } from '@/app/actions/sales-actions';
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
    onPaymentSuccess?: () => void;
}

// ... existing code ...

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

export function PaymentDialog({ order, open, onOpenChange, onPaymentSuccess }: PaymentDialogProps) {
    const [amount, setAmount] = React.useState<string>('');
    const [method, setMethod] = React.useState<string>('cash');
    const [note, setNote] = React.useState<string>('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [paymentHistory, setPaymentHistory] = React.useState<any[]>(order.paymentHistory || []);

    const { toast } = useToast();
    const router = useRouter();

    // Calculate amounts from order
    const totalAmount = order.totalNet || order.totalTTC || 0;
    const totalPaid = order.totalPaye || 0;
    const remainingAmount = (order.resteAPayer !== undefined) ? order.resteAPayer : (totalAmount - totalPaid);

    // Update payment history when order changes
    React.useEffect(() => {
        if (order.paymentHistory) {
            setPaymentHistory(order.paymentHistory);
        }
    }, [order.paymentHistory]);

    // Reset form when dialog opens
    React.useEffect(() => {
        if (open) {
            setAmount(Math.max(0, remainingAmount).toFixed(2));
            setMethod('cash');
            setNote('');
        } else {
             // Force cleanup of body styles when dialog closes
             // This fixes the "stuck overlay" / "invisible barrier" issue
             setTimeout(() => {
                 document.body.style.pointerEvents = '';
                 // We don't want to reset overflow if another modal is open, 
                 // but for this specific "stuck" case, it's usually safe to ensure it's not 'hidden' if this is the only one.
                 // Ideally Radix handles this, but we are patching a bug.
                 if (document.body.style.pointerEvents === 'none') {
                     document.body.style.pointerEvents = '';
                 }
             }, 100);
        }
    }, [open, remainingAmount]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!order.id) return;

        const paymentAmount = parseFloat(amount);

        if (isNaN(paymentAmount) || paymentAmount <= 0) {
            toast({
                variant: 'destructive',
                title: 'Montant invalide',
                description: 'Veuillez entrer un montant valide',
            });
            return;
        }

        if (paymentAmount > remainingAmount + 0.5) { // Tolerance 0.5 DH
            toast({
                variant: 'destructive',
                title: 'Montant trop élevé',
                description: `Le montant ne peut pas dépasser le reste à payer (${remainingAmount.toFixed(2)} MAD)`,
            });
            return;
        }

        setIsSubmitting(true);

        try {
             // Use Server Action
             const result = await addPayment(order.id, {
                 amount: paymentAmount,
                 method,
                 note
             });

             if (result.success) {
                 toast({
                     title: '✅ Paiement enregistré',
                     description: `${paymentAmount.toFixed(2)} MAD ajouté avec succès.`,
                 });

                 onOpenChange(false);
                 router.refresh();
                 if (onPaymentSuccess) onPaymentSuccess();
             } else {
                 toast({
                     variant: 'destructive',
                     title: 'Erreur',
                     description: result.error || 'Impossible d\'enregistrer le paiement',
                 });
             }

        } catch (error: any) {
            console.error('Payment error:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Une erreur inattendue est survenue',
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
