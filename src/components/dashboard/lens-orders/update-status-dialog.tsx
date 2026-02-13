'use client';

import { useState, useTransition } from 'react';
import { updateLensOrder } from '@/app/actions/lens-orders-actions';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface UpdateStatusDialogProps {
  orderId: number;
  currentStatus: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated?: () => void;
  selectedOrder?: any;
}

export function UpdateStatusDialog({
  orderId,
  currentStatus,
  open,
  onOpenChange,
  onStatusUpdated,
  selectedOrder,
}: UpdateStatusDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(currentStatus);

  const handleSave = () => {
    if (status === currentStatus) {
      onOpenChange(false);
      return;
    }

    startTransition(async () => {
      const result = await updateLensOrder(orderId.toString(), { status }) as any;

      if (result.success) {
        toast({
          title: 'Succès',
          description: 'Statut mis à jour avec succès',
        });
        onOpenChange(false);
        onStatusUpdated?.();
      } else {
        toast({
          title: 'Erreur',
          description: result.error || 'Erreur lors de la mise à jour',
          variant: 'destructive',
        });
      }
    });
  };

  return (
    <>
      {/* @ts-ignore */}
      <Dialog modal={false} open={open} onOpenChange={onOpenChange}>
        <DialogContent
          onInteractOutside={(e) => e.preventDefault()}
          onOpenAutoFocus={(e) => e.preventDefault()}
          onCloseAutoFocus={(e) => {
            e.preventDefault();
            document.body.style.pointerEvents = 'auto';
            document.documentElement.style.pointerEvents = 'auto';
          }}
        >
          <DialogHeader>
            <DialogTitle>Modifier le statut de la commande</DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {/* @ts-ignore */}
            <Select modal={false} value={status} onValueChange={(val: any) => setStatus(val)} disabled={isPending}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="ordered">Commandée</SelectItem>
                <SelectItem value="received">Reçue</SelectItem>
                <SelectItem value="ready">Prête</SelectItem>
                <SelectItem value="delivered">Livrée</SelectItem>
                <SelectItem value="cancelled">Annulée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
              disabled={isPending || status === currentStatus}
            >
              {isPending ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
