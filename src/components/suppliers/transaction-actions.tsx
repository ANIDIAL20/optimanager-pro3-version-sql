'use client';

import React from 'react';
import {
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Printer,
  Copy,
  Info,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { deleteSupplierOrder } from '@/app/actions/supplier-orders-actions';
import { deleteSupplierPayment } from '@/app/actions/supplier-payments-actions';
import { deleteSupplierCredit } from '@/app/actions/supplier-credits-actions';
import { useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { printInPlace } from '@/lib/print-in-place';

interface TransactionActionsProps {
  transaction: {
    id: string;
    type: 'ACHAT' | 'PAIEMENT' | 'AVOIR';
    reference: string;
    amount: number;
    date: Date;
    supplierId: string;
  };
}

export function TransactionActions({ transaction }: TransactionActionsProps) {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [showDeleteAlert, setShowDeleteAlert] = React.useState(false);
  const [showDetails, setShowDetails] = React.useState(false);

  const id = transaction.id.split('-').slice(1).join('-');
  const isAdmin = session?.user?.role === 'ADMIN';

  const handleDelete = async () => {
    try {
      if (transaction.type === 'ACHAT') {
        await deleteSupplierOrder(id);
      } else if (transaction.type === 'PAIEMENT') {
        await deleteSupplierPayment(id);
      } else if (transaction.type === 'AVOIR') {
        await deleteSupplierCredit(id);
      }
      toast.success('Suppression reussie');
      queryClient.invalidateQueries({ queryKey: ['supplier-statement', transaction.supplierId] });
      queryClient.invalidateQueries({ queryKey: ['supplier-balance', transaction.supplierId] });
    } catch (error: any) {
      toast.error('Erreur lors de la suppression: ' + error.message);
    }
  };

  const copyReference = () => {
    navigator.clipboard.writeText(transaction.reference);
    toast.info('Reference copiee');
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 p-0">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuItem onClick={() => setShowDetails(true)}>
            <Eye className="mr-2 h-4 w-4" /> Voir details
          </DropdownMenuItem>
          <DropdownMenuItem onClick={copyReference}>
            <Copy className="mr-2 h-4 w-4" /> Copier reference
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            className="text-blue-600"
            onClick={() => {
              if (transaction.type === 'ACHAT') {
                printInPlace(`/print/bon-commande/${id}`);
              } else if (transaction.type === 'PAIEMENT') {
                printInPlace(`/print/recu-paiement/${id}`);
              } else {
                toast.info('Impression d\'avoir bientôt disponible');
              }
            }}
          >
            <Printer className="mr-2 h-4 w-4" /> Imprimer PDF
          </DropdownMenuItem>

          {isAdmin && (
            <>
              <DropdownMenuItem onClick={() => toast.info('Modification bientot disponible')}>
                <Pencil className="mr-2 h-4 w-4" /> Modifier
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onClick={() => setShowDeleteAlert(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Supprimer definitivement
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showDeleteAlert} onOpenChange={setShowDeleteAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Etes-vous sur de vouloir supprimer ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette suppression est definitive et irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 font-bold">
              Confirmer la suppression
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5 text-blue-500" />
              Details de la {transaction.type === 'ACHAT' ? 'Commande' : transaction.type === 'PAIEMENT' ? 'Transaction' : 'Avoir'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-4">
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Reference:</span>
              <span className="font-mono font-bold">{transaction.reference}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Date:</span>
              <span>{format(transaction.date, 'PPPP', { locale: fr })}</span>
            </div>
            <div className="flex justify-between border-b pb-2">
              <span className="text-muted-foreground">Montant:</span>
              <span className="text-lg font-bold">{transaction.amount.toLocaleString()} MAD</span>
            </div>

            <div className="mt-6 p-3 bg-muted rounded-md text-xs text-muted-foreground">
              <p>Les donnees d'audit sont disponibles dans les registres systeme pour l'Admin.</p>
              <p className="mt-1 italic">ID de l'enregistrement: {transaction.id}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}