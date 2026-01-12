'use client';

import { useState, useTransition } from 'react';
import { updateLensOrderStatus } from '@/app/actions/lens-orders-actions';
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

interface UpdateStatusDialogProps {
  orderId: number;
  currentStatus: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated?: () => void;
}

export function UpdateStatusDialog({
  orderId,
  currentStatus,
  open,
  onOpenChange,
  onStatusUpdated,
}: UpdateStatusDialogProps) {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState(currentStatus);

  const handleSave = () => {
    // No change, just close
    if (status === currentStatus) {
      onOpenChange(false);
      return;
    }

    startTransition(async () => {
      // ✅ FIX: secureAction injects userId automatically
      // Only pass orderId and status
      const result = await updateLensOrderStatus(orderId, status);

      if (result.success) {
        toast({
          title: 'Succès',
          description: 'Statut mis à jour avec succès',
        });
        onOpenChange(false);
        onStatusUpdated?.(); // Refresh parent list
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier le statut de la commande</DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <Select value={status} onValueChange={setStatus} disabled={isPending}>
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
  );
}
