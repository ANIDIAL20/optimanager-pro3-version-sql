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
import { Plus, Repeat, CalendarDays, Coins } from 'lucide-react';
import { createReminder } from '@/app/actions/reminder-actions';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    // New fields
    mode: 'simple', // 'simple' | 'recurring' | 'installment'
    recurring: {
        frequency: 'weekly', // 'daily' | 'weekly' | 'monthly'
        count: 3
    },
    installment: {
        totalAmount: 0,
        months: 3
    }
  });

  // Calculate installment preview
  const installmentMonthlyAmount = formData.installment.months > 0 
      ? (formData.installment.totalAmount / formData.installment.months).toFixed(2) 
      : '0.00';

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
        metadata: { 
            manual: true, 
            offsetDays: formData.notificationOffsetDays,
            // Pass batch config if needed
            batchConfig: formData.mode === 'simple' ? undefined : {
                mode: formData.mode,
                ...(formData.mode === 'recurring' ? formData.recurring : {}),
                ...(formData.mode === 'installment' ? formData.installment : {})
            }
        },
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
        mode: 'simple',
        recurring: { frequency: 'weekly', count: 3 },
        installment: { totalAmount: 0, months: 3 }
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
          
          {/* Mode Switcher */}
          <Tabs value={formData.mode} onValueChange={(v) => setFormData({ ...formData, mode: v })} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="simple" className="gap-2"><Plus className="h-4 w-4"/>Simple</TabsTrigger>
              <TabsTrigger value="recurring" className="gap-2"><Repeat className="h-4 w-4"/>Répéter</TabsTrigger>
              <TabsTrigger value="installment" className="gap-2"><Coins className="h-4 w-4"/>Échéancier</TabsTrigger>
            </TabsList>
            
            <TabsContent value="simple" className="mt-4 space-y-4">
               {/* Simple Mode Inputs are default (merged below) */}
            </TabsContent>

            <TabsContent value="recurring" className="mt-4 p-4 border rounded-md bg-slate-50 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Fréquence</Label>
                        <Select 
                            value={formData.recurring.frequency} 
                            onValueChange={(v) => setFormData({ 
                                ...formData, 
                                recurring: { ...formData.recurring, frequency: v } 
                            })}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="daily">Quotidien</SelectItem>
                                <SelectItem value="weekly">Hebdomadaire</SelectItem>
                                <SelectItem value="monthly">Mensuel</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Nombre de fois</Label>
                        <Input 
                            type="number" 
                            min="2" max="52"
                            value={formData.recurring.count}
                            onChange={(e) => setFormData({ 
                                ...formData, 
                                recurring: { ...formData.recurring, count: parseInt(e.target.value) || 2 } 
                            })}
                        />
                    </div>
                </div>
                <p className="text-xs text-slate-500">
                    Crée {formData.recurring.count} rappels espacés selon la fréquence choisie.
                </p>
            </TabsContent>

            <TabsContent value="installment" className="mt-4 p-4 border rounded-md bg-slate-50 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Montant Total (DH)</Label>
                        <Input 
                            type="number" 
                            value={formData.installment.totalAmount}
                            onChange={(e) => setFormData({ 
                                ...formData, 
                                installment: { ...formData.installment, totalAmount: parseFloat(e.target.value) || 0 } 
                            })}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Nombre de mois</Label>
                        <Input 
                            type="number" 
                            min="2" max="24"
                            value={formData.installment.months}
                            onChange={(e) => setFormData({ 
                                ...formData, 
                                installment: { ...formData.installment, months: parseInt(e.target.value) || 2 } 
                            })}
                        />
                    </div>
                </div>
                <div className="flex items-center justify-between text-sm bg-blue-50 text-blue-700 p-2 rounded">
                    <span className="font-semibold">Mensualité:</span>
                    <span>{installmentMonthlyAmount} DH / mois</span>
                </div>
            </TabsContent>
          </Tabs>

          <div className="space-y-2">
            <Label htmlFor="title">Titre * {formData.mode === 'installment' && '(Préfixe)'}</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder={formData.mode === 'installment' ? "Ex: Paiement Facture X..." : "Ex: Payer loyer..."}
              required
            />
            {formData.mode === 'installment' && (
                <p className="text-[10px] text-slate-500">Sera suffixé par (1/X), (2/X)...</p>
            )}
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
              <Label htmlFor="date">Date de départ *</Label>
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
            <Button type="submit">
                {formData.mode === 'simple' ? 'Créer Rappel' : `Créer ${formData.mode === 'recurring' ? formData.recurring.count : formData.installment.months} Rappels`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
