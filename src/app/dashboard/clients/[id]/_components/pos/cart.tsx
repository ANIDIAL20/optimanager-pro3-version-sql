'use client';

import * as React from 'react';
import { Trash2, Plus, Minus, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { PosLineItem } from '@/features/pos/utils/pricing';
import { DiscountDialog } from '@/components/clients/discount-dialog';
import { cn } from '@/lib/utils';
import { SensitiveData } from '@/components/ui/sensitive-data';

interface CartProps {
    items: PosLineItem[];
    onUpdateQuantity: (productId: string, delta: number) => void;
    onRemoveItem: (productId: string) => void;
    onClearCart: () => void;
}

export function Cart({ items, onUpdateQuantity, onRemoveItem, onClearCart }: CartProps) {
    const total = items.reduce((sum, item) => sum + item.lineTotal, 0);

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-[300px] border border-dashed rounded-md text-muted-foreground bg-muted/20">
                <p>Le panier est vide</p>
                <p className="text-sm">Ajoutez des produits pour commencer</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-lg">Panier ({items.length})</h3>
                <Button variant="ghost" size="sm" onClick={onClearCart} className="text-destructive hover:text-destructive hover:bg-destructive/10">
                    Vider
                </Button>
            </div>

            <ScrollArea className="flex-1 -mr-4 pr-4">
                <div className="space-y-3">
                    {items.map((item) => (
                        <div key={item.lineId} className="flex gap-2 items-start bg-card p-3 rounded-lg border group hover:border-indigo-200 transition-colors">
                            <div className="flex-1 min-w-0">
                                <h4 className="font-medium truncate text-sm flex items-center gap-2" title={item.productName}>
                                    {item.productName}
                                    {item.fromReservation && (
                                        <Badge variant="secondary" className="h-4 px-1 text-[9px] bg-orange-100 text-orange-700 border-orange-200 gap-1">
                                            <Tag className="h-2 w-2" />
                                            Réservé
                                        </Badge>
                                    )}
                                </h4>
                                <div className="flex flex-col mt-1 gap-1">
                                    <div className="flex items-center gap-2">
                                        <p className={cn("text-xs", item.priceMode !== 'STANDARD' ? "text-slate-400 line-through decoration-destructive/30" : "text-muted-foreground")}>
                                            {item.originalUnitPrice.toFixed(2)} DH × {item.quantity}
                                        </p>
                                        {item.priceMode !== 'STANDARD' && (
                                            <p className="text-xs font-bold text-emerald-600">
                                                {item.unitPrice.toFixed(2)} DH
                                            </p>
                                        )}
                                    </div>
                                    {item.productReference && (
                                        <p className="text-[10px] text-slate-400 font-mono">
                                            Réf: {item.productReference}
                                        </p>
                                    )}
                                    
                                    {/* Badges/Tags for discounts */}
                                    {item.priceMode !== 'STANDARD' && (
                                        <div className="flex flex-wrap gap-1">
                                            {item.discountPercent && item.discountPercent > 0 && (
                                                <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                                                    -{item.discountPercent.toFixed(0)}%
                                                </span>
                                            )}
                                            {item.overrideReason && (
                                                 <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 max-w-[120px] truncate" title={item.overrideReason}>
                                                    {item.overrideReason}
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                                <div className="font-bold text-sm">
                                    {item.lineTotal.toFixed(2)} DH
                                </div>

                                <div className="flex items-center gap-1">
                                    <DiscountDialog 
                                        lineId={item.lineId}
                                        productName={item.productName}
                                        originalPrice={item.originalUnitPrice}
                                        currentPrice={item.unitPrice}
                                        priceMode={item.priceMode}
                                        discountPercent={item.discountPercent}
                                        quantity={item.quantity}
                                    />
                                    
                                    <div className="flex items-center border rounded-md h-7 ml-1 bg-white">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-full w-6 rounded-none rounded-l-md hover:bg-slate-50"
                                            onClick={() => onUpdateQuantity(item.productId, -1)}
                                        >
                                            <Minus className="h-3 w-3" />
                                        </Button>
                                        <span className="w-6 text-center text-xs font-medium tabular-nums">{item.quantity}</span>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-full w-6 rounded-none rounded-r-md hover:bg-slate-50"
                                            onClick={() => onUpdateQuantity(item.productId, 1)}
                                        >
                                            <Plus className="h-3 w-3" />
                                        </Button>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full"
                                        onClick={() => onRemoveItem(item.productId)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <div className="mt-4 pt-4 border-t space-y-2 bg-slate-50/50 -mx-4 px-4 pb-0 mb-0 rounded-b-lg">
                <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary text-xl">
                        <SensitiveData value={total} type="currency" className="text-primary" />
                    </span>
                </div>
            </div>
        </div>
    );
}
