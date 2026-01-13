'use client';

import * as React from 'react';
import { getUpcomingReminders, getOverdueReminders, updateReminderStatus, deleteReminder, createReminder } from '@/app/actions/reminder-actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bell, Clock, CheckCircle2, XCircle, Trash2, Plus, AlertCircle, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function RemindersPage() {
  const [upcomingReminders, setUpcomingReminders] = React.useState<any[]>([]);
  const [overdueReminders, setOverdueReminders] = React.useState<any[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  const loadReminders = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const [upcoming, overdue] = await Promise.all([
        getUpcomingReminders(20),
        getOverdueReminders(),
      ]);

      setUpcomingReminders(upcoming || []);
      setOverdueReminders(overdue || []);
    } catch (error: any) {
      console.error('Error loading reminders:', error);
      // If table doesn't exist yet, show empty state instead of error
      if (error.message?.includes('relation "reminders" does not exist')) {
        setUpcomingReminders([]);
        setOverdueReminders([]);
        toast.info('La table reminders n\'existe pas encore. Exécutez le script SQL sur Neon.', {
          duration: 5000,
        });
      } else {
        toast.error('Impossible de charger les rappels');
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadReminders();
  }, [loadReminders]);

  const handleComplete = async (reminderId: number) => {
    try {
      const result = await updateReminderStatus({ id: reminderId, status: 'COMPLETED' });
      if (result.success) {
        toast.success('Rappel marqué comme terminé');
        loadReminders();
      } else {
        toast.error('Erreur lors de la mise à jour');
      }
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  const handleDismiss = async (reminderId: number) => {
    try {
      const result = await updateReminderStatus({ id: reminderId, status: 'DISMISSED' });
      if (result.success) {
        toast.success('Rappel ignoré');
        loadReminders();
      }
    } catch (error) {
      toast.error('Erreur');
    }
  };

  const handleDelete = async (reminderId: number) => {
    if (!confirm('Supprimer ce rappel ?')) return;
    try {
      const result = await deleteReminder(reminderId);
      if (result.success) {
        toast.success('Rappel supprimé');
        loadReminders();
      }
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="space-y-4">
          <div className="h-8 w-64 bg-slate-200 rounded animate-pulse" />
          <div className="h-32 bg-slate-100 rounded animate-pulse" />
        </div>
      </div>
    );
  }

  const totalPending = upcomingReminders.length + overdueReminders.length;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Bell className="h-8 w-8 text-blue-600" />
            Rappels & Notifications
          </h1>
          <p className="text-slate-600 mt-1">
            Gérez vos rappels automatiques et manuels
          </p>
        </div>
        
        <CreateReminderDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onSuccess={loadReminders} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-6 border-l-4 border-l-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">En retard</p>
              <p className="text-3xl font-bold text-orange-600">{overdueReminders.length}</p>
            </div>
            <AlertCircle className="h-10 w-10 text-orange-500" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">À venir</p>
              <p className="text-3xl font-bold text-blue-600">{upcomingReminders.length}</p>
            </div>
            <Clock className="h-10 w-10 text-blue-500" />
          </div>
        </Card>

        <Card className="p-6 border-l-4 border-l-green-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Total en attente</p>
              <p className="text-3xl font-bold text-green-600">{totalPending}</p>
            </div>
            <Bell className="h-10 w-10 text-green-500" />
          </div>
        </Card>
      </div>

      {/* Overdue Reminders */}
      {overdueReminders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-xl font-semibold text-orange-600 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            En retard ({overdueReminders.length})
          </h2>
          <div className="space-y-2">
            {overdueReminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onComplete={handleComplete}
                onDismiss={handleDismiss}
                onDelete={handleDelete}
                variant="overdue"
              />
            ))}
          </div>
        </div>
      )}

      {/* Upcoming Reminders */}
      <div className="space-y-3">
        <h2 className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <Clock className="h-5 w-5" />
          À venir ({upcomingReminders.length})
        </h2>
        {upcomingReminders.length === 0 ? (
          <Card className="p-12 text-center">
            <Bell className="h-16 w-16 mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500">Aucun rappel à venir</p>
            <Button onClick={() => setCreateDialogOpen(true)} className="mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Créer un rappel
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcomingReminders.map((reminder) => (
              <ReminderCard
                key={reminder.id}
                reminder={reminder}
                onComplete={handleComplete}
                onDismiss={handleDismiss}
                onDelete={handleDelete}
                variant="upcoming"
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Reminder Card Component
function ReminderCard({
  reminder,
  onComplete,
  onDismiss,
  onDelete,
  variant,
}: {
  reminder: any;
  onComplete: (id: number) => void;
  onDismiss: (id: number) => void;
  onDelete: (id: number) => void;
  variant: 'overdue' | 'upcoming';
}) {
  const targetDate = new Date(reminder.targetDate);
  const isOverdue = variant === 'overdue';

  return (
    <Card className={`p-4 ${isOverdue ? 'border-l-4 border-l-orange-500 bg-orange-50/50' : 'border-l-4 border-l-blue-500'}`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 space-y-2">
          {/* Title */}
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-slate-900">{reminder.title}</h3>
            {reminder.isRecurring && (
              <Badge variant="secondary" className="text-xs">
                🔁 Récurrent
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              {reminder.reminderType === 'ONE_TIME' ? 'Unique' : reminder.reminderType === 'RECURRING' ? 'Récurrent' : 'Manuel'}
            </Badge>
          </div>

          {/* Description */}
          {reminder.description && (
            <p className="text-sm text-slate-600">{reminder.description}</p>
          )}

          {/* Date */}
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-slate-400" />
            <span className={isOverdue ? 'text-orange-600 font-medium' : 'text-slate-600'}>
              {format(targetDate, "dd MMMM yyyy 'à' HH:mm", { locale: fr })}
            </span>
            {isOverdue && <span className="text-orange-600 font-semibold">(En retard!)</span>}
          </div>

          {/* Linked Entity */}
          {reminder.relatedEntityType && (
            <div className="text-xs text-slate-500">
              Lié à: {reminder.relatedEntityType} #{reminder.relatedEntityId}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-2">
          <Button
            size="sm"
            onClick={() => onComplete(reminder.id)}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle2 className="h-4 w-4 mr-1" />
            Terminé
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onDismiss(reminder.id)}
          >
            <XCircle className="h-4 w-4 mr-1" />
            Ignorer
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(reminder.id)}
            className="text-red-600 hover:text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

// Create Reminder Dialog
function CreateReminderDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = React.useState({
    title: '',
    description: '',
    reminderType: 'MANUAL' as const,
    targetDate: '',
    notificationOffsetDays: 0,
    isRecurring: false,
    recurrenceInterval: 1,
    recurrenceUnit: 'MONTHS' as const,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createReminder({
        ...formData,
        targetDate: new Date(formData.targetDate),
      });

      if (result.success) {
        toast.success('Rappel créé avec succès');
        onOpenChange(false);
        onSuccess();
        // Reset form
        setFormData({
          title: '',
          description: '',
          reminderType: 'MANUAL',
          targetDate: '',
          notificationOffsetDays: 0,
          isRecurring: false,
          recurrenceInterval: 1,
          recurrenceUnit: 'MONTHS',
        });
      } else {
        toast.error('Erreur lors de la création');
      }
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau Rappel
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Créer un rappel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Titre *</Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
              placeholder="Ex: Payer le loyer"
            />
          </div>

          <div>
            <Label>Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Détails supplémentaires..."
            />
          </div>

          <div>
            <Label>Date & Heure *</Label>
            <Input
              type="datetime-local"
              value={formData.targetDate}
              onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
              required
            />
          </div>

          <div>
            <Label>Notifier X jours avant</Label>
            <Input
              type="number"
              min="0"
              max="30"
              value={formData.notificationOffsetDays.toString()}
              onChange={(e) => setFormData({ ...formData, notificationOffsetDays: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="recurring"
              checked={formData.isRecurring}
              onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
              className="rounded"
            />
            <Label htmlFor="recurring">Récurrent</Label>
          </div>

          {formData.isRecurring && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded">
              <div>
                <Label>Intervalle</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.recurrenceInterval.toString()}
                  onChange={(e) => setFormData({ ...formData, recurrenceInterval: parseInt(e.target.value) || 1 })}
                />
              </div>
              <div>
                <Label>Unité</Label>
                <Select
                  value={formData.recurrenceUnit}
                  onValueChange={(v: any) => setFormData({ ...formData, recurrenceUnit: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DAYS">Jours</SelectItem>
                    <SelectItem value="WEEKS">Semaines</SelectItem>
                    <SelectItem value="MONTHS">Mois</SelectItem>
                    <SelectItem value="YEARS">Années</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1">
              Créer
            </Button>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
