'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Minus, Package, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { updateStock } from '@/app/actions/products-actions';
import type { Product } from '@/lib/types';
import { BrandLoader } from '@/components/ui/loader-brand';

interface StockUpdateDialogProps {
    product: Product;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onStockUpdated?: () => void;
}

type StockMovementType = 'in' | 'out';

export function StockUpdateDialog({
    product,
    open,
    onOpenChange,
    onStockUpdated,
}: StockUpdateDialogProps) {
    const [movementType, setMovementType] = React.useState<StockMovementType>('in');
    const [quantity, setQuantity] = React.useState<string>('');
    const [reason, setReason] = React.useState<string>('');
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const { toast } = useToast();

    // Reset form when dialog opens/closes
    React.useEffect(() => {
        if (!open) {
            setQuantity('');
            setReason('');
            setMovementType('in');
        }
    }, [open]);

    // Normalize product stock field (handle both old and new formats)
    const currentStock = React.useMemo(() => {
        return Number((product as any).quantiteStock ?? (product as any).stock ?? 0);
    }, [product]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        const qty = parseInt(quantity);
        if (isNaN(qty) || qty <= 0) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Veuillez entrer une quantité valide.',
            });
            return;
        }

        if (!reason.trim()) {
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: 'Veuillez entrer un motif.',
            });
            return;
        }

        // Check if removing stock would result in negative quantity
        if (movementType === 'out' && currentStock < qty) {
            toast({
                variant: 'destructive',
                title: 'Stock insuffisant',
                description: `Vous ne pouvez pas retirer ${qty} unités. Stock actuel: ${currentStock}`,
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await updateStock(
                product.id, 
                qty, 
                movementType === 'in' ? 'add' : 'remove'
            );

            if (result.success) {
                const newStock = result.newStock ?? (movementType === 'in' ? currentStock + qty : currentStock - qty);

                toast({
                    title: '✅ Stock mis à jour',
                    description: (
                        <div className="space-y-1">
                            <p className="font-semibold">{product.nomProduit}</p>
                            <p className="text-sm">
                                {movementType === 'in' ? 'Entrée' : 'Sortie'}: {qty} unités
                            </p>
                            <p className="text-sm">
                                Nouveau stock: <span className="font-bold">{newStock}</span>
                            </p>
                        </div>
                    ),
                });

                // Call the callback to refresh product data
                onStockUpdated?.();

                // Close dialog
                onOpenChange(false);
            } else {
                throw new Error(result.error);
            }

        } catch (error: any) {
            console.error('Error updating stock:', error);
            toast({
                variant: 'destructive',
                title: 'Erreur',
                description: error.message || "Une erreur s'est produite lors de la mise à jour du stock.",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const newStock = React.useMemo(() => {
        const qty = parseInt(quantity) || 0;
        if (movementType === 'in') {
            return currentStock + qty;
        } else {
            return currentStock - qty;
        }
    }, [quantity, movementType, currentStock]);

    const stockStatus = newStock < 3 ? 'critical' : newStock < 10 ? 'low' : 'good';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Package className="h-5 w-5" />
                        Ajustement de Stock
                    </DialogTitle>
                    <DialogDescription>
                        Gérez les entrées et sorties de stock pour {product.nomProduit}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Current Stock Display */}
                    <div className="bg-slate-50 p-4 rounded-lg border">
                        <p className="text-sm text-slate-600 mb-1">Stock Actuel</p>
                        <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-bold text-slate-900">
                                {currentStock}
                            </span>
                            <span className="text-slate-500">unités</span>
                        </div>
                        {product.stockMin && (
                            <p className="text-xs text-slate-500 mt-1">
                                Minimum: {product.stockMin} unités
                            </p>
                        )}
                    </div>

                    {/* Movement Type Tabs */}
                    <Tabs value={movementType} onValueChange={(v) => setMovementType(v as StockMovementType)}>
                        <TabsList className="grid w-full grid-cols-2">
                            <TabsTrigger value="in" className="gap-2">
                                <TrendingUp className="h-4 w-4" />
                                Entrée (+)
                            </TabsTrigger>
                            <TabsTrigger value="out" className="gap-2">
                                <TrendingDown className="h-4 w-4" />
                                Sortie (-)
                            </TabsTrigger>
                        </TabsList>

                        <TabsContent value="in" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="quantity-in">Quantité à ajouter</Label>
                                <Input
                                    id="quantity-in"
                                    type="number"
                                    min="1"
                                    placeholder="Ex: 50"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reason-in">Motif de l'entrée</Label>
                                <Textarea
                                    id="reason-in"
                                    placeholder="Ex: Nouvel arrivage, Retour fournisseur, Correction inventaire..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="out" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label htmlFor="quantity-out">Quantité à retirer</Label>
                                <Input
                                    id="quantity-out"
                                    type="number"
                                    min="1"
                                    max={currentStock}
                                    placeholder="Ex: 10"
                                    value={quantity}
                                    onChange={(e) => setQuantity(e.target.value)}
                                    className="text-lg"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="reason-out">Motif de la sortie</Label>
                                <Textarea
                                    id="reason-out"
                                    placeholder="Ex: Vente, Casse, Vol, Perte, Retour client..."
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </TabsContent>
                    </Tabs>

                    {/* Preview of New Stock */}
                    {quantity && parseInt(quantity) > 0 && (
                        <div className={cn(
                            "p-4 rounded-lg border-2 transition-colors",
                            movementType === 'in'
                                ? "bg-green-50 border-green-200"
                                : "bg-orange-50 border-orange-200"
                        )}>
                            <p className="text-sm font-medium mb-2">
                                {movementType === 'in' ? '📈 Aperçu après entrée' : '📉 Aperçu après sortie'}
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className={cn(
                                    "text-3xl font-bold",
                                    stockStatus === 'critical' ? 'text-red-600' :
                                        stockStatus === 'low' ? 'text-orange-600' :
                                            'text-green-600'
                                )}>
                                    {newStock}
                                </span>
                                <span className="text-slate-500">unités</span>
                                {stockStatus === 'critical' && (
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 ml-2">
                                        Stock Critique
                                    </Badge>
                                )}
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Annuler
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting || !quantity || !reason}
                            className={cn(
                                movementType === 'in'
                                    ? "bg-green-600 hover:bg-green-700"
                                    : "bg-orange-600 hover:bg-orange-700"
                            )}
                        >
                            {isSubmitting && <BrandLoader size="sm" className="mr-2" />}
                            {movementType === 'in' ? (
                                <>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Ajouter au Stock
                                </>
                            ) : (
                                <>
                                    <Minus className="mr-2 h-4 w-4" />
                                    Retirer du Stock
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
