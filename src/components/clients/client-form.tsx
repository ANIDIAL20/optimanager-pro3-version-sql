'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { Client } from '@/app/actions/clients-actions';

interface ClientFormProps {
    defaultValues?: Partial<Client>;
    onSubmit: (data: Partial<Client>) => Promise<void>;
    isSubmitting?: boolean;
    submitLabel?: string;
    onCancel?: () => void;
}

export function ClientForm({
    defaultValues = {},
    onSubmit,
    isSubmitting = false,
    submitLabel = 'Enregistrer',
    onCancel
}: ClientFormProps) {
    const [formData, setFormData] = React.useState({
        name: defaultValues.name || '',
        phone: defaultValues.phone || '',
        email: defaultValues.email || '',
        mutuelle: defaultValues.mutuelle || '',
        address: defaultValues.address || '',
        dateOfBirth: defaultValues.dateOfBirth || '',
    });

    const handleChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        await onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">Nom Complet *</Label>
                    <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        placeholder="Ex: Mohammed Hassan"
                        required
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="phone">Téléphone *</Label>
                    <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => handleChange('phone', e.target.value)}
                        placeholder="Ex: 06 12 34 56 78"
                        required
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        placeholder="Ex: client@email.com"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="dateOfBirth">Date de Naissance</Label>
                    <Input
                        id="dateOfBirth"
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="mutuelle">Mutuelle / Assurance</Label>
                    <Input
                        id="mutuelle"
                        value={formData.mutuelle}
                        onChange={(e) => handleChange('mutuelle', e.target.value)}
                        placeholder="Ex: CNOPS, CNSS"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="address">Adresse</Label>
                    <Input
                        id="address"
                        value={formData.address}
                        onChange={(e) => handleChange('address', e.target.value)}
                        placeholder="Ex: Casablanca, Maroc"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Annuler
                    </Button>
                )}
                <Button type="submit" disabled={isSubmitting || !formData.name || !formData.phone}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Enregistrement...
                        </>
                    ) : (
                        submitLabel
                    )}
                </Button>
            </div>
        </form>
    );
}
