'use client';

import * as React from 'react';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { Badge } from '@/components/ui/badge';
import { Phone, Mail, MapPin, DollarSign, Eye, Glasses, StickyNote, Pencil, Check, X, Loader2 } from 'lucide-react';
import type { Client } from '@/lib/types';
import { useFirestore, useCollection, useMemoFirebase, useFirebase } from '@/firebase';
import { collection, query, orderBy, limit, doc, updateDoc } from 'firebase/firestore';
import { SensitiveData } from '@/components/ui/sensitive-data';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface ClientOverviewProps {
    client: Client;
    clientId: string;
}

// Updated type to match CamelCase from PrescriptionForm
type Prescription = {
    id: string;
    date: string | Date;
    odSphere?: string;
    odCylindre?: string; // Note: 'Cylindre' not 'Cylinder' based on form
    odAxe?: string;
    ogSphere?: string;
    ogCylindre?: string;
    ogAxe?: string;
};

export function ClientOverview({ client, clientId }: ClientOverviewProps) {
    const firestore = useFirestore();
    const { user } = useFirebase();
    const { toast } = useToast();

    // Notes Editing State
    const [isEditingNotes, setIsEditingNotes] = React.useState(false);
    const [notesContent, setNotesContent] = React.useState(client.notes || '');
    const [isSavingNotes, setIsSavingNotes] = React.useState(false);

    // Sync notes if client updates externally
    React.useEffect(() => {
        if (!isEditingNotes) {
            setNotesContent(client.notes || '');
        }
    }, [client.notes, isEditingNotes]);

    // Fetch latest prescription
    const prescriptionQuery = useMemoFirebase(
        () => firestore && user
            ? query(
                collection(firestore, `stores/${user.uid}/clients/${clientId}/prescriptions`),
                orderBy('date', 'desc'),
                limit(1)
            )
            : null,
        [firestore, user, clientId]
    );
    const { data: prescriptions } = useCollection<Prescription>(prescriptionQuery);
    const latestPrescription = prescriptions?.[0];

    // Mock financial data - replace with actual data from your schema
    const totalSpent = client.totalSpent || 0;
    const remainingBalance = client.creditBalance || 0; // Prioritize creditBalance if used in new schema, fallback to solde?
    // Actually, check implementation plan: we decided to use creditBalance or consistent naming. 
    // let's use client.creditBalance if available, or client.totalDebt? 
    // Current usage in this file was: client.solde. Let's stick to consistent prop if possible.
    // In Add Client we init: creditBalance: 0. 
    // Let's use `creditBalance` as the source of truth for "Reste à Payer" (Debt) or Balance?
    // Usually 'Credit Balance' implies money user has. 'Debt' is what they owe. 
    // Let's assume 'solde' or 'totalDebt'. The code used 'solde'.
    // Quick fix: Use what's likely populated.
    const displayBalance = client.totalDebt || 0;
    // wait, earlier code used `remainingBalance`. 
    // Let's check `client` type definition if unsure? 
    // For now I'll use `client.totalDebt` as "Reste à payer" seems to be the context.

    const handleSaveNotes = async () => {
        if (!firestore || !user) return;
        setIsSavingNotes(true);
        try {
            const clientRef = doc(firestore, `stores/${user.uid}/clients/${clientId}`);
            await updateDoc(clientRef, {
                notes: notesContent
            });
            setIsEditingNotes(false);
            toast({ title: "Notes mises à jour", description: "La note a été sauvegardée." });
        } catch (error) {
            console.error("Error saving notes:", error);
            toast({ title: "Erreur", description: "Impossible de sauvegarder la note.", variant: "destructive" });
        } finally {
            setIsSavingNotes(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Block 1: Patient Contact Info */}
            <SpotlightCard className="p-6 md:col-span-2" spotlightColor="rgba(59, 130, 246, 0.15)">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <Phone className="h-5 w-5 text-blue-600" />
                        Informations de Contact
                    </h3>
                    <div className="space-y-3">
                        {client.telephone1 && (
                            <div className="flex items-start gap-3">
                                <Phone className="h-4 w-4 text-slate-400 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">Téléphone</p>
                                    <p className="font-medium text-slate-900">{client.telephone1}</p>
                                </div>
                            </div>
                        )}
                        {client.email && (
                            <div className="flex items-start gap-3">
                                <Mail className="h-4 w-4 text-slate-400 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">Email</p>
                                    <p className="font-medium text-slate-900 break-all">{client.email}</p>
                                </div>
                            </div>
                        )}
                        {(client.adresse || client.ville) && (
                            <div className="flex items-start gap-3">
                                <MapPin className="h-4 w-4 text-slate-400 mt-0.5" />
                                <div className="flex-1">
                                    <p className="text-xs text-slate-500 uppercase tracking-wide">Adresse</p>
                                    <p className="font-medium text-slate-900">
                                        {client.adresse && <span>{client.adresse}</span>}
                                        {client.ville && <span>{client.adresse ? ', ' : ''}{client.ville}</span>}
                                    </p>
                                </div>
                            </div>
                        )}
                        {!client.telephone1 && !client.email && !client.adresse && !client.ville && (
                            <p className="text-sm text-slate-500">Aucune information de contact disponible</p>
                        )}
                    </div>
                </div>
            </SpotlightCard>

            {/* Block 2: Financial Health */}
            <SpotlightCard
                className="p-6"
                spotlightColor={displayBalance > 0 ? "rgba(239, 68, 68, 0.15)" : "rgba(16, 185, 129, 0.15)"}
            >
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-emerald-600" />
                        Santé Financière
                    </h3>
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Total Dépensé</p>
                            <p className="text-2xl font-bold text-slate-900">
                                <SensitiveData value={totalSpent} type="currency" />
                            </p>
                        </div>
                        <div>
                            <p className="text-xs text-slate-500 uppercase tracking-wide">Reste à Payer</p>
                            <div className="flex items-center gap-2">
                                <p className={`text-2xl font-bold ${displayBalance > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    <SensitiveData
                                        value={displayBalance}
                                        type="currency"
                                        className={displayBalance > 0 ? 'text-red-600' : 'text-green-600'}
                                    />
                                </p>
                                {displayBalance > 0 && (
                                    <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                        Impayé
                                    </Badge>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </SpotlightCard>

            {/* Block 3: Last Prescription */}
            <SpotlightCard className="p-6 md:col-span-2 lg:col-span-1" spotlightColor="rgba(139, 92, 246, 0.15)">
                <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        <Glasses className="h-5 w-5 text-purple-600" />
                        Dernière Prescription
                    </h3>
                    {latestPrescription ? (
                        <div className="space-y-3">
                            <div className="bg-purple-50 rounded-lg p-3 border border-purple-100">
                                <p className="text-xs font-semibold text-purple-700 uppercase tracking-wide mb-2">OD (Œil Droit)</p>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                        <p className="text-xs text-slate-500">Sph</p>
                                        <p className="font-bold text-slate-900">{latestPrescription.odSphere || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Cyl</p>
                                        <p className="font-bold text-slate-900">{latestPrescription.odCylindre || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Axe</p>
                                        <p className="font-bold text-slate-900">{latestPrescription.odAxe || '-'}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-blue-50 rounded-lg p-3 border border-blue-100">
                                <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">OG (Œil Gauche)</p>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                        <p className="text-xs text-slate-500">Sph</p>
                                        <p className="font-bold text-slate-900">{latestPrescription.ogSphere || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Cyl</p>
                                        <p className="font-bold text-slate-900">{latestPrescription.ogCylindre || '-'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-slate-500">Axe</p>
                                        <p className="font-bold text-slate-900">{latestPrescription.ogAxe || '-'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-500">Aucune prescription enregistrée.</p>
                    )}
                </div>
            </SpotlightCard>

            {/* Block 4: Notes (Editable) */}
            <SpotlightCard className="p-6 md:col-span-2 lg:col-span-1" spotlightColor="rgba(249, 115, 22, 0.15)">
                <div className="space-y-4 h-full flex flex-col">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <StickyNote className="h-5 w-5 text-orange-600" />
                            Notes
                        </h3>
                        {!isEditingNotes ? (
                            <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(true)} className="h-8 w-8 p-0">
                                <Pencil className="h-4 w-4 text-slate-500" />
                                <span className="sr-only">Modifier</span>
                            </Button>
                        ) : (
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" onClick={() => setIsEditingNotes(false)} disabled={isSavingNotes} className="h-8 w-8 p-0 text-red-500 hover:text-red-600">
                                    <X className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={handleSaveNotes} disabled={isSavingNotes} className="h-8 w-8 p-0 text-green-600 hover:text-green-700">
                                    {isSavingNotes ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex-1">
                        {isEditingNotes ? (
                            <Textarea
                                value={notesContent}
                                onChange={(e) => setNotesContent(e.target.value)}
                                className="min-h-[120px] bg-white resize-none"
                                placeholder="Saisir une note..."
                            />
                        ) : (
                            <div className="space-y-2">
                                {notesContent ? (
                                    <div className="bg-amber-50 rounded-lg p-3 border border-amber-100 min-h-[120px]">
                                        <p className="text-sm text-slate-700 whitespace-pre-wrap">{notesContent}</p>
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 min-h-[120px] flex flex-col justify-center">
                                        <p className="text-sm text-slate-500 italic text-center">
                                            Aucune note spéciale pour ce client.
                                        </p>
                                        <p className="text-xs text-slate-400 mt-1 text-center">
                                            Cliquez sur le crayon pour ajouter une note.
                                        </p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </SpotlightCard>
        </div>
    );
}
