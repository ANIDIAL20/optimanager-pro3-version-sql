'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, ChevronRight } from 'lucide-react';
import { differenceInDays, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { FrameReservation } from '../types/reservation.types';
import Link from 'next/link';

interface ExpiringReservationsWidgetProps {
  reservations: FrameReservation[];
  totalPending?: number; // Total active reservations
}

export function ExpiringReservationsWidget({
  reservations,
  totalPending,
}: ExpiringReservationsWidgetProps) {
  // Filter for pending reservations expiring in the next 3 days
  const expiringSoon = reservations
    .filter(r => r.status === 'PENDING')
    .map(r => ({
      ...r,
      daysLeft: differenceInDays(new Date(r.expiryDate), new Date()),
    }))
    .filter(r => r.daysLeft <= 3 && r.daysLeft >= 0)
    .sort((a, b) => a.daysLeft - b.daysLeft);
  
  if (expiringSoon.length === 0 && !totalPending) return null;
  
  return (
    <Card className="border-orange-100 shadow-sm overflow-hidden h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-2 bg-orange-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base font-bold text-orange-800">
            Réservations expirant bientôt
          </CardTitle>
          {expiringSoon.length > 0 && (
            <Badge variant="destructive" className="h-5 animate-pulse">
              {expiringSoon.length}
            </Badge>
          )}
        </div>
        <Clock className="h-4 w-4 text-orange-400" />
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        <div className="max-h-[350px] overflow-y-auto scrollbar-thin scrollbar-thumb-orange-100 flex-1">
          {expiringSoon.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground italic flex flex-col items-center gap-2">
              <Clock className="h-4 w-4 text-orange-200" />
              Aucun délai critique détecté.
            </div>
          ) : (
            <div className="flex flex-col divide-y divide-orange-50">
              {expiringSoon.map(res => (
                <div 
                  key={res.id} 
                  className="flex items-center justify-between p-3 hover:bg-orange-50/20 transition-all group"
                >
                  <div className="flex-1 min-w-0 pr-2 border-l-2 border-orange-500 pl-3">
                    <Link 
                      href={`/dashboard/clients/${res.clientId}?tab=reservations`}
                      className="font-bold text-sm text-slate-800 hover:text-orange-700 transition-colors block truncate"
                    >
                      {res.clientName}
                    </Link>
                    <p className="text-[10px] text-muted-foreground truncate uppercase font-medium mt-0.5">
                      {res.items.length} monture{res.items.length > 1 ? 's' : ''} • {res.items[0].productName}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge 
                      variant={res.daysLeft === 0 ? 'destructive' : 'secondary'}
                      className="text-[10px] px-1.5 h-5 flex items-center justify-center min-w-[35px] font-bold"
                    >
                      {res.daysLeft === 0
                        ? 'Auj.'
                        : `${res.daysLeft}j`}
                    </Badge>
                    <Link href={`/dashboard/clients/${res.clientId}?tab=sales&reservationId=${res.id}`}>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-orange-600 hover:text-orange-700 hover:bg-orange-50 transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {totalPending !== undefined && totalPending > 0 && (
          <div className="p-2 border-t bg-orange-50/10 text-[10px] text-muted-foreground flex justify-between items-center px-4">
            <span className="font-medium">{totalPending} réservation{totalPending > 1 ? 's' : ''} active{totalPending > 1 ? 's' : ''}</span>
            <Link href="/dashboard/clients" className="text-orange-700 font-bold hover:underline flex items-center gap-0.5">
              Tout voir <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
