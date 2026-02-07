'use client';

import * as React from 'react';
import { Trash2, Plus, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SensitiveData } from '@/components/ui/sensitive-data';
import type { Product } from '@/lib/types';

export interface CartItem {
    product: Product;
    quantity: number;
    lensOrderId?: number;
}

interface CartProps {
    items: CartItem[];
    onUpdateQuantity: (productId: string, delta: number) => void;
    onRemoveItem: (productId: string) => void;
    onClearCart: () => void;
}

export function Cart({ items, onUpdateQuantity, onRemoveItem, onClearCart }: CartProps) {
    const total = items.reduce((sum, item) => sum + (item.product.prixVente * item.quantity), 0);

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
                <div className="space-y-4">
                    {items.map((item) => (
                        <div key={item.product.id} className="flex gap-4 items-start bg-card p-3 rounded-lg border">
                            <div className="flex-1">
                                <h4 className="font-medium line-clamp-1">{item.product.nomProduit}</h4>
                                <p className="text-sm text-muted-foreground">
                                    <SensitiveData value={item.product.prixVente} type="currency" /> / unité
                                </p>
                            </div>

                            <div className="flex flex-col items-end gap-2">
                                <div className="font-bold">
                                    <SensitiveData value={item.product.prixVente * item.quantity} type="currency" />
                                </div>

                                <div className="flex items-center gap-2">
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7"
                                        disabled={item.quantity <= 1}
                                        onClick={() => onUpdateQuantity(item.product.id, -1)}
                                    >
                                        <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        className="h-7 w-7"
                                        disabled={item.quantity >= item.product.quantiteStock}
                                        onClick={() => onUpdateQuantity(item.product.id, 1)}
                                    >
                                        <Plus className="h-3 w-3" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-destructive ml-1"
                                        onClick={() => onRemoveItem(item.product.id)}
                                    >
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <div className="mt-4 pt-4 border-t space-y-2">
                <div className="flex justify-between items-center text-lg font-bold">
                    <span>Total</span>
                    <span className="text-primary">
                        <SensitiveData value={total} type="currency" className="text-primary" />
                    </span>
                </div>
            </div>
        </div>
    );
}
