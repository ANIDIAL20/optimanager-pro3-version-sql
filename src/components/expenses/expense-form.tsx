'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
// import { UploadButton } from '@/lib/uploadthing'; // Removed
import { toast } from 'sonner';
import { ExpenseFormData, ExpenseType, ExpenseCategory } from '@/types/expense';

const formSchema = z.object({
    title: z.string().min(1, "Le titre est requis"),
    amount: z.coerce.number().positive("Le montant doit être positif"),
    type: z.enum(['water', 'electricity', 'rent', 'other'] as const),
    category: z.enum(['utilities', 'rent', 'maintenance', 'other'] as const),
    status: z.enum(['paid', 'pending', 'overdue'] as const),
    paymentDate: z.date().optional().nullable(),
    dueDate: z.date().optional().nullable(),
    provider: z.string().optional(),
    invoiceNumber: z.string().optional(),
    notes: z.string().optional(),
    attachments: z.array(z.string()).optional(),
});

interface ExpenseFormProps {
    defaultValues?: Partial<ExpenseFormData>;
    onSubmit: (data: ExpenseFormData) => Promise<void>;
    isSubmitting?: boolean;
}

export function ExpenseForm({ defaultValues, onSubmit, isSubmitting = false }: ExpenseFormProps) {
    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: defaultValues?.title ?? '',
            amount: defaultValues?.amount ?? 0,
            type: defaultValues?.type ?? 'other',
            category: defaultValues?.category ?? 'other',
            status: defaultValues?.status ?? 'pending',
            paymentDate: defaultValues?.paymentDate ?? undefined,
            dueDate: defaultValues?.dueDate ?? undefined,
            provider: defaultValues?.provider ?? '',
            invoiceNumber: defaultValues?.invoiceNumber ?? '',
            notes: defaultValues?.notes ?? '',
            attachments: (defaultValues?.attachments?.filter((a): a is string => a != null) ?? []) as string[],
        },
    });

    const handleSubmit = async (values: z.infer<typeof formSchema>) => {
        await onSubmit(values as ExpenseFormData);
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

                {/* Section 1: Informations Principales */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider border-b pb-1">Informations Principales</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem className="col-span-1 md:col-span-2">
                                    <FormLabel>Titre de la dépense <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ex: Facture d'électricité Janvier" {...field} className="focus-visible:ring-blue-500" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Montant (MAD) <span className="text-red-500">*</span></FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <span className="absolute left-3 top-2.5 text-slate-400 font-medium">MAD</span>
                                            <Input type="number" step="0.01" {...field} className="pl-12 focus-visible:ring-blue-500 font-semibold" />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Statut</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Choisir un statut" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="pending" className="text-amber-600 font-medium">En attente</SelectItem>
                                            <SelectItem value="paid" className="text-emerald-600 font-medium">Payé</SelectItem>
                                            <SelectItem value="overdue" className="text-red-600 font-medium">En retard</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Section 2: Catégorisation */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider border-b pb-1">Catégorisation</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="type"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Type</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Type" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="water">💧 Eau</SelectItem>
                                            <SelectItem value="electricity">⚡ Électricité</SelectItem>
                                            <SelectItem value="rent">🏠 Loyer</SelectItem>
                                            <SelectItem value="other">📦 Autre</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Catégorie</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Catégorie" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="utilities">Factures (Eau/Élec)</SelectItem>
                                            <SelectItem value="rent">Loyer & Charges</SelectItem>
                                            <SelectItem value="maintenance">Maintenance</SelectItem>
                                            <SelectItem value="other">Autre</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Section 3: Dates et Détails */}
                <div className="space-y-4">
                    <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider border-b pb-1">Dates & Détails</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="paymentDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Date de paiement</FormLabel>
                                    <Popover modal={true}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP", { locale: fr })
                                                    ) : (
                                                        <span>Choisir une date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 z-50 pointer-events-auto" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value || undefined}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date > new Date() || date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="dueDate"
                            render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Date d'échéance (Optionnel)</FormLabel>
                                    <Popover modal={true}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full pl-3 text-left font-normal",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? (
                                                        format(field.value, "PPP", { locale: fr })
                                                    ) : (
                                                        <span>Choisir une date</span>
                                                    )}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 z-50 pointer-events-auto" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value || undefined}
                                                onSelect={field.onChange}
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="notes"
                            render={({ field }) => (
                                <FormItem className="col-span-1 md:col-span-2">
                                    <FormLabel>Notes (Optionnel)</FormLabel>
                                    <FormControl>
                                        <Textarea placeholder="Détails supplémentaires..." {...field} className="min-h-[80px]" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                </div>

                {/* Section 4: Upload - Removed per user request */}

                <div className="pt-4 border-t flex justify-end gap-3 cancel-submit-container">
                    <Button type="submit" disabled={isSubmitting} className="min-w-[150px] bg-blue-600 hover:bg-blue-700">
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {defaultValues ? 'Mettre à jour' : 'Enregistrer la charge'}
                    </Button>
                </div>
            </form>
        </Form>
    );
}
