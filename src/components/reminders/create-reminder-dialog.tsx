'use client';

import { useState, useEffect } from 'react';
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
import { Plus, Repeat, CalendarDays, Coins, Infinity } from 'lucide-react';
import { createReminder } from '@/app/actions/reminder-actions';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';

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
      frequency: 'weekly',
      count: 3,
      isInfinite: false
    },
    installment: {
      totalAmount: 0,
      count: 3,
      frequency: 'monthly',
      startDate: '',
      endDate: ''
    }
  });

  // Auto-calculate installment end date
  useEffect(() => {
    if (formData.mode === 'installment' && formData.installment.startDate && formData.installment.count > 1) {
      const start = new Date(formData.installment.startDate);
      const end = new Date(start);
      const count = formData.installment.count;
      const freq = formData.installment.frequency;

      if (freq === 'weekly') end.setDate(start.getDate() + (count - 1) * 7);
      else if (freq === 'bimensuelle') end.setDate(start.getDate() + (count - 1) * 14);
      else end.setMonth(start.getMonth() + (count - 1));

      const endStr = end.toISOString().slice(0, 16); // Format for datetime-local
      if (endStr !== formData.installment.endDate) {
        setFormData(prev => ({
          ...prev,
          installment: { ...prev.installment, endDate: endStr }
        }));
      }
    }
  }, [formData.installment.startDate, formData.installment.count, formData.installment.frequency, formData.mode]);

  // Sync targetDate with installment startDate
  useEffect(() => {
    if (formData.mode === 'installment' && formData.targetDate !== formData.installment.startDate) {
      setFormData(prev => ({
        ...prev,
        installment: { ...prev.installment, startDate: prev.targetDate }
      }));
    }
  }, [formData.targetDate, formData.mode]);

  // Calculate installment preview
  const installmentAmount = formData.installment.count > 0
    ? (formData.installment.totalAmount / formData.installment.count).toFixed(2)
    : '0.00';

  const freqLabels: Record<string, string> = {
    weekly: 'par semaine',
    bimensuelle: 'tous les 15j',
    monthly: 'par mois'
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!formData.title || !formData.targetDate) {
        toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez remplir les champs obligatoires.' });
        return;
      }

      // If infinite, we set a reasonable count for batch creation
      let finalCount = formData.recurring.count;
      if (formData.mode === 'recurring' && formData.recurring.isInfinite) {
        // Preset counts for "infinite" batch
        const f = formData.recurring.frequency;
        if (f === 'daily') finalCount = 60; // 2 months
        else if (f === 'weekly' || f === 'bimensuelle') finalCount = 52; // 1 year approx
        else if (f === 'annuelle') finalCount = 10; // 10 years
        else finalCount = 24; // 2 years for monthly types
      }

      await createReminder({
        type: 'admin',
        priority: formData.priority,
        title: formData.title,
        message: formData.description,
        status: 'pending',
        dueDate: formData.targetDate,
        metadata: {
          manual: true,
          offsetDays: formData.notificationOffsetDays,
          batchConfig: formData.mode === 'simple' ? undefined : {
            mode: formData.mode,
            ...(formData.mode === 'recurring' ? { ...formData.recurring, count: finalCount } : {}),
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
        recurring: { frequency: 'weekly', count: 3, isInfinite: false },
        installment: { totalAmount: 0, count: 3, frequency: 'monthly', startDate: '', endDate: '' }
      });

      router.refresh();
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
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un nouveau rappel</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">

          {/* Mode Switcher */}
          <Tabs value={formData.mode} onValueChange={(v) => setFormData({ ...formData, mode: v })} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="simple" className="gap-2"><Plus className="h-4 w-4" />Simple</TabsTrigger>
              <TabsTrigger value="recurring" className="gap-2"><Repeat className="h-4 w-4" />Répéter</TabsTrigger>
              <TabsTrigger value="installment" className="gap-2"><Coins className="h-4 w-4" />Échéancier</TabsTrigger>
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
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Quotidienne (كل يوم)</SelectItem>
                      <SelectItem value="weekly">Hebdomadaire (كل أسبوع)</SelectItem>
                      <SelectItem value="bimensuelle">Bimensuelle (كل أسبوعين)</SelectItem>
                      <SelectItem value="monthly">Mensuelle (كل شهر)</SelectItem>
                      <SelectItem value="bimestrielle">Bimestrielle (كل شهرين)</SelectItem>
                      <SelectItem value="trimestrielle">Trimestrielle (كل 3 أشهر)</SelectItem>
                      <SelectItem value="semestrielle">Semestrielle (كل 6 أشهر)</SelectItem>
                      <SelectItem value="annuelle">Annuelle (كل سنة)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!formData.recurring.isInfinite && (
                  <div className="space-y-2">
                    <Label>Nombre de fois</Label>
                    <Input
                      type="number"
                      min="2" max="100"
                      className="bg-white"
                      value={formData.recurring.count}
                      onChange={(e) => setFormData({
                        ...formData,
                        recurring: { ...formData.recurring, count: parseInt(e.target.value) || 2 }
                      })}
                    />
                  </div>
                )}
                {formData.recurring.isInfinite && (
                  <div className="space-y-2">
                    <Label className="text-slate-400">Nombre de fois</Label>
                    <div className="flex items-center gap-2 h-10 px-3 bg-slate-100 rounded-md text-slate-400 border border-slate-200">
                      <Infinity className="h-4 w-4" /> Sans limite
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center space-x-2 bg-white p-2 rounded-md border">
                <Checkbox
                  id="infinite"
                  checked={formData.recurring.isInfinite}
                  onCheckedChange={(checked) => setFormData({
                    ...formData,
                    recurring: { ...formData.recurring, isInfinite: checked as boolean }
                  })}
                />
                <Label htmlFor="infinite" className="text-sm font-medium cursor-pointer">
                  Répéter indéfiniment (بدون حد)
                </Label>
              </div>

              <p className="text-xs text-slate-500">
                {formData.recurring.isInfinite
                  ? `Crée automatiquement des rappels réguliers selon la fréquence ${formData.recurring.frequency}.`
                  : `Crée ${formData.recurring.count} rappels espacés selon la fréquence choisie.`
                }
              </p>
            </TabsContent>

            <TabsContent value="installment" className="mt-4 p-4 border rounded-md bg-slate-50 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Montant Total (DH)</Label>
                  <Input
                    type="number"
                    className="bg-white"
                    value={formData.installment.totalAmount}
                    onChange={(e) => setFormData({
                      ...formData,
                      installment: { ...formData.installment, totalAmount: parseFloat(e.target.value) || 0 }
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fréquence</Label>
                  <Select
                    value={formData.installment.frequency}
                    onValueChange={(v) => setFormData({
                      ...formData,
                      installment: { ...formData.installment, frequency: v }
                    })}
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Par semaine</SelectItem>
                      <SelectItem value="bimensuelle">Toutes les 2 semaines (15j)</SelectItem>
                      <SelectItem value="monthly">Mensuelle (par mois)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Nombre d'échéances</Label>
                <Input
                  type="number"
                  min="2" max="48"
                  className="bg-white"
                  value={formData.installment.count}
                  onChange={(e) => setFormData({
                    ...formData,
                    installment: { ...formData.installment, count: parseInt(e.target.value) || 2 }
                  })}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Premier paiement</Label>
                  <Input
                    type="datetime-local"
                    className="bg-white"
                    value={formData.targetDate}
                    onChange={(e) => setFormData({
                      ...formData,
                      targetDate: e.target.value
                    })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dernier paiement</Label>
                  <Input
                    type="datetime-local"
                    className="bg-white"
                    value={formData.installment.endDate}
                    onChange={(e) => setFormData({
                      ...formData,
                      installment: { ...formData.installment, endDate: e.target.value }
                    })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-between text-sm bg-blue-50 text-blue-700 p-2 rounded border border-blue-100">
                <span className="font-semibold">Montant à payer:</span>
                <span>{installmentAmount} DH / {freqLabels[formData.installment.frequency]}</span>
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

          {formData.mode !== 'installment' && (
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
          )}

          <div className="space-y-2">
            <Label htmlFor="priority">Priorité</Label>
            <Select
              value={formData.priority}
              onValueChange={(v) => setFormData({ ...formData, priority: v })}
            >
              <SelectTrigger className="bg-white">
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

          <div className="flex justify-end pt-2">
            <Button type="submit">
              {formData.mode === 'recurring' && formData.recurring.isInfinite
                ? 'Activer le rappel récurrent'
                : formData.mode === 'simple'
                  ? 'Créer Rappel'
                  : `Créer ${formData.mode === 'recurring' ? formData.recurring.count : formData.installment.count} Rappels`
              }
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
