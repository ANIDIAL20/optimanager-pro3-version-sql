'use client';

import * as React from 'react';
import { Bell, Check, Clock as ClockIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Notification } from '@/db/schema';

interface NotificationsPopoverProps {
  notifications: Notification[];
}

export function NotificationsPopover({ notifications }: NotificationsPopoverProps) {
  const unreadCount = notifications.filter(n => !n.isRead).length;
  
  const getPriorityColor = (priority: string) => {
    if (priority === 'HIGH') return 'text-red-600 bg-red-50 border-red-100';
    if (priority === 'MEDIUM') return 'text-orange-600 bg-orange-50 border-orange-100';
    return 'text-slate-600 bg-slate-50 border-slate-100';
  };
  
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-slate-100 transition-colors">
          <Bell className="h-5 w-5 text-slate-600" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px] font-bold border-2 border-white"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0 shadow-xl border-slate-200" align="end">
        <div className="flex items-center justify-between p-4 border-b bg-slate-50/50">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none px-1.5 py-0">
                {unreadCount} nlles
              </Badge>
            )}
          </h3>
          <Button variant="ghost" size="sm" className="text-[11px] h-7 px-2 hover:text-blue-600">
            Tout lire
          </Button>
        </div>
        
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                 <Bell className="h-6 w-6 text-slate-300" />
              </div>
              <p className="text-sm font-medium text-slate-500">Aucune notification</p>
              <p className="text-xs text-slate-400 mt-1">Vous êtes à jour !</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {notifications.map(notif => (
                <div
                  key={notif.id}
                  className={cn(
                    "p-4 transition-colors hover:bg-slate-50 relative group",
                    !notif.isRead ? "bg-blue-50/30" : ""
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "mt-1 h-2 w-2 rounded-full flex-shrink-0",
                      !notif.isRead ? "bg-blue-500" : "bg-transparent"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={cn(
                          "text-[10px] font-bold uppercase tracking-wider px-1.5 rounded border",
                          getPriorityColor(notif.priority)
                        )}>
                          {notif.priority === 'HIGH' ? 'Urgent' : notif.priority === 'MEDIUM' ? 'Info' : 'Standard'}
                        </span>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <ClockIcon className="h-3 w-3" />
                          {formatDistanceToNow(new Date(notif.createdAt), {
                            addSuffix: true,
                            locale: fr,
                          })}
                        </span>
                      </div>
                      <p className="text-sm font-bold text-slate-900 leading-tight mb-1">
                        {notif.title}
                      </p>
                      <p className="text-xs text-slate-600 leading-snug">
                        {notif.message}
                      </p>
                    </div>
                  </div>
                  {!notif.isRead && (
                    <button className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-white rounded border shadow-sm text-blue-600">
                        <Check className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t bg-slate-50/30 text-center">
           <Button variant="ghost" size="sm" className="w-full text-xs text-slate-500 hover:text-blue-600">
              Voir tout l'historique
           </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
