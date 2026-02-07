'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Loader2, User, Phone, MapPin, Calendar, FileText, Mail } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Client } from '@/app/actions/clients-actions';


import { getInsurances } from '@/app/actions/settings-actions';

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
    submitLabel = 'Enregistrer le client',
    onCancel
}: ClientFormProps) {
    const [mutuellesList, setMutuellesList] = React.useState<{ id: number; name: string }[]>([]);
    
    const [formData, setFormData] = React.useState({
        prenom: defaultValues.prenom || '',
        nom: defaultValues.nom || '',
        gender: defaultValues.gender || 'Homme',
        dateOfBirth: defaultValues.dateOfBirth ? new Date(defaultValues.dateOfBirth).toISOString().split('T')[0] : '',
        cin: defaultValues.cin || '',
        mutuelle: defaultValues.mutuelle || '',
        phone: defaultValues.phone || '',
        phone2: defaultValues.phone2 || '',
        email: defaultValues.email || '',
        city: defaultValues.city || '',
        address: defaultValues.address || '',
    });

    React.useEffect(() => {
        const fetchSettings = async () => {
             try {
                 const insurances = await getInsurances();
                 setMutuellesList(insurances);
             } catch (error) {
                 console.error("Failed to fetch insurances:", error);
             }
        };
        fetchSettings();
    }, []);

    const handleChange = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const dataToSubmit = {
            ...formData,
            name: `${formData.prenom} ${formData.nom}`.trim(),
        };
        await onSubmit(dataToSubmit);
    };

    // Helper to check if the current mutuelle value is in the list or standard options
    // If not, it might be a custom value or legacy one.
    // We will append it or valid it?
    // For now, standard select behavior.

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* Card 1: Informations Personnelles */}
            <Card>
                <CardHeader>
                    <CardTitle>Informations Personnelles</CardTitle>
                    <CardDescription>
                        Identification et état civil du client
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="nom">Nom de famille *</Label>
                        <Input
                            id="nom"
                            value={formData.nom}
                            onChange={(e) => handleChange('nom', e.target.value)}
                            placeholder="Ex: El Amrani"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="prenom">Prénom *</Label>
                        <Input
                            id="prenom"
                            value={formData.prenom}
                            onChange={(e) => handleChange('prenom', e.target.value)}
                            placeholder="Ex: Karim"
                            required
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="gender">Sexe</Label>
                        <Select
                            value={formData.gender}
                            onValueChange={(value) => handleChange('gender', value)}
                        >
                            <SelectTrigger id="gender">
                                <SelectValue placeholder="Sélectionner" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Homme">Homme</SelectItem>
                                <SelectItem value="Femme">Femme</SelectItem>
                                <SelectItem value="Enfant">Enfant</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="dateOfBirth">Date de Naissance</Label>
                        <div className="relative">
                            <Input
                                id="dateOfBirth"
                                type="date"
                                value={formData.dateOfBirth}
                                onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                                className="pl-10"
                            />
                            <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="cin">CIN / Identité</Label>
                        <div className="relative">
                            <Input
                                id="cin"
                                value={formData.cin}
                                onChange={(e) => handleChange('cin', e.target.value)}
                                placeholder="Ex: AB123456"
                                className="pl-10"
                            />
                            <FileText className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mutuelle">Mutuelle</Label>
                        <SearchableSelect
                            options={[
                                { label: 'Aucune', value: 'AUCUNE' },
                                ...mutuellesList.map((m) => ({
                                    label: m.name,
                                    value: m.name,
                                }))
                            ]}
                            value={formData.mutuelle}
                            onChange={(value) => handleChange('mutuelle', value)}
                            placeholder="Sélectionner..."
                            searchPlaceholder="Rechercher une mutuelle..."
                        />
                    </div>
                </CardContent>
            </Card>


            {/* Card 2: Coordonnées de Contact */}
            <Card>
                <CardHeader>
                    <CardTitle>Coordonnées de Contact</CardTitle>
                    <CardDescription>
                        Moyens de communication et adresse
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="phone">Téléphone Principal *</Label>
                        <div className="relative">
                            <Input
                                id="phone"
                                value={formData.phone}
                                onChange={(e) => handleChange('phone', e.target.value)}
                                placeholder="06 00 00 00 00"
                                className="pl-10"
                                required
                            />
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone2">Téléphone Secondaire</Label>
                        <div className="relative">
                            <Input
                                id="phone2"
                                value={formData.phone2}
                                onChange={(e) => handleChange('phone2', e.target.value)}
                                placeholder="05 00 00 00 00"
                                className="pl-10"
                            />
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <div className="relative">
                            <Input
                                id="email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleChange('email', e.target.value)}
                                placeholder="client@exemple.com"
                                className="pl-10"
                            />
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="city">Ville</Label>
                        <div className="relative">
                            <Input
                                id="city"
                                value={formData.city}
                                onChange={(e) => handleChange('city', e.target.value)}
                                placeholder="Ex: Casablanca"
                                className="pl-10"
                            />
                            <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="address">Adresse Postale</Label>
                        <Input
                            id="address"
                            value={formData.address}
                            onChange={(e) => handleChange('address', e.target.value)}
                            placeholder="N° rue, Quartier..."
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Action Buttons */}
            <div className="flex justify-end items-center gap-3">
                {onCancel && (
                    <Button 
                        type="button" 
                        variant="outline" 
                        onClick={onCancel} 
                        disabled={isSubmitting}
                    >
                        Annuler
                    </Button>
                )}
                <Button 
                    type="submit" 
                    disabled={isSubmitting || !formData.prenom || !formData.nom || !formData.phone}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]"
                >
                    {isSubmitting ? (
                        <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Traitement...
                        </>
                    ) : (
                        submitLabel
                    )}
                </Button>
            </div>
        </form>
    );
}
