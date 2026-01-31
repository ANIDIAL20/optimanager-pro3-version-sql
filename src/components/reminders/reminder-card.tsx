'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, Clock, Trash2, AlertCircle, Info, Bell, DollarSign, Box, ShoppingBag, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { completeReminder, deleteReminder, markReminderAsRead } from '@/app/actions/reminder-actions';
import { useToast } from '@/hooks/use-toast';

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

  // Priority config
  const priorityConfig: Record<string, { color: string; icon: any; label: string }> = {
    urgent: { color: 'bg-red-100 text-red-800 border-red-200', icon: AlertCircle, label: 'Urgent' },
    important: { color: 'bg-orange-100 text-orange-800 border-orange-200', icon: Bell, label: 'Important' },
    normal: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: Info, label: 'Normal' },
    info: { color: 'bg-gray-100 text-gray-800 border-gray-200', icon: Info, label: 'Info' },
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
    <Card className={cn("border-l-4 transition-all hover:shadow-md", {
      'border-l-red-500': reminder.priority === 'urgent',
      'border-l-orange-500': reminder.priority === 'important',
      'border-l-blue-500': reminder.priority === 'normal',
      'border-l-gray-500': reminder.priority === 'info',
      'opacity-60': reminder.status === 'completed',
    })}>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <div className="flex gap-2 items-center">
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
              'text-gray-500': new Date(reminder.dueDate) >= new Date() || reminder.status === 'completed'
            })}>
              <Clock className="h-3 w-3 mr-1" />
              {format(new Date(reminder.dueDate), 'dd/MM/yyyy', { locale: fr })}
            </div>
          )}
        </div>
        <CardTitle className="text-base mt-2">{reminder.title}</CardTitle>
      </CardHeader>
      
      <CardContent className="pb-2 text-sm text-gray-600">
        <p>{reminder.message}</p>
        {reminder.metadata && (
          <div className="mt-2 text-xs bg-gray-50 p-2 rounded">
             {/* Simple metadata display for MVP */}
             <pre className="whitespace-pre-wrap font-sans">
               {typeof reminder.metadata === 'string' 
                  ? (JSON.parse(reminder.metadata).details || '')
                  : (reminder.metadata.details || '')}
             </pre>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 flex justify-end gap-2">
        {reminder.status !== 'completed' && (
          <Button size="sm" variant="outline" className="h-8 border-green-200 text-green-700 hover:bg-green-50 hover:text-green-800" onClick={handleComplete} disabled={isLoading}>
            <CheckCircle className="h-3.5 w-3.5 mr-1" />
            Terminer
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-8 text-gray-400 hover:text-red-500" onClick={handleDelete} disabled={isLoading}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
}
