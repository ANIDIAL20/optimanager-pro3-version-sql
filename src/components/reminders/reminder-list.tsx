'use client';

import { useState, useEffect } from 'react';
import { ReminderCard } from './reminder-card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { getReminders } from '@/app/actions/reminder-actions';
import { FilterX, Search, Calendar, DollarSign, ChevronDown, ChevronUp } from 'lucide-react';
import { BrandLoader } from '@/components/ui/loader-brand';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

export function ReminderList() {
  const { toast } = useToast();
  const [reminders, setReminders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [priorityFilter, setPriorityFilter] = useState('all');

  // New filters
  const [search, setSearch] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchReminders = async () => {
    setIsLoading(true);
    try {
      // If status is 'today', we actually want 'pending' reminders for today
      const mappedStatus = statusFilter === 'today' ? 'pending' : statusFilter;

      const filters: any = {
        status: mappedStatus,
        search: search || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      };

      if (priorityFilter !== 'all') {
        filters.priority = priorityFilter;
      }

      const data = await getReminders(filters);
      setReminders(data);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Impossible de charger les rappels.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (statusFilter === 'today') {
      const today = new Date();
      const dateStr = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-' + String(today.getDate()).padStart(2, '0');
      setStartDate(dateStr);
      setEndDate(dateStr);
    } else {
      // Clear auto-dates when switching to other tabs like 'pending' or 'all'
      // to avoid filtering by "today" unintentionally
      setStartDate('');
      setEndDate('');
    }

    const timer = setTimeout(() => {
      fetchReminders();
    }, 500); // Debounce search
    return () => clearTimeout(timer);
  }, [statusFilter, priorityFilter, search, startDate, endDate]);

  const activeFiltersCount = [search, startDate, endDate].filter(v => v !== '' && v !== undefined).length + (priorityFilter !== 'all' ? 1 : 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <Tabs defaultValue="pending" value={statusFilter} onValueChange={setStatusFilter} className="w-full sm:w-auto">
            <TabsList>
              <TabsTrigger value="pending">En attente</TabsTrigger>
              <TabsTrigger value="today">Aujourd'hui</TabsTrigger>
              <TabsTrigger value="completed">Terminés</TabsTrigger>
              <TabsTrigger value="all">Tous</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Chercher (Client, titre...)"
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowFilters(!showFilters)}
            >
              Filtres
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 px-1.5 h-5 min-w-5 flex items-center justify-center">
                  {activeFiltersCount}
                </Badge>
              )}
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        {showFilters && (
          <div className="p-4 border rounded-xl bg-slate-50/50 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date Début
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Date Fin
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-500 flex items-center gap-1">
                Priorité
              </label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Toutes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes priorités</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="important">Important</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="info">Info</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <BrandLoader size="md" className="mx-auto text-gray-400" />
        </div>
      ) : reminders.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
          <FilterX className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <h3 className="text-lg font-medium text-gray-900">Aucun rappel trouvé</h3>
          <p className="text-gray-500 max-w-sm mx-auto mt-1">
            Il n'y a aucun rappel correspondant à vos critères actuels.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => {
            setStatusFilter('pending');
            setPriorityFilter('all');
            setSearch('');
            setStartDate('');
            setEndDate('');
          }}>
            Réinitialiser les filtres
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {reminders.map((reminder) => (
            <ReminderCard
              key={reminder.id}
              reminder={reminder}
              onUpdate={fetchReminders}
            />
          ))}
        </div>
      )}
    </div>
  );
}
