'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Save, Receipt, CreditCard, Landmark, Coins, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { createSupplierPayment } from '@/app/actions/supplier-orders-actions';
import { useRouter } from 'next/navigation';

const paymentSchema = z.object({
    amount: z.number().min(1, "Le montant doit être supérieur à 0"),
    method: z.string().min(1, "Mode de paiement requis"),
    date: z.date(),
    reference: z.string().optional(),
    notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentSchema>;

interface SupplierPaymentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    supplierId: string;
    supplierName: string;
    orderId?: number; // Optional: Pay for a specific order
    maxAmount?: number; // Optional: Remaining debt on that order
}

export function SupplierPaymentDialog({
    open,
    onOpenChange,
    supplierId,
    supplierName,
    orderId,
    maxAmount
}: SupplierPaymentDialogProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    const form = useForm<PaymentFormValues>({
        resolver: zodResolver(paymentSchema),
        defaultValues: {
            amount: maxAmount || 0,
            method: 'Espèces',
            date: new Date(),
            reference: '',
            notes: '',
        },
    });

    // Reset form when opening/closing or when maxAmount changes
    React.useEffect(() => {
        if (open) {
            form.reset({
                amount: maxAmount || 0,
                method: 'Espèces',
                date: new Date(),
                reference: '',
                notes: '',
            });
        }
    }, [open, maxAmount, form]);

    const onSubmit = async (values: PaymentFormValues) => {
        setIsSubmitting(true);
        try {
            const res = await createSupplierPayment({
                supplierId,
                amount: values.amount,
                method: values.method,
                date: values.date.toISOString(),
                reference: values.reference,
                orderIds: orderId ? [orderId] : [], // If orderId provided, allocate to it
            });

            if (res.success) {
                toast({
                    title: "Succès",
                    description: "Paiement enregistré avec succès",
                    className: "bg-green-600 text-white border-none",
                });
                onOpenChange(false);
                router.refresh();
            } else {
                throw new Error(res.error || "Une erreur est survenue");
            }
        } catch (error: any) {
            toast({
                title: "Erreur",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Receipt className="h-5 w-5 text-primary" />
                        Paiement Fournisseur
                    </DialogTitle>
                    <DialogDescription>
                        Enregistrer un paiement pour <span className="font-semibold text-slate-900">{supplierName}</span>.
                        {orderId && <span className="block mt-1 text-xs text-amber-600 font-medium">Affecté à la commande #{orderId}</span>}
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Montant (DH)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input 
                                                type="number" 
                                                step="0.01"
                                                className="pl-10 h-11 bg-slate-50 border-slate-200 focus:bg-white transition-all font-bold text-lg" 
                                                {...field}
                                                onChange={e => field.onChange(parseFloat(e.target.value) || 0)}
                                            />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="method"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Mode</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className="bg-slate-50 border-slate-200 h-11">
                                                    <SelectValue />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="Espèces">Espèces</SelectItem>
                                                <SelectItem value="Chèque">Chèque</SelectItem>
                                                <SelectItem value="Virement">Virement</SelectItem>
                                                <SelectItem value="Carte">Carte</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Date</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={"outline"}
                                                        className={cn(
                                                            "h-11 pl-3 text-left font-normal bg-slate-50 border-slate-200",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, "dd/MM/yyyy")
                                                        ) : (
                                                            <span>Date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) => date > new Date()}
                                                    initialFocus
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="reference"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Référence (N° Chèque / Virement)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Landmark className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                                            <Input className="pl-10 h-11 bg-slate-50 border-slate-200" placeholder="ex: CHQ-88271" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
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
                                className="bg-primary hover:bg-primary/90 text-white min-w-[120px]"
                                disabled={isSubmitting}
                            >
                                {isSubmitting ? "Traitement..." : "Valider"}
                                {!isSubmitting && <Save className="ml-2 h-4 w-4" />}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
