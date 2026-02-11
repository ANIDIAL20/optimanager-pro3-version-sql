import { Metadata } from 'next';
import { ReminderList } from '@/components/reminders/reminder-list';
import { ReminderStats } from '@/components/reminders/reminder-stats';
import { Bell } from 'lucide-react';
import { checkDeadlines, getReminderStats } from '@/app/actions/reminder-actions';
import { CreateReminderDialog } from '@/components/reminders/create-reminder-dialog';

export const metadata: Metadata = {
  title: 'Rappels & Notifications | OptiManager Pro',
  description: 'Gérez vos rappels, échéances et notifications.',
};

export default async function RemindersPage() {
  // Trigger deadline check on page load (server-side)
  // In a real production app, this would be a cron job
  await checkDeadlines(false);
  const stats = await getReminderStats();

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header - Matches Standardized theme */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600 shadow-sm border border-amber-100">
            <Bell className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              Rappels & Notifications
            </h1>
            <p className="text-slate-500 mt-1">
              Suivi intelligent de vos tâches, échéances et alertes.
            </p>
          </div>
        </div>

        <CreateReminderDialog />
      </div>
      
      {/* Stats Cards */}
      <ReminderStats stats={stats} />
      
      {/* Reminder List */}
      <ReminderList />
    </div>
  );
}
