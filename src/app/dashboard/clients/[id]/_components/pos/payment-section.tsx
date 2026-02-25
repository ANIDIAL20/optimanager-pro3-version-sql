'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { BrandLoader } from '@/components/ui/loader-brand';
import { cn } from '@/lib/utils';


import { Clock } from 'lucide-react';

interface PaymentData {
    amountPaid: number;
    method: string;
    notes: string;
    isDeclared: boolean;
}

interface PaymentSectionProps {
    total: number;
    onProcessSale: (paymentData: PaymentData, intent: 'SALE' | 'RESERVATION') => Promise<void>;
    isProcessing: boolean;
    defaultDeclared?: boolean;
    alreadyPaid?: number;           // avance réservation (ancien)
    advanceFromLensOrders?: number; // ✅ avance commandes verres
    disableReservation?: boolean;
}

export function PaymentSection({ total, onProcessSale, isProcessing, defaultDeclared = false, alreadyPaid = 0, advanceFromLensOrders = 0, disableReservation = false }: PaymentSectionProps) {
    const [amountPaid, setAmountPaid] = React.useState<string>('');
    const [method, setMethod] = React.useState('Especes');
    const [notes, setNotes] = React.useState('');
    const [clickedIntent, setClickedIntent] = React.useState<'SALE' | 'RESERVATION' | null>(null);

    // ✅ Total de toutes les avances déjà versées
    const totalAlreadyPaid = alreadyPaid + advanceFromLensOrders;

    React.useEffect(() => {
        const remaining = Math.max(0, total - totalAlreadyPaid);
        setAmountPaid(remaining.toString());
    }, [total, totalAlreadyPaid]);

    const numericAmount = parseFloat(amountPaid) || 0;
    const totalWithNewPayment = numericAmount + totalAlreadyPaid;
    const reste = Math.max(0, total - totalWithNewPayment);

    const handleSubmit = async (e: React.FormEvent, intent: 'SALE' | 'RESERVATION') => {
        e.preventDefault();
        setClickedIntent(intent);
        const numericAmountValue = parseFloat(amountPaid) || 0;

        await onProcessSale({
            amountPaid: numericAmountValue,
            method,
            notes,
            isDeclared: defaultDeclared
        }, intent);
        setClickedIntent(null);
    };

    return (
        <form className="space-y-6 bg-slate-50/50 p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
                <div className="space-y-2">
                    <Label htmlFor="amountPaid" className="min-h-[2.5rem] flex items-end pb-1 font-medium text-slate-700">
                        Montant encaissé / Avance (MAD)
                    </Label>
                    <Input
                        id="amountPaid"
                        className="h-12 bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl transition-all font-semibold"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        placeholder="0.00"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="method" className="min-h-[2.5rem] flex items-end pb-1 font-medium text-slate-700">
                        Mode de paiement
                    </Label>
                    <SearchableSelect
                        className="h-12 rounded-xl border-slate-200"
                        options={[
                            { label: 'Espèces', value: 'Especes' },
                            { label: 'Carte Bancaire', value: 'Carte' },
                            { label: 'Chèque', value: 'Cheque' },
                            { label: 'Virement', value: 'Virement' },
                        ]}
                        value={method}
                        onChange={setMethod}
                        placeholder="Choisir un mode"
                        searchPlaceholder="Rechercher..."
                    />
                </div>
            </div>

            {/* ✅ Bloc Smart Advance Detection */}
            {totalAlreadyPaid > 0 && (
                <div className="rounded-xl border-2 border-indigo-100 bg-indigo-50/50 p-4 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between group">
                        <div className="flex items-center gap-2">
                            <div className="p-1.5 rounded-full bg-indigo-100 text-indigo-600">
                                <Clock size={14} className="animate-pulse" />
                            </div>
                            <span className="text-sm font-bold text-indigo-700">Avances détectées</span>
                        </div>
                        <span className="text-sm font-black text-indigo-800">
                            -{totalAlreadyPaid.toFixed(2)} MAD
                        </span>
                    </div>
                    
                    <div className="h-px bg-indigo-100" />
                    
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-indigo-600 uppercase tracking-wider">Reste à encaisser</span>
                        <div className="flex flex-col items-end">
                            <span className="text-lg font-black text-indigo-900 leading-none">
                                {Math.max(0, total - totalAlreadyPaid).toFixed(2)} MAD
                            </span>
                            <span className="text-[10px] text-indigo-400 italic">Pre-rempli automatiquement ✅</span>
                        </div>
                    </div>
                </div>
            )}


            <div className="flex justify-between items-center bg-background p-3 rounded border">
                <span className="text-sm font-medium text-muted-foreground">Reste à payer (Crédit)</span>
                <span className="font-bold text-destructive">{reste.toFixed(2)} MAD</span>
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optionnel)</Label>
                <Textarea
                    id="notes"
                    placeholder="Commentaires sur la vente..."
                    className="h-24 resize-none bg-white border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl transition-all"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            <div className="flex gap-3 pt-2">
                <Button
                    type="button"
                    onClick={(e) => handleSubmit(e, 'RESERVATION')}
                    disabled={isProcessing || total === 0 || disableReservation}
                    variant="outline"
                    className="flex-1 h-14 text-sm font-semibold border-dashed border-slate-300 text-slate-600 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50"
                >
                    {isProcessing && clickedIntent === 'RESERVATION' ? (
                        <BrandLoader size="sm" className="mr-2" />
                    ) : (
                        <Clock className="h-4 w-4 mr-2" />
                    )}
                    Réserver
                </Button>

                <Button 
                    type="button"
                    onClick={(e) => handleSubmit(e, 'SALE')}
                    className="flex-[2] h-14 text-base font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-md transition-all gap-2" 
                    disabled={isProcessing || total === 0}
                >
                    {isProcessing && clickedIntent === 'SALE' && (
                        <BrandLoader size="sm" className="mr-2 opacity-80" />
                    )}
                    Valider la Vente
                </Button>
            </div>
        </form>
    );
}
