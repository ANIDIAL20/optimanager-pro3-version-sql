'use client';

import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Activity, ShieldAlert, User, Database, Settings } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface LogEntry {
    id: string;
    timestamp: string;
    action: string;
    targetUid: string;
    adminEmail: string;
    details: string;
}

export function SystemLogsTable({ logs }: { logs: LogEntry[] }) {
    if (!logs || logs.length === 0) {
        return <div className="p-4 text-sm text-muted-foreground text-center">Aucune activité récente.</div>;
    }

    return (
        <ScrollArea className="h-[300px] w-full rounded-md border p-4 bg-white">
            <div className="space-y-4">
                {logs.map((log) => (
                    <div key={log.id} className="flex items-start gap-4 text-sm border-b pb-3 last:border-0 last:pb-0">
                        <div className={`mt-1 h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${log.action.includes('DELETE') ? 'bg-red-100 text-red-600' :
                                log.action.includes('UPDATE') ? 'bg-blue-100 text-blue-600' :
                                    'bg-green-100 text-green-600'
                            }`}>
                            {log.action.includes('DELETE') ? <ShieldAlert size={14} /> :
                                log.action.includes('BANNER') ? <Settings size={14} /> :
                                    <Activity size={14} />
                            }
                        </div>
                        <div className="flex-1 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-slate-800">{log.action}</span>
                                <span className="text-xs text-muted-foreground">
                                    {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true, locale: fr })}
                                </span>
                            </div>
                            <p className="text-muted-foreground">{log.details}</p>
                            <p className="text-xs text-slate-400">Par: {log.adminEmail}</p>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
