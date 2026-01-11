"use client";

import * as React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

type ItemType = 'monture' | 'verre' | 'lentille' | 'divers';

interface OrderItemRowProps {
    index: number;
    form: UseFormReturn<any>;
    onRemove: () => void;
    canRemove: boolean;
}

export function OrderItemRow({ index, form, onRemove, canRemove }: OrderItemRowProps) {
    const itemType = form.watch(`items.${index}.type`) as ItemType;
    const quantity = form.watch(`items.${index}.quantity`) || 0;
    const unitPrice = form.watch(`items.${index}.unitPrice`) || 0;
    const lineTotal = quantity * unitPrice;

    return (
        <div className="p-4 border rounded-lg bg-slate-50/50 space-y-3">
            <div className="flex items-start gap-3">
                {/* Type Selector */}
                <div className="flex-1">
                    <FormField
                        control={form.control}
                        name={`items.${index}.type`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Type</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className="h-9">
                                            <SelectValue placeholder="Type" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="monture">👓 Monture</SelectItem>
                                        <SelectItem value="verre">🔍 Verre</SelectItem>
                                        <SelectItem value="lentille">👁️ Lentille</SelectItem>
                                        <SelectItem value="divers">🛠️ Divers</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                {/* Delete Button */}
                {canRemove && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={onRemove}
                        className="h-9 w-9 text-red-600 hover:text-red-700 hover:bg-red-50 mt-6"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>

            {/* Type-Specific Fields */}
            {itemType === 'monture' && (
                <div className="grid grid-cols-3 gap-2">
                    <FormField
                        control={form.control}
                        name={`items.${index}.marque`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Marque</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: RayBan" className="h-9" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`items.${index}.reference`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Référence</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: RB3447" className="h-9" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`items.${index}.couleur`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Couleur</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Gold" className="h-9" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}

            {itemType === 'verre' && (
                <div className="grid grid-cols-2 gap-2">
                    <FormField
                        control={form.control}
                        name={`items.${index}.description`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Description</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Org 1.5 ARC" className="h-9" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`items.${index}.sphCyl`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Sph/Cyl (Optionnel)</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: -2.00/-1.00" className="h-9" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}

            {itemType === 'lentille' && (
                <div className="grid grid-cols-2 gap-2">
                    <FormField
                        control={form.control}
                        name={`items.${index}.typeLentille`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Type</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: Journalières" className="h-9" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name={`items.${index}.rayon`}
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs">Rayon</FormLabel>
                                <FormControl>
                                    <Input placeholder="Ex: 8.6" className="h-9" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
            )}

            {itemType === 'divers' && (
                <FormField
                    control={form.control}
                    name={`items.${index}.nomProduit`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Nom du produit</FormLabel>
                            <FormControl>
                                <Input placeholder="Ex: Spray nettoyant" className="h-9" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
            )}

            {/* Quantity, Unit Price, Line Total */}
            <div className="grid grid-cols-4 gap-2">
                <FormField
                    control={form.control}
                    name={`items.${index}.quantity`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Qté</FormLabel>
                            <FormControl>
                                <Input type="number" min="1" className="h-9" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name={`items.${index}.unitPrice`}
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-xs">Prix U. (MAD)</FormLabel>
                            <FormControl>
                                <Input type="number" step="0.01" min="0" className="h-9" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <div className="col-span-2">
                    <FormLabel className="text-xs">Total Ligne</FormLabel>
                    <div className="h-9 px-3 py-2 border rounded-md bg-slate-100 text-sm font-medium flex items-center">
                        {lineTotal.toFixed(2)} MAD
                    </div>
                </div>
            </div>
        </div>
    );
}
