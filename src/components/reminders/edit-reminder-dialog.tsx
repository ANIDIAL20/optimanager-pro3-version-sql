'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { updateReminder } from '@/app/actions/reminder-actions';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';

interface EditReminderDialogProps {
    reminder: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

export function EditReminderDialog({ reminder, open, onOpenChange, onSuccess }: EditReminderDialogProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const [formData, setFormData] = useState({
        title: reminder.title,
        description: reminder.message || '',
        targetDate: reminder.dueDate ? new Date(reminder.dueDate).toISOString().slice(0, 16) : '',
        priority: reminder.priority,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            if (!formData.title || !formData.targetDate) {
                toast({ variant: 'destructive', title: 'Erreur', description: 'Veuillez remplir les champs obligatoires.' });
                return;
            }

            await updateReminder(reminder.id, {
                priority: formData.priority,
                title: formData.title,
                message: formData.description,
                dueDate: formData.targetDate,
            });

            toast({ title: 'Succès', description: 'Rappel modifié avec succès.' });
            onOpenChange(false);
            onSuccess();
            router.refresh();
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de modifier le rappel.' });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Modifier le rappel</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="edit-title">Titre *</Label>
                        <Input
                            id="edit-title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="edit-description">Message / Description</Label>
                        <Textarea
                            id="edit-description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-date">Échéance *</Label>
                            <Input
                                id="edit-date"
                                type="datetime-local"
                                value={formData.targetDate}
                                onChange={(e) => setFormData({ ...formData, targetDate: e.target.value })}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="edit-priority">Priorité</Label>
                            <Select
                                value={formData.priority}
                                onValueChange={(v) => setFormData({ ...formData, priority: v })}
                            >
                                <SelectTrigger id="edit-priority">
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
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Modification...' : 'Enregistrer les modifications'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
