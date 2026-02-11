'use client';

import { useState } from 'react';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Trash2, AlertCircle, Info, Bell, DollarSign, Box, ShoppingBag, Calendar, Pencil } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { completeReminder, deleteReminder, markReminderAsRead } from '@/app/actions/reminder-actions';
import { useToast } from '@/hooks/use-toast';
import { EditReminderDialog } from './edit-reminder-dialog';

interface Reminder {
  id: number;
  type: string;
  priority: string;
  title: string;
  message?: string | null;
  status: string;
  dueDate?: Date | null;
  createdAt: Date;
  metadata?: any;
}

interface ReminderCardProps {
  reminder: Reminder;
  onUpdate: () => void;
}

export function ReminderCard({ reminder, onUpdate }: ReminderCardProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  // Priority config with SpotlightCard colors
  const priorityConfig: Record<string, { color: string; spotlightColor: string; icon: any; label: string; border: string; glow: string }> = {
    urgent: {
      color: 'bg-red-500/10 text-red-600 border-red-500/20',
      border: 'border-red-500/30',
      glow: 'shadow-[0_0_15px_-3px_rgba(239,68,68,0.2)]',
      spotlightColor: 'rgba(239, 68, 68, 0.25)',
      icon: AlertCircle,
      label: 'Urgent'
    },
    important: {
      color: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
      border: 'border-orange-500/30',
      glow: 'shadow-[0_0_10px_-3px_rgba(245,158,11,0.15)]',
      spotlightColor: 'rgba(245, 158, 11, 0.2)',
      icon: Bell,
      label: 'Important'
    },
    normal: {
      color: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
      border: 'border-slate-200',
      glow: '',
      spotlightColor: 'rgba(59, 130, 246, 0.15)',
      icon: Info,
      label: 'Normal'
    },
    info: {
      color: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
      border: 'border-slate-100',
      glow: '',
      spotlightColor: 'rgba(100, 116, 139, 0.1)',
      icon: Info,
      label: 'Info'
    },
  };

  // Type icons
  const typeIcons: Record<string, any> = {
    cheque: DollarSign,
    payment: DollarSign,
    stock: Box,
    order: ShoppingBag,
    appointment: Calendar,
    admin: Info,
    maintenance: Box,
  };

  const config = priorityConfig[reminder.priority] || priorityConfig.normal;
  const TypeIcon = typeIcons[reminder.type] || Info;

  const handleComplete = async () => {
    try {
      setIsLoading(true);
      await completeReminder(reminder.id);
      toast({ title: 'Rappel terminé', description: 'Le rappel a été marqué comme traité.' });
      onUpdate();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de terminer le rappel.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await deleteReminder(reminder.id);
      toast({ title: 'Rappel supprimé', description: 'Le rappel a été supprimé.' });
      onUpdate();
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de supprimer le rappel.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SpotlightCard
        className={cn(
          "p-6 transition-all duration-300 hover:scale-[1.01]",
          config.border,
          config.glow,
          {
            'opacity-60 grayscale-[0.3]': reminder.status === 'completed',
            'border-l-4': reminder.priority === 'urgent' || reminder.priority === 'important'
          }
        )}
        spotlightColor={config.spotlightColor}
      >
        {/* Header */}
        <div className="space-y-4">
          <div className="flex justify-between items-start">
            <div className="flex gap-2 items-center flex-wrap">
              <Badge variant="outline" className={cn("flex gap-1 items-center", config.color)}>
                <config.icon className="h-3 w-3" />
                {config.label}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                <TypeIcon className="h-3 w-3 mr-1" />
                {reminder.type}
              </Badge>
            </div>
            {reminder.dueDate && (
              <div className={cn("text-xs font-medium flex items-center", {
                'text-red-500': new Date(reminder.dueDate) < new Date() && reminder.status !== 'completed',
                'text-slate-500': new Date(reminder.dueDate) >= new Date() || reminder.status === 'completed'
              })}>
                <Clock className="h-3 w-3 mr-1" />
                {format(new Date(reminder.dueDate), 'dd/MM/yyyy', { locale: fr })}
              </div>
            )}
          </div>

          {/* Title */}
          <h3 className="text-base font-bold text-slate-900">{reminder.title}</h3>

          {/* Message */}
          <p className="text-sm text-slate-600">{reminder.message}</p>

          {/* Metadata */}
          {reminder.metadata && (
            <div className="text-xs bg-slate-50 p-2 rounded border border-slate-100">
              <pre className="whitespace-pre-wrap font-sans text-slate-600">
                {typeof reminder.metadata === 'string'
                  ? (JSON.parse(reminder.metadata).details || '')
                  : (reminder.metadata.details || '')}
              </pre>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            {reminder.status !== 'completed' && (
              <Button
                size="sm"
                variant="outline"
                className="h-8 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800"
                onClick={handleComplete}
                disabled={isLoading}
              >
                <CheckCircle className="h-3.5 w-3.5 mr-1" />
                Terminer
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-slate-400 hover:text-blue-500"
              onClick={() => setEditOpen(true)}
              disabled={isLoading}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-8 text-slate-400 hover:text-red-500"
              onClick={handleDelete}
              disabled={isLoading}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </SpotlightCard>

      <EditReminderDialog
        reminder={reminder}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={onUpdate}
      />
    </>
  );
}
