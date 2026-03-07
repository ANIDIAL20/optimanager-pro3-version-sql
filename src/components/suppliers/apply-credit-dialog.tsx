'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Coins } from 'lucide-react';
import { applyCreditToOrder } from '@/app/actions/supplier-credits-actions';
import { getOrdersForPaymentSelect } from '@/app/actions/supplier-orders-actions';

const formSchema = z.object({
    orderId: z.string().min(1, 'Veuillez choisir une commande'),
    amount: z.coerce.number().positive('Le montant doit être supérieur à 0'),
});

interface ApplyCreditDialogProps {
    credit: {
        id: string;
        supplierId: string;
        remainingAmount: string | number;
    };
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ApplyCreditDialog({ credit, open, onOpenChange }: ApplyCreditDialogProps) {
    const queryClient = useQueryClient();
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Fetch unpaid orders for this supplier
    const { data: orders = [], isLoading } = useQuery({
        queryKey: ['supplier-unpaid-orders', credit.supplierId],
        queryFn: async () => {
            const results = await getOrdersForPaymentSelect(credit.supplierId);
            // Filter only unpaid or partial orders
            return results.filter(o => o.remainingAmount > 0);
        },
        enabled: open,
    });

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            orderId: '',
            amount: Number(credit.remainingAmount),
        },
    });

    const selectedOrderId = form.watch('orderId');
    const selectedOrder = orders.find(o => o.id === selectedOrderId);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        if (!selectedOrder) return;

        // Validation logic
        if (values.amount > Number(credit.remainingAmount)) {
            toast({
                title: "Montant invalide",
                description: "Le montant dépasse le solde de l'avoir",
                variant: "destructive"
            });
            return;
        }

        if (values.amount > selectedOrder.remainingAmount) {
            toast({
                title: "Montant invalide",
                description: "Le montant dépasse le reste à payer de la commande",
                variant: "destructive"
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await applyCreditToOrder({
                creditId: credit.id,
                orderId: values.orderId,
                amount: values.amount,
            });

            if (res.success) {
                toast({
                    title: "Imputation réussie",
                    description: (res as any).message || "Avoir imputé avec succès"
                });
                onOpenChange(false);
                queryClient.invalidateQueries({ queryKey: ['supplier-credits'] });
                queryClient.invalidateQueries({ queryKey: ['supplier-statement'] });
            } else {
                toast({
                    title: "Erreur",
                    description: (res as any).error || "Erreur lors de l'imputation",
                    variant: "destructive"
                });
            }
        } catch (error) {
            toast({
                title: "Erreur système",
                description: "Une erreur est survenue",
                variant: "destructive"
            });
        } finally {
            setIsSubmitting(false);
        }
    }

    // Update amount if order changes (max possible)
    React.useEffect(() => {
        if (selectedOrder) {
            const maxAmount = Math.min(Number(credit.remainingAmount), selectedOrder.remainingAmount);
            form.setValue('amount', maxAmount);
        }
    }, [selectedOrderId, selectedOrder, credit.remainingAmount, form]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Coins className="h-5 w-5 text-indigo-500" />
                        Utiliser l'avoir
                    </DialogTitle>
                    <DialogDescription>
                        Imputer le montant de cet avoir sur une facture en attente.
                    </DialogDescription>
                </DialogHeader>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 mb-4 text-xs space-y-1">
                    <p className="flex justify-between">
                        <span className="text-slate-500">Solde avoir :</span>
                        <span className="font-bold text-slate-700">{Number(credit.remainingAmount).toFixed(2)} MAD</span>
                    </p>
                    {selectedOrder && (
                        <p className="flex justify-between border-t pt-1 mt-1">
                            <span className="text-slate-500">Reste à payer commande :</span>
                            <span className="font-bold text-slate-700">{selectedOrder.remainingAmount.toFixed(2)} MAD</span>
                        </p>
                    )}
                </div>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="orderId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Commande à régler</FormLabel>
                                    <Select 
                                        onValueChange={field.onChange} 
                                        defaultValue={field.value}
                                        disabled={isLoading || orders.length === 0}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder={isLoading ? "Chargement..." : (orders.length === 0 ? "Aucune commande impayée" : "Choisir une commande")} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {orders.map((order) => (
                                                <SelectItem key={order.id} value={order.id}>
                                                    {order.reference} ({order.remainingAmount.toFixed(2)} MAD)
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="amount"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Montant à imputer (MAD)</FormLabel>
                                    <FormControl>
                                        <Input {...field} type="number" step="0.01" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="pt-4">
                            <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
                                Annuler
                            </Button>
                            <Button type="submit" disabled={isSubmitting || orders.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirmer l'imputation
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
