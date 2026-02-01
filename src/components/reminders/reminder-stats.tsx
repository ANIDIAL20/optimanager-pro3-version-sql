'use client';

import { useEffect, useState } from 'react';
import { SpotlightCard } from '@/components/ui/spotlight-card';
import { getReminderStats } from '@/app/actions/reminder-actions';
import { Bell, AlertCircle, Clock, CheckCircle } from 'lucide-react';

export function ReminderStats() {
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    urgent: 0,
    today: 0,
  });

  useEffect(() => {
    const loadStats = async () => {
      try {
        const data = await getReminderStats();
        setStats(data);
      } catch (error) {
        console.error('Failed to load stats', error);
      }
    };
    loadStats();
  }, []);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Rappels */}
      <SpotlightCard className="p-6" spotlightColor="rgba(59, 130, 246, 0.15)">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Total Rappels</p>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
              <Bell className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-bold text-slate-900">{stats.total}</h3>
            <p className="text-xs text-slate-500">{stats.pending} en attente</p>
          </div>
        </div>
      </SpotlightCard>

      {/* Urgent */}
      <SpotlightCard className="p-6" spotlightColor="rgba(239, 68, 68, 0.15)">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Urgent</p>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center">
              <AlertCircle className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-bold text-slate-900">{stats.urgent}</h3>
            <p className="text-xs text-slate-500">Nécessite action immédiate</p>
          </div>
        </div>
      </SpotlightCard>

      {/* Aujourd'hui */}
      <SpotlightCard className="p-6" spotlightColor="rgba(245, 158, 11, 0.15)">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Aujourd'hui</p>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Clock className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-bold text-slate-900">{stats.today}</h3>
            <p className="text-xs text-slate-500">Échéance ce jour</p>
          </div>
        </div>
      </SpotlightCard>

      {/* Traités */}
      <SpotlightCard className="p-6" spotlightColor="rgba(16, 185, 129, 0.15)">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Traités</p>
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
              <CheckCircle className="h-4 w-4 text-white" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-3xl font-bold text-slate-900">{stats.total - stats.pending}</h3>
            <p className="text-xs text-slate-500">Rappels complétés</p>
          </div>
        </div>
      </SpotlightCard>
    </div>
  );
}
