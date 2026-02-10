'use client';

import { useState } from 'react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Eye, Pencil, Trash2, AlertTriangle, Loader2 } from 'lucide-react';
import { Expense } from '@/types/expense';
import { deleteExpense } from '@/lib/expenses/api';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ExpenseDialog } from './expense-dialog';

interface ExpenseActionsProps {
    expense: Expense;
}

export function ExpenseActions({ expense }: ExpenseActionsProps) {
    const [open, setOpen] = useState(false);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showEditDialog, setShowEditDialog] = useState(false);
    const [showViewDialog, setShowViewDialog] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            const result = await deleteExpense(expense.id.toString());
            if (result.success) {
                toast.success('Charge supprimée avec succès');
                setShowDeleteDialog(false);
            } else {
                toast.error(result.error || 'Erreur lors de la suppression');
            }
        } catch (error) {
            toast.error('Une erreur inattendue est survenue');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <>
            <DropdownMenu open={open} onOpenChange={setOpen}>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Ouvrir menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem onClick={() => setShowViewDialog(true)}>
                        <Eye className="mr-2 h-4 w-4 text-slate-500" /> Voir détails
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                        <Pencil className="mr-2 h-4 w-4 text-blue-600" /> Modifier
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onClick={() => setShowDeleteDialog(true)}
                        className="text-red-600 focus:text-red-700 focus:bg-red-50"
                    >
                        <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            {/* Dialogs */}

            {/* Edit Dialog */}
            {showEditDialog && (
                <ExpenseDialog
                    open={showEditDialog}
                    onOpenChange={setShowEditDialog}
                    expense={expense}
                    mode="edit"
                />
            )}

            {/* View Dialog (Reusing ExpenseDialog in view mode - implementation pending update) */}
            {showViewDialog && (
                <ExpenseDialog
                    open={showViewDialog}
                    onOpenChange={setShowViewDialog}
                    expense={expense}
                    mode="view"
                />
            )}

            {/* Delete Confirmation */}
            <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center text-red-600">
                            <AlertTriangle className="mr-2 h-5 w-5" />
                            Confirmer la suppression
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                            Êtes-vous sûr de vouloir supprimer la charge "<strong>{expense.title}</strong>" ?
                            <br />
                            Cette action est irréversible et supprimera également les fichiers associés.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDelete();
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={isDeleting}
                        >
                            {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Supprimer
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
