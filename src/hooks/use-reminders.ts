import { useTransition } from 'react';
import { useToast } from '@/hooks/use-toast';
import { completeReminder, deleteReminder, snoozeReminder } from '@/app/actions/reminder-actions';

export interface Reminder {
  id: number;
  type: string;
  priority: string;
  title: string;
  message?: string | null;
  status: string;
  dueDate?: Date | null;
  createdAt: Date;
  metadata?: { details?: string; [key: string]: unknown } | string | null;
}

interface UseRemindersOptions {
  onSuccess?: () => void;
  onError?: (error: unknown) => void;
}

export function useReminders(options?: UseRemindersOptions) {
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const handleComplete = (id: number, optimisticAction?: () => void) => {
    startTransition(async () => {
      if (optimisticAction) optimisticAction();
      try {
        await completeReminder(id);
        toast({ title: 'Rappel terminé', description: 'Le rappel a été marqué comme traité.' });
        options?.onSuccess?.();
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de terminer le rappel.' });
        options?.onError?.(error);
      }
    });
  };

  const handleDelete = (id: number, optimisticAction?: () => void) => {
    startTransition(async () => {
      if (optimisticAction) optimisticAction();
      try {
        await deleteReminder(id);
        toast({ title: 'Rappel supprimé', description: 'Le rappel a été supprimé.' });
        options?.onSuccess?.();
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer le rappel.' });
        options?.onError?.(error);
      }
    });
  };

  const handleSnooze = (id: number, days: 1 | 7, optimisticAction?: () => void) => {
    startTransition(async () => {
      if (optimisticAction) optimisticAction();
      try {
        await snoozeReminder(id, days);
        toast({ title: 'Rappel repoussé', description: `Le rappel a été repoussé de ${days} jour(s).` });
        options?.onSuccess?.();
      } catch (error) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de repousser le rappel.' });
        options?.onError?.(error);
      }
    });
  };

  return {
    isPending,
    handleComplete,
    handleDelete,
    handleSnooze
  };
}
