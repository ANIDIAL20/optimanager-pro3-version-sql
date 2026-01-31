import { Metadata } from 'next';
import { ReminderList } from '@/components/reminders/reminder-list';
import { ReminderStats } from '@/components/reminders/reminder-stats';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { checkDeadlines } from '@/app/actions/reminder-actions';

export const metadata: Metadata = {
  title: 'Rappels & Notifications | OptiManager Pro',
  description: 'Gérez vos rappels, échéances et notifications.',
};

import { CreateReminderDialog } from '@/components/reminders/create-reminder-dialog';

export default async function RemindersPage() {
  // Trigger deadline check on page load (server-side)
  // In a real production app, this would be a cron job
  await checkDeadlines();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Rappels & Notifications</h2>
          <p className="text-muted-foreground">
            Suivi intelligent de vos tâches, échéances et alertes.
          </p>
        </div>
        <div className="flex items-center space-x-2">
           <CreateReminderDialog />
        </div>
      </div>
      
      <ReminderStats />
      
      <Separator className="my-4" />
      
      <ReminderList />
    </div>
  );
}
