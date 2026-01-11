'use client';

import * as React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, RotateCcw, AlertCircle } from 'lucide-react';
import { processReturn } from '@/app/actions/sales-actions';
import { Sale, SaleItem } from '@/lib/types';
import { useFirebase } from '@/firebase';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface ReturnItemsDialogProps {
    sale: Sale;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ReturnItemsDialog({ sale, open, onOpenChange }: ReturnItemsDialogProps) {
    const { user } = useFirebase();
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = React.useState(false);

    // Track selected items and their return quantities
    const [selectedItems, setSelectedItems] = React.useState<Record<string, number>>({});

    const handleToggleItem = (itemKey: string, checked: boolean, maxQty: number) => {
        if (checked) {
            setSelectedItems(prev => ({ ...prev, [itemKey]: maxQty })); // Default to full remaining qty
        } else {
            setSelectedItems(prev => {
                const next = { ...prev };
                delete next[itemKey];
                return next;
            });
        }
    };

    const handleQtyChange = (itemKey: string, qty: number, maxQty: number) => {
        if (qty < 1) qty = 1;
        if (qty > maxQty) qty = maxQty;
        setSelectedItems(prev => ({ ...prev, [itemKey]: qty }));
    };

    const handleSubmit = async () => {
        if (!user || !sale.id) return;

        setIsLoading(true);
        try {
            const itemsToReturn = Object.entries(selectedItems).map(([key, qty]) => {
                const idx = parseInt(key.split('-')[1]);
                const originalItem = sale.items[idx];
                return {
                    productRef: originalItem.productRef || originalItem.reference || '',
                    quantity: qty,
                    price: originalItem.unitPrice || originalItem.prixVente || 0,
                    name: originalItem.nomProduit || originalItem.productName || 'Article'
                };
            });

            if (itemsToReturn.length === 0) {
                toast({ title: "Aucun article sélectionné", variant: "destructive" });
                return;
            }

            const result = await processReturn(user.uid, sale.id, itemsToReturn);

            if (result.success) {
                toast({
                    title: "✅ Retours effectués",
                    description: "Stock mis jour et remboursement enregistré."
                });
                onOpenChange(false);
                router.refresh();
            } else {
                toast({
                    title: "Erreur",
                    description: result.error || "Échec du retour",
                    variant: "destructive"
                });
            }

        } catch (error) {
            console.error(error);
            toast({ title: "Erreur critique", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    };

    const totalRefund = React.useMemo(() => {
        return Object.entries(selectedItems).reduce((sum, [key, qty]) => {
            const idx = parseInt(key.split('-')[1]);
            const item = sale.items[idx];
            const price = item.unitPrice || item.prixVente || 0;
            return sum + (price * qty);
        }, 0);
    }, [selectedItems, sale.items]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-orange-600">
                        <RotateCcw className="h-5 w-5" />
                        Retourner des Articles
                    </DialogTitle>
                    <DialogDescription>
                        Sélectionnez les articles à retourner. Le stock sera ré-incrémenté et un remboursement généré.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="rounded-md border p-4 bg-slate-50">
                        {sale.items.map((item, idx) => {
                            const itemKey = `item-${idx}`;
                            const alreadyReturned = item.returnedQuantity || 0;
                            const maxQty = item.quantity - alreadyReturned;
                            const isSelected = !!selectedItems[itemKey];

                            if (maxQty <= 0) return null; // Don't show fully returned items

                            return (
                                <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                                    <div className="flex items-center gap-3">
                                        <Checkbox
                                            checked={isSelected}
                                            onCheckedChange={(c) => handleToggleItem(itemKey, c as boolean, maxQty)}
                                        />
                                        <div>
                                            <p className="font-medium text-sm">{item.nomProduit || item.productName}</p>
                                            <p className="text-xs text-muted-foreground">{item.reference || 'Sans Réf'}</p>
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div className="flex items-center gap-2">
                                            <Label className="text-xs">Qté:</Label>
                                            <Input
                                                type="number"
                                                className="h-8 w-16"
                                                value={selectedItems[itemKey]}
                                                onChange={(e) => handleQtyChange(itemKey, parseInt(e.target.value), maxQty)}
                                                min={1}
                                                max={maxQty}
                                            />
                                            <span className="text-xs text-muted-foreground">/ {maxQty}</span>
                                        </div>
                                    )}

                                    <div className="text-right w-20">
                                        <span className="font-semibold text-sm">
                                            {((item.unitPrice || item.prixVente || 0) * (selectedItems[itemKey] || 0)).toFixed(2)} DH
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                        {Object.keys(selectedItems).length === 0 && (
                            <div className="text-center py-4 text-muted-foreground italic flex flex-col items-center">
                                <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                                Tous les articles sont éligibles au retour
                            </div>
                        )}
                    </div>

                    {totalRefund > 0 && (
                        <div className="flex justify-between items-center bg-orange-50 p-3 rounded-lg border border-orange-100">
                            <span className="font-medium text-orange-800">Total Remboursement</span>
                            <span className="font-bold text-xl text-orange-600">{totalRefund.toFixed(2)} DH</span>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>Annuler</Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={isLoading || totalRefund <= 0}
                        className="bg-orange-600 hover:bg-orange-700 text-white"
                    >
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirmer le Retour
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
