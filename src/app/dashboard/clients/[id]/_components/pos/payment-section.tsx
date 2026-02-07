'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { BrandLoader } from '@/components/ui/loader-brand';


interface PaymentSectionProps {
    total: number;
    onProcessSale: (paymentData: { amountPaid: number; method: string; notes: string }) => Promise<void>;
    isProcessing: boolean;
}

export function PaymentSection({ total, onProcessSale, isProcessing }: PaymentSectionProps) {
    const [amountPaid, setAmountPaid] = React.useState<string>(''); // String to handle inputs better
    const [method, setMethod] = React.useState('Especes');
    const [notes, setNotes] = React.useState('');

    // Auto-fill amount paid with total when total changes (optional convenience)
    // Auto-fill amount paid with total whenever total changes
    React.useEffect(() => {
        setAmountPaid(total.toString());
    }, [total]);

    const numericAmount = parseFloat(amountPaid) || 0;
    const reste = Math.max(0, total - numericAmount);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onProcessSale({
            amountPaid: numericAmount,
            method,
            notes
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 bg-muted/30 p-4 rounded-lg border">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="amountPaid">Montant encaissé (MAD)</Label>
                    <Input
                        id="amountPaid"
                        type="number"
                        step="0.01"
                        min="0"
                        value={amountPaid}
                        onChange={(e) => setAmountPaid(e.target.value)}
                        placeholder="0.00"
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="method">Mode de paiement</Label>
                    <SearchableSelect
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

            <div className="flex justify-between items-center bg-background p-3 rounded border">
                <span className="text-sm font-medium text-muted-foreground">Reste à payer (Crédit)</span>
                <span className="font-bold text-destructive">{reste.toFixed(2)} MAD</span>
            </div>

            <div className="space-y-2">
                <Label htmlFor="notes">Notes (Optionnel)</Label>
                <Textarea
                    id="notes"
                    placeholder="Commentaires sur la vente..."
                    className="h-20 resize-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                />
            </div>

            <Button type="submit" className="w-full" size="lg" disabled={isProcessing || total === 0}>
                {isProcessing && <BrandLoader size="sm" className="mr-2" />}
                Valider la Vente ({total.toFixed(2)} MAD)
            </Button>
        </form>
    );
}
