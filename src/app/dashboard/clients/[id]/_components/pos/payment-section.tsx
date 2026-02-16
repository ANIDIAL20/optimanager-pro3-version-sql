'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Textarea } from '@/components/ui/textarea';
import { BrandLoader } from '@/components/ui/loader-brand';
import { Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Switch } from '@/components/ui/switch';


interface PaymentData {
    amountPaid: number;
    method: string;
    notes: string;
    isDeclared: boolean;
}

interface PaymentSectionProps {
    total: number;
    onProcessSale: (paymentData: PaymentData) => Promise<void>;
    isProcessing: boolean;
    defaultDeclared?: boolean;
}

export function PaymentSection({ total, onProcessSale, isProcessing, defaultDeclared = false }: PaymentSectionProps) {
    const [amountPaid, setAmountPaid] = React.useState<string>(''); 
    const [method, setMethod] = React.useState('Especes');
    const [notes, setNotes] = React.useState('');
    const [isDeclared, setIsDeclared] = React.useState(defaultDeclared);

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
            notes,
            isDeclared
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

            <div className={cn(
                "p-3 rounded-lg border-2 transition-all flex items-center justify-between",
                isDeclared ? "border-indigo-500 bg-indigo-50" : "border-slate-200 bg-slate-50 opacity-80"
            )}>
                <div className="flex flex-col">
                    <Label className="font-bold flex items-center gap-2">
                        <Receipt className="h-4 w-4" />
                        Facture Officielle
                    </Label>
                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">TVA 20% Incluse • Déclaration Fiscale</span>
                </div>
                <Switch 
                    checked={isDeclared} 
                    onCheckedChange={setIsDeclared}
                    className="data-[state=checked]:bg-indigo-600"
                />
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
