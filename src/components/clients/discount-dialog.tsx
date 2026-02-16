'use client';

import * as React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tag, Trash2, Percent, Edit3, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePosCartStore } from '@/features/pos/store/use-pos-cart-store';

interface DiscountDialogProps {
    lineId: string;
    productName: string;
    originalPrice: number;
    currentPrice: number;
    priceMode: 'STANDARD' | 'OVERRIDE' | 'DISCOUNT';
    discountPercent?: number;
    quantity: number;
}

export function DiscountDialog({ 
    lineId, 
    productName, 
    originalPrice, 
    currentPrice, 
    priceMode, 
    discountPercent,
    quantity
}: DiscountDialogProps) {
    const [open, setOpen] = React.useState(false);
    
    // Local state for the form
    const [mode, setMode] = React.useState<'PERCENT' | 'OVERRIDE' | 'STANDARD'>('PERCENT');
    const [value, setValue] = React.useState<string>('');
    const [reason, setReason] = React.useState('');

    const updateLinePricing = usePosCartStore((s) => s.updateLinePricing);

    // Reset form when dialog opens
    React.useEffect(() => {
        if (open) {
            if (priceMode === 'DISCOUNT') {
                setMode('PERCENT');
                setValue(discountPercent?.toString() || '');
            } else if (priceMode === 'OVERRIDE') {
                setMode('OVERRIDE');
                setValue(currentPrice.toString());
            } else {
                setMode('PERCENT');
                setValue('');
            }
        }
    }, [open, priceMode, discountPercent, currentPrice]);

    const handleApply = () => {
        if (mode === 'STANDARD') {
            updateLinePricing(lineId, 'STANDARD');
            setOpen(false);
            return;
        }

        const numValue = parseFloat(value);
        if (isNaN(numValue)) return;

        if (mode === 'PERCENT') {
            updateLinePricing(lineId, 'DISCOUNT', { percent: numValue });
        } else if (mode === 'OVERRIDE') {
            updateLinePricing(lineId, 'OVERRIDE', { newPrice: numValue, reason });
        }

        setOpen(false);
    };

    const handleReset = () => {
        updateLinePricing(lineId, 'STANDARD');
        setOpen(false);
    };

    // Calculate preview
    const previewPrice = React.useMemo(() => {
        const val = parseFloat(value);
        if (isNaN(val)) return currentPrice;
        if (mode === 'PERCENT') return originalPrice * (1 - val / 100);
        if (mode === 'OVERRIDE') return val;
        return originalPrice;
    }, [mode, value, currentPrice, originalPrice]);

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                        "h-6 w-6 rounded-full transition-all duration-300",
                        priceMode !== 'STANDARD' 
                            ? "bg-emerald-100 text-emerald-600 hover:bg-emerald-200" 
                            : "text-muted-foreground hover:text-primary hover:bg-primary/10"
                    )}
                >
                    <Tag className="h-3 w-3" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[400px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Tag className="h-5 w-5 text-indigo-600" />
                        Remise sur l'article
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        {productName}
                    </p>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {/* Mode Selector */}
                    <div className="flex p-1 bg-muted rounded-xl gap-1">
                        <button
                            onClick={() => { setMode('PERCENT'); setValue(''); }}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                                mode === 'PERCENT' ? "bg-white shadow-sm text-indigo-600" : "text-muted-foreground hover:bg-white/50"
                            )}
                        >
                            <Percent className="h-4 w-4" />
                            Pourcentage
                        </button>
                        <button
                            onClick={() => { setMode('OVERRIDE'); setValue(''); }}
                            className={cn(
                                "flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all",
                                mode === 'OVERRIDE' ? "bg-white shadow-sm text-indigo-600" : "text-muted-foreground hover:bg-white/50"
                            )}
                        >
                            <Edit3 className="h-4 w-4" />
                            Prix Manuel
                        </button>
                    </div>

                    {mode === 'PERCENT' ? (
                        <div className="space-y-4">
                            <div className="grid grid-cols-4 gap-2">
                                {[5, 10, 20, 50].map(d => (
                                    <Button
                                        key={d}
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setValue(d.toString())}
                                        className={cn(parseFloat(value) === d && "bg-indigo-50 border-indigo-200 text-indigo-700")}
                                    >
                                        -{d}%
                                    </Button>
                                ))}
                            </div>
                            <div className="space-y-2">
                                <Label>Pourcentage personnalisé (%)</Label>
                                <Input
                                    type="number"
                                    placeholder="Ex: 15"
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    autoFocus
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nouveau prix unitaire (DH)</Label>
                                <Input
                                    type="number"
                                    placeholder={originalPrice.toString()}
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    autoFocus
                                />
                                <p className="text-xs text-muted-foreground">Prix initial: {originalPrice} DH</p>
                            </div>
                            <div className="space-y-2">
                                <Label>Motif (Optionnel)</Label>
                                <Input
                                    placeholder="Ex: Client fidèle"
                                    value={reason}
                                    onChange={(e) => setReason(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* Preview */}
                    <div className="p-3 bg-slate-50 rounded-lg border flex justify-between items-center">
                        <span className="text-sm font-medium">Nouveau Total</span>
                        <div className="text-right">
                            <div className="font-bold text-indigo-600">
                                {(previewPrice * quantity).toFixed(2)} DH
                            </div>
                            {previewPrice < originalPrice && (
                                <div className="text-xs text-green-600">
                                    Économie: {((originalPrice - previewPrice) * quantity).toFixed(2)} DH
                                </div>
                            )}
                            {previewPrice > originalPrice && (
                                <div className="text-xs text-orange-600">
                                    Majoration: {((previewPrice - originalPrice) * quantity).toFixed(2)} DH
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                    {priceMode !== 'STANDARD' && (
                        <Button 
                            variant="ghost" 
                            onClick={handleReset}
                            className="mr-auto text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Annuler remise
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => setOpen(false)}>Fermer</Button>
                    <Button onClick={handleApply} disabled={!value}>Appliquer</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
