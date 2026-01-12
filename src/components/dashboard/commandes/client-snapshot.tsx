'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, TrendingDown, Calendar, Eye } from 'lucide-react';
import { getClientSnapshot } from '@/app/actions/clients-actions';
import type { Client } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

interface ClientSnapshotProps {
    client: Client;
}

export function ClientSnapshot({ client }: ClientSnapshotProps) {
    const [totalDebt, setTotalDebt] = React.useState(0);
    const [lastVisit, setLastVisit] = React.useState<string | null>(null);
    const [lastPrescription, setLastPrescription] = React.useState<any | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchClientData = async () => {
            setIsLoading(true);
            
            try {
                const result = await getClientSnapshot(client.id);

                if (result.success && result.data) {
                    setTotalDebt(result.data.totalDebt || 0);
                    setLastVisit(result.data.lastVisit ? result.data.lastVisit.toISOString() : null);
                    setLastPrescription(result.data.lastPrescription || null);
                } else {
                    console.error('Error fetching client snapshot:', result.error);
                }
            } catch (error) {
                console.error('Error fetching client data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchClientData();
    }, [client.id]);

    const formatPrescriptionSummary = (prescription: any) => {
        if (!prescription || !prescription.prescriptionData) return 'Non spécifiée';
        
        const data = prescription.prescriptionData;
        const od = data.od?.sphere ? `OD: ${data.od.sphere}` : '';
        const og = data.og?.sphere ? `OG: ${data.og.sphere}` : '';
        return [od, og].filter(Boolean).join(' | ') || 'Non spécifiée';
    };

    if (isLoading) {
        return (
            <Card className="bg-slate-50 border-slate-200 animate-pulse">
                <CardContent className="pt-6">
                    <div className="h-20 bg-slate-200 rounded"></div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="bg-slate-50 border-slate-200">
            <CardContent className="pt-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h3 className="text-lg font-semibold text-slate-900">
                            {client.prenom} {client.nom}
                        </h3>
                        <Badge variant="outline" className="mt-1 bg-green-50 text-green-700 border-green-200">
                            Actif
                        </Badge>
                    </div>
                    <Link href={`/dashboard/clients/${client.id}`}>
                        <Button variant="ghost" size="sm" className="gap-2">
                            Voir Profil
                            <ExternalLink className="h-4 w-4" />
                        </Button>
                    </Link>
                </div>

                <Separator className="my-4" />

                {/* Stats Grid */}
                <div className="grid grid-cols-3 gap-4">
                    {/* Finances */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-slate-600 mb-1">
                            <TrendingDown className="h-4 w-4" />
                            <span className="text-xs font-medium">Reste à payer</span>
                        </div>
                        <p className={`text-lg font-bold ${totalDebt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {totalDebt.toFixed(2)} MAD
                        </p>
                    </div>

                    {/* Last Visit */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-slate-600 mb-1">
                            <Calendar className="h-4 w-4" />
                            <span className="text-xs font-medium">Dernière visite</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-900">
                            {lastVisit ? format(new Date(lastVisit), 'dd MMM yyyy', { locale: fr }) : 'Aucune'}
                        </p>
                    </div>

                    {/* Last Prescription */}
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2 text-slate-600 mb-1">
                            <Eye className="h-4 w-4" />
                            <span className="text-xs font-medium">Dernière ordonnance</span>
                        </div>
                        <p className="text-xs font-medium text-slate-700 truncate">
                            {lastPrescription ? formatPrescriptionSummary(lastPrescription) : 'Aucune'}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
