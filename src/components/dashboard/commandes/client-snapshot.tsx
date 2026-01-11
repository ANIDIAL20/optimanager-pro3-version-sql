'use client';

import * as React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ExternalLink, TrendingDown, Calendar, Eye } from 'lucide-react';
import { useFirestore, useFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import type { Client, Sale, Prescription } from '@/lib/types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';

interface ClientSnapshotProps {
    client: Client;
}

export function ClientSnapshot({ client }: ClientSnapshotProps) {
    const [totalDebt, setTotalDebt] = React.useState(0);
    const [lastVisit, setLastVisit] = React.useState<string | null>(null);
    const [lastPrescription, setLastPrescription] = React.useState<Prescription | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const firestore = useFirestore();
    const { user } = useFirebase();

    React.useEffect(() => {
        const fetchClientData = async () => {
            if (!firestore || !user) return;

            try {
                // Fetch last order/sale for last visit date and debt
                const salesRef = collection(firestore, `stores/${user.uid}/sales`);
                const salesQuery = query(
                    salesRef,
                    where('clientId', '==', client.id),
                    orderBy('date', 'desc'),
                    limit(10)
                );
                const salesSnap = await getDocs(salesQuery);

                let debt = 0;
                let latestVisit: string | null = null;

                salesSnap.docs.forEach(doc => {
                    const sale = doc.data() as Sale;
                    debt += (sale.resteAPayer || 0);
                    if (!latestVisit && sale.date) {
                        latestVisit = sale.date;
                    }
                });

                setTotalDebt(debt);
                setLastVisit(latestVisit);

                // Fetch last prescription
                const prescriptionsRef = collection(firestore, `stores/${user.uid}/prescriptions`);
                const prescriptionsQuery = query(
                    prescriptionsRef,
                    where('clientId', '==', client.id),
                    orderBy('date', 'desc'),
                    limit(1)
                );
                const prescriptionsSnap = await getDocs(prescriptionsQuery);

                if (!prescriptionsSnap.empty) {
                    setLastPrescription({ id: prescriptionsSnap.docs[0].id, ...prescriptionsSnap.docs[0].data() } as Prescription);
                }
            } catch (error) {
                console.error('Error fetching client data:', error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchClientData();
    }, [firestore, user, client.id]);

    const formatPrescriptionSummary = (prescription: Prescription) => {
        const od = prescription.odSphere ? `OD: ${prescription.odSphere}` : '';
        const og = prescription.ogSphere ? `OG: ${prescription.ogSphere}` : '';
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
                    <Link href={`/clients/${client.id}`}>
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
