'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Phone, Mail, Calendar, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface InteractionHistoryProps {
    clientId: string;
}

export function InteractionHistory({ clientId }: InteractionHistoryProps) {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 rounded-lg">
                        <MessageSquare className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                        <CardTitle>Journal de Bord</CardTitle>
                        <CardDescription>
                            Historique des interactions et communications avec le client
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-center py-12 text-muted-foreground">
                    <MessageSquare className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                    <p className="text-sm font-medium">Aucune interaction enregistrée</p>
                    <p className="text-xs mt-1">Les interactions futures apparaîtront ici</p>
                </div>
            </CardContent>
        </Card>
    );
}
