'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Wallet, Coins, Check } from 'lucide-react';
import { BrandLoader } from '@/components/ui/loader-brand';

interface AdvancePaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    totalAmount: number;
    onConfirm: (advanceAmount: number) => void;
    isSubmitting?: boolean;
    title?: string;
}

export function AdvancePaymentDialog({
    open,
    onOpenChange,
    totalAmount,
    onConfirm,
    isSubmitting = false,
    title = "Saisir l'avance"
}: AdvancePaymentDialogProps) {
    const [advance, setAdvance] = React.useState<string>('0');

    // Reset when opening
    React.useEffect(() => {
        if (open) {
            setAdvance('0');
        }
    }, [open]);

    const handleConfirm = () => {
        const amount = parseFloat(advance);
        if (isNaN(amount)) return;
        onConfirm(amount);
    };

    const remaining = totalAmount - (parseFloat(advance) || 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl font-bold text-indigo-700">
                        <Wallet className="h-6 w-6" />
                        {title}
                    </DialogTitle>
                    <DialogDescription>
                        Entrez le montant de l'avance reçue pour cette opération.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-6 space-y-6">
                    <div className="space-y-4">
                        <div className="flex justify-between items-center px-1">
                            <Label className="text-sm font-semibold text-slate-700">Montant de l'avance (DH)</Label>
                            <span className="text-xs font-medium text-slate-500">Total: {totalAmount.toFixed(2)} DH</span>
                        </div>
                        <div className="relative group">
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max={totalAmount}
                                placeholder="0.00"
                                className="pl-12 h-14 text-2xl font-bold border-2 border-indigo-100 focus:border-indigo-500 focus:ring-indigo-200 transition-all rounded-xl"
                                value={advance}
                                onChange={(e) => setAdvance(e.target.value)}
                                autoFocus
                            />
                            <Coins className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-indigo-400" />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                        {[50, 100, 200].map(val => (
                            <Button
                                key={val}
                                variant="outline"
                                type="button"
                                className="h-10 border-indigo-50 text-indigo-600 hover:bg-indigo-50 hover:border-indigo-200"
                                onClick={() => setAdvance(val.toString())}
                            >
                                + {val}
                            </Button>
                        ))}
                    </div>

                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center transition-all duration-300">
                        <div>
                            <p className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Reste à payer</p>
                            <p className={`text-lg font-bold ${remaining < 0 ? 'text-red-600' : 'text-slate-700'}`}>
                                {remaining.toFixed(2)} DH
                            </p>
                        </div>
                        <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100">
                            <Check className={`h-5 w-5 ${remaining <= 0 && parseFloat(advance) > 0 ? 'text-emerald-500' : 'text-slate-300'}`} />
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="ghost"
                        onClick={() => onOpenChange(false)}
                        disabled={isSubmitting}
                    >
                        Annuler
                    </Button>
                    <Button
                        className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[120px] rounded-lg shadow-md shadow-indigo-100"
                        onClick={handleConfirm}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <>
                                <BrandLoader size="sm" className="mr-2" />
                                Patientez...
                            </>
                        ) : (
                            'Confirmer'
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
