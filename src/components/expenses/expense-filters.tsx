'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useDebounce } from 'use-debounce';

export function ExpenseFilters() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Local state for immediate UI updates
    const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
    const [debouncedSearch] = useDebounce(searchTerm, 500);

    const type = searchParams.get('type') || 'all';
    const status = searchParams.get('status') || 'all';
    const month = searchParams.get('month') || new Date().getMonth() + 1;
    const year = searchParams.get('year') || new Date().getFullYear();

    // Effect for debounced search
    useEffect(() => {
        const params = new URLSearchParams(searchParams);
        if (debouncedSearch) {
            params.set('search', debouncedSearch);
        } else {
            params.delete('search');
        }
        router.push(`?${params.toString()}`);
    }, [debouncedSearch, router, searchParams]);

    const handleFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams);
        if (value && value !== 'all') {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        router.push(`?${params.toString()}`);
    };

    const clearFilters = () => {
        router.push('/expenses');
        setSearchTerm('');
    };

    const months = [
        { value: '1', label: 'Janvier' },
        { value: '2', label: 'Février' },
        { value: '3', label: 'Mars' },
        { value: '4', label: 'Avril' },
        { value: '5', label: 'Mai' },
        { value: '6', label: 'Juin' },
        { value: '7', label: 'Juillet' },
        { value: '8', label: 'Août' },
        { value: '9', label: 'Septembre' },
        { value: '10', label: 'Octobre' },
        { value: '11', label: 'Novembre' },
        { value: '12', label: 'Décembre' },
    ];

    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 6 }, (_, i) => (currentYear - 5 + i).toString()).reverse();

    return (
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between bg-white p-4 rounded-lg shadow-sm border border-slate-200">
            <div className="flex flex-1 items-center space-x-2">
                <div className="relative flex-1 md:max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                    <Input
                        placeholder="Rechercher une charge..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 bg-slate-50 border-slate-200 focus-visible:ring-blue-500"
                    />
                </div>

                {/* Filters Row 1 */}
                <Select value={type.toString()} onValueChange={(val) => handleFilterChange('type', val)}>
                    <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous les types</SelectItem>
                        <SelectItem value="water">💧 Eau</SelectItem>
                        <SelectItem value="electricity">⚡ Électricité</SelectItem>
                        <SelectItem value="rent">🏠 Loyer</SelectItem>
                        <SelectItem value="other">📦 Autre</SelectItem>
                    </SelectContent>
                </Select>

                <Select value={status.toString()} onValueChange={(val) => handleFilterChange('status', val)}>
                    <SelectTrigger className="w-[140px] bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Statut" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous statuts</SelectItem>
                        <SelectItem value="paid" className="text-emerald-600">Payé</SelectItem>
                        <SelectItem value="pending" className="text-amber-600">En attente</SelectItem>
                        <SelectItem value="overdue" className="text-red-600">En retard</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="flex items-center space-x-2">
                <Select value={month.toString()} onValueChange={(val) => handleFilterChange('month', val)}>
                    <SelectTrigger className="w-[110px] bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Mois" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Tous mois</SelectItem>
                        {months.map((m) => (
                            <SelectItem key={m.value} value={m.value}>
                                {m.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={year.toString()} onValueChange={(val) => handleFilterChange('year', val)}>
                    <SelectTrigger className="w-[90px] bg-slate-50 border-slate-200">
                        <SelectValue placeholder="Année" />
                    </SelectTrigger>
                    <SelectContent>
                        {years.map((y) => (
                            <SelectItem key={y} value={y}>
                                {y}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Button variant="ghost" size="icon" onClick={clearFilters} title="Réinitialiser">
                    <X className="h-4 w-4 text-slate-500 hover:text-red-500" />
                </Button>
            </div>
        </div>
    );
}
