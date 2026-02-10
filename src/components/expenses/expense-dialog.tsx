'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { ExpenseForm } from './expense-form';
import { createExpense, updateExpense } from '@/lib/expenses/api';
import { toast } from 'sonner';
import { ExpenseFormData, Expense } from '@/types/expense';

interface ExpenseDialogProps {
    expense?: Expense;
    trigger?: React.ReactNode;
    open?: boolean;
    onOpenChange?: (open: boolean) => void;
    mode?: 'add' | 'edit' | 'view';
}

export function ExpenseDialog({
    expense,
    trigger,
    open: controlledOpen,
    onOpenChange: setControlledOpen,
    mode = 'add'
}: ExpenseDialogProps) {
    const [internalOpen, setInternalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isControlled = controlledOpen !== undefined;
    const open = isControlled ? controlledOpen : internalOpen;
    const setOpen = isControlled ? setControlledOpen : setInternalOpen;

    const isEdit = mode === 'edit';
    const isView = mode === 'view';

    const defaultValues: Partial<ExpenseFormData> | undefined = expense ? {
        title: expense.title,
        amount: Number(expense.amount),
        type: expense.type,
        category: expense.category,
        status: expense.status,
        paymentDate: expense.paymentDate ? new Date(expense.paymentDate) : undefined,
        dueDate: expense.dueDate ? new Date(expense.dueDate) : undefined,
        notes: expense.notes || undefined,
        // attachments not handled yet in edit
    } : undefined;

    const handleSubmit = async (data: ExpenseFormData) => {
        setIsSubmitting(true);
        try {
            let result;
            if (isEdit && expense) {
                result = await updateExpense(expense.id.toString(), data);
            } else {
                result = await createExpense(data);
            }

            if (result.success) {
                toast.success(isEdit ? 'Dépense mise à jour' : 'Dépense créée avec succès');
                setOpen && setOpen(false);
            } else {
                toast.error(result.error || 'Une erreur est survenue');
            }
        } catch (error) {
            console.error("Error submitting expense:", error);
            toast.error('Une erreur inattendue est survenue');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {!isControlled && (
                <DialogTrigger asChild>
                    {trigger ? trigger : (
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="mr-2 h-4 w-4" /> Nouvelle Charge
                        </Button>
                    )}
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {isView ? 'Détails de la dépense' : isEdit ? 'Modifier la dépense' : 'Ajouter une dépense'}
                    </DialogTitle>
                    <DialogDescription>
                        {isView ? 'Consultez les détails ci-dessous.' : 'Remplissez les informations ci-dessous.'}
                    </DialogDescription>
                </DialogHeader>
                <div className={isView ? "pointer-events-none opacity-90" : ""}>
                    <ExpenseForm
                        defaultValues={defaultValues}
                        onSubmit={handleSubmit}
                        isSubmitting={isSubmitting}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
