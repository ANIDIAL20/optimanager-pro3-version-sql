'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
import { Plus } from 'lucide-react';
import { createReminder } from '@/app/actions/reminder-actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

export function CreateReminderDialog() {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    reminderType: 'MANUAL',
    targetDate: '',
    priority: 'normal',
    notificationOffsetDays: 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!formData.title || !formData.targetDate) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez remplir les champs obligatoires.' });
        return;
      }

      await createReminder({
        type: 'admin', // Generic type for manual reminders
        priority: formData.priority,
        title: formData.title,
        message: formData.description,
        status: 'pending',
        dueDate: formData.targetDate, // String, will be converted in server action
        metadata: { manual: true, offsetDays: formData.notificationOffsetDays },
      });

      toast({ title: 'Succès', description: 'Rappel créé avec succès.' });
      setOpen(false);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        reminderType: 'MANUAL',
        targetDate: '',
        priority: 'normal', 
        notificationOffsetDays: 0,
      });
      
      router.refresh(); // Refresh server components
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de créer le rappel.' });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 h-4 w-4" /> Nouveau Rappel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Créer un nouveau rappel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ex: Payer loyer, Appeler fournisseur..."
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Message / Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Détails supplémentaires..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div className="space-y-2">
              <Label htmlFor="date">Date d'échéance *</Label>
              <Input
                id="date"
                type="datetime-local"
                value={formData.targetDate}
                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="priority">Priorité</Label>
              <Select 
                value={formData.priority} 
                onValueChange={(v) => setFormData({ ...formData, priority: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button type="submit">Enregistrer</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
