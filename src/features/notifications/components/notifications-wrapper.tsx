"use client";

import { Bell, BellOff, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useNotifications } from "@/hooks/use-notifications";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export function NotificationsWrapper() {
  const [open, setOpen] = useState(false);
  const { notifications, isLoading, unreadCount, markAsRead, markAllAsRead, isMarkingAll } =
    useNotifications();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs",
                unreadCount > 0 && "animate-pulse"
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent className="w-80 p-0" align="end">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              disabled={isMarkingAll}
              className="text-xs text-muted-foreground h-auto p-0 hover:bg-transparent hover:text-blue-600 transition-colors"
              onClick={() => {
                markAllAsRead(undefined, {
                  onSuccess: () => toast.success("Toutes les notifications ont été marquées comme lues"),
                  onError: () => toast.error("Une erreur est survenue, veuillez réessayer")
                });
              }}
            >
              {isMarkingAll ? "Traitement..." : "Tout marquer comme lu"}
            </Button>
          )}
        </div>

        {/* Content */}
        <ScrollArea className="h-[360px]">
          {isLoading ? (
            <div className="space-y-1 p-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3 px-4 py-3 border-b border-transparent">
                  <Skeleton className="h-2 w-2 rounded-full mt-2 shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-2 w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : (notifications?.length || 0) === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-3 text-muted-foreground p-4">
              <div className="h-12 w-12 rounded-full bg-green-50 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-green-500" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">Tout est à jour !</p>
                <p className="text-xs">Aucune notification en attente</p>
              </div>
            </div>
          ) : (
            notifications?.map((notif: any) => (
              <div
                key={notif.id}
                onClick={() => !notif.isRead && markAsRead(notif.id)}
                className={`flex gap-3 px-4 py-3 border-b cursor-pointer hover:bg-muted/50 transition-colors ${
                  !notif.isRead ? "bg-blue-50/50 dark:bg-blue-900/10" : ""
                }`}
              >
                {/* Unread dot */}
                <div className="mt-1.5 flex-shrink-0">
                  <div
                    className={`h-2 w-2 rounded-full ${
                      !notif.isRead ? "bg-blue-500" : "bg-transparent"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium leading-snug">
                    {notif.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                    {notif.message}
                  </p>
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {formatDistanceToNow(new Date(notif.createdAt), {
                      addSuffix: true,
                      locale: fr,
                    })}
                  </p>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
