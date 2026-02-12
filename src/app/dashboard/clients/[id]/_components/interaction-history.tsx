'use client';

import * as React from 'react';
import { getClientInteractions, addClientInteraction } from '@/app/actions/clients-actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { MessageCircle, Phone, MapPin, StickyNote, Plus, Send, Clock, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BrandLoader } from '@/components/ui/loader-brand';
import { cn } from '@/lib/utils';

interface Interaction {
    id: number;
    type: string;
    content: string;
    createdAt: string | Date;
}

interface InteractionHistoryProps {
    clientId: string;
}

export function InteractionHistory({ clientId }: InteractionHistoryProps) {
    const { toast } = useToast();
    const [interactions, setInteractions] = React.useState<Interaction[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSubmitting, setIsSubmitting] = React.useState(false);
    const [newNote, setNewNote] = React.useState('');
    const [activeFilter, setActiveFilter] = React.useState('all');

    const loadInteractions = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await getClientInteractions(clientId);
            if (result.success && result.data) {
                setInteractions(result.data);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [clientId]);

    React.useEffect(() => {
        loadInteractions();
    }, [loadInteractions]);

    const handleSubmitNote = async () => {
        if (!newNote.trim()) return;

        setIsSubmitting(true);
        try {
            const result = await addClientInteraction(clientId, {
                type: 'note',
                content: newNote.trim()
            });

            if (result.success) {
                setNewNote('');
                loadInteractions();
                toast({ title: 'Note ajoutée', description: 'Le journal a été mis à jour.' });
            }
        } catch (error) {
            toast({ title: 'Erreur', variant: 'destructive', description: "Impossible d'ajouter la note." });
        } finally {
            setIsSubmitting(false);
        }
    };

    const getTypeIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'call': return <Phone className="h-4 w-4" />;
            case 'whatsapp': return <MessageCircle className="h-4 w-4" />;
            case 'visit': return <MapPin className="h-4 w-4" />;
            default: return <StickyNote className="h-4 w-4" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type.toLowerCase()) {
            case 'call': return 'Appel';
            case 'whatsapp': return 'WhatsApp';
            case 'visit': return 'Visite';
            default: return 'Note';
        }
    };

    return (
        <div className="space-y-6">
            {/* Quick Add Form */}
            <Card className="border-indigo-100 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 px-6 py-4 border-b border-indigo-100">
                    <h3 className="font-semibold text-indigo-900 flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Ajouter au Journal (Historique)
                    </h3>
                </div>
                <CardContent className="p-4 space-y-4">
                    <Textarea 
                        placeholder="Quoi de neuf avec ce client ? (Détails de visite, appel, remarque particulière...)"
                        value={newNote}
                        onChange={(e) => setNewNote(e.target.value)}
                        className="min-h-[100px] bg-white border-indigo-100 focus-visible:ring-indigo-500"
                    />
                    <div className="flex justify-end items-center gap-2">
                         <Button 
                            onClick={handleSubmitNote}
                            disabled={!newNote.trim() || isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md transition-all active:scale-95"
                        >
                            {isSubmitting ? <BrandLoader size="sm" className="mr-2" /> : <Send className="h-4 w-4 mr-2" />}
                            Enregistrer la Note
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Timeline */}
            <Card className="border-slate-200 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg">Fil d'actualité du client</CardTitle>
                    <CardDescription>
                        C'est ici que vous retrouvez tout l'historique des échanges.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">
                    {isLoading ? (
                        <div className="flex justify-center py-12">
                            <BrandLoader size="md" />
                        </div>
                    ) : interactions.length === 0 ? (
                        <div className="text-center py-12 text-slate-500">
                            <Clock className="h-12 w-12 mx-auto mb-3 opacity-20" />
                            <p className="font-medium italic">Aucun événement dans l'historique pour l'instant.</p>
                            <p className="text-xs">Les notes que vous ajoutez apparaîtront ici.</p>
                        </div>
                    ) : (
                        interactions.map((item, idx) => (
                            <div key={item.id} className="relative flex items-start gap-6 animate-in fade-in slide-in-from-left-4 duration-500" style={{ animationDelay: `${idx * 100}ms` }}>
                                {/* Timeline Dot/Icon */}
                                <div className="absolute left-0 mt-1 flex h-10 w-10 items-center justify-center rounded-full bg-white border-2 border-slate-100 shadow-sm z-10">
                                    <div className="text-slate-500">
                                        {getTypeIcon(item.type)}
                                    </div>
                                </div>

                                {/* Content Card */}
                                <div className="ml-12 flex-1 pt-1">
                                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 hover:border-indigo-100 transition-colors">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className="bg-white text-xs font-semibold uppercase tracking-wider text-slate-500">
                                                    {getTypeLabel(item.type)}
                                                </Badge>
                                            </div>
                                            <span className="text-xs text-slate-400 font-medium">
                                                {format(new Date(item.createdAt), 'iii d MMMM yyyy à HH:mm', { locale: fr })}
                                            </span>
                                        </div>
                                        <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                                            {item.content}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
