'use client';

import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Phone, MessageCircle, Edit, User, Calendar } from 'lucide-react';
import Link from 'next/link';
import type { Client } from '@/lib/types';
import { cn } from '@/lib/utils';

interface ClientHeaderProps {
    client: Client;
    clientId: string;
}

export function ClientHeader({ client, clientId }: ClientHeaderProps) {
    // Calculate age from date of birth
    const age = React.useMemo(() => {
        if (!client.dateNaissance) return null;
        const birthDate = new Date(client.dateNaissance);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const monthDiff = today.getMonth() - birthDate.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }, [client.dateNaissance]);

    const initials = `${client.prenom?.charAt(0) || ''}${client.nom?.charAt(0) || ''}`.toUpperCase();
    const isActive = true; // You can add logic to determine active status

    const handleCall = () => {
        if (client.telephone1) {
            window.location.href = `tel:${client.telephone1}`;
        }
    };

    const handleWhatsApp = () => {
        if (client.telephone1) {
            const phone = client.telephone1.replace(/\D/g, '');
            window.open(`https://wa.me/${phone}`, '_blank');
        }
    };

    return (
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                {/* Left: Avatar + Name + Age */}
                <div className="flex items-center gap-4">
                    <Avatar className="h-20 w-20 border-4 border-white shadow-lg ring-2 ring-blue-100">
                        <AvatarImage src={client.photoUrl} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-2xl font-bold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                        <h1 className="text-3xl font-bold text-slate-900">
                            {client.prenom} {client.nom}
                        </h1>
                        <div className="flex items-center gap-2 text-sm text-slate-600">
                            {client.sexe && (
                                <Badge variant="outline" className="bg-slate-50">
                                    {client.sexe === 'M' ? 'Homme' : 'Femme'}
                                </Badge>
                            )}
                            {age && (
                                <div className="flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    <span>{age} ans</span>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Middle: Tags/Status */}
                <div className="flex flex-wrap items-center gap-2">
                    <Badge
                        variant="outline"
                        className={cn(
                            "px-3 py-1",
                            isActive
                                ? "bg-green-50 text-green-700 border-green-200"
                                : "bg-slate-50 text-slate-500 border-slate-200"
                        )}
                    >
                        {isActive ? 'Actif' : 'Archivé'}
                    </Badge>

                    {/* Visual tags for prescription info */}
                    {client.hasProgressiveLenses && (
                        <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 px-3 py-1">
                            Verres Progressifs
                        </Badge>
                    )}
                    {client.wearContactLenses && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 px-3 py-1">
                            Lentilles
                        </Badge>
                    )}
                </div>

                {/* Right: Quick Actions */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCall}
                        disabled={!client.telephone1}
                        className="gap-2"
                    >
                        <Phone className="h-4 w-4" />
                        <span className="hidden sm:inline">Appeler</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleWhatsApp}
                        disabled={!client.telephone1}
                        className="gap-2"
                    >
                        <MessageCircle className="h-4 w-4" />
                        <span className="hidden sm:inline">WhatsApp</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        asChild
                        className="gap-2"
                    >
                        <Link href={`/clients/${clientId}/edit`}>
                            <Edit className="h-4 w-4" />
                            <span className="hidden sm:inline">Modifier</span>
                        </Link>
                    </Button>
                </div>
            </div>
        </div>
    );
}
