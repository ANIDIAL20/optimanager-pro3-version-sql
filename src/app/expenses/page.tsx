export const dynamic = "force-dynamic";
import { Suspense } from 'react';
import { getExpenses, getExpenseStats } from '@/lib/expenses/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ExpenseDialog } from '@/components/expenses/expense-dialog';
import { ExpenseFilters } from '@/components/expenses/expense-filters';
import { ExpenseActions } from '@/components/expenses/expense-actions';
import { Banknote, Clock, AlertTriangle, TrendingUp } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ExpenseFilters as ExpenseFiltersType, ExpenseType, ExpenseStatus } from '@/types/expense';

interface ExpensesPageProps {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ExpensesPage({ searchParams }: ExpensesPageProps) {
    const params = await searchParams;
    // Parse search params into filters
    const filters: ExpenseFiltersType = {
        search: (params.search as string) || undefined,
        type: (params.type as string) !== 'all' ? (params.type as ExpenseType) : undefined,
        status: (params.status as string) !== 'all' ? (params.status as ExpenseStatus) : undefined,
        // month/year handling is a bit complex due to period logic, 
        // for now let's reuse 'period' if we construct it, or just pass start/end dates.
        // But the API might expect dates or period string. 
        // Let's see how ExpenseFilters sets them.
        // It sets 'month' and 'year' params.
    };

    const month = params.month ? parseInt(params.month as string) : undefined;
    const year = params.year ? parseInt(params.year as string) : undefined;

    if (month && year) {
        const startDate = new Date(year, month - 1, 1);
        const endDate = new Date(year, month, 0);
        endDate.setHours(23, 59, 59, 999);
        filters.dateRange = { from: startDate, to: endDate };
    }

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Gestion des Charges</h2>
                    <p className="text-muted-foreground">
                        Suivez et gérez les dépenses de votre magasin.
                    </p>
                </div>
                <div className="flex items-center space-x-2">
                    <ExpenseDialog />
                </div>
            </div>

            <Suspense fallback={<StatsSkeleton />}>
                <ExpenseStatsWrapper />
            </Suspense>

            <div className="grid gap-4 md:grid-cols-1">
                <Card className="shadow-sm border-slate-200">
                    <CardHeader>
                        <CardTitle>Liste des Charges</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <ExpenseFilters />
                        <Suspense fallback={<TableSkeleton />} key={JSON.stringify(params)}>
                            <ExpenseListWrapper filters={filters} />
                        </Suspense>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

async function ExpenseStatsWrapper() {
    const today = new Date();
    const statsRes = await getExpenseStats(today.getMonth() + 1, today.getFullYear());
    const stats = statsRes.success ? statsRes.data : null;

    if (!stats) return null;

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between space-x-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Mensuel</p>
                            <h3 className="text-2xl font-bold">{stats.totalAmount.toLocaleString('fr-FR')} MAD</h3>
                        </div>
                        <div className="p-2 bg-blue-50 rounded-lg">
                            <Banknote className="h-6 w-6 text-blue-600" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-500 shadow-sm">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between space-x-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500">En Attente</p>
                            <h3 className="text-2xl font-bold">{stats.pendingAmount.toLocaleString('fr-FR')} MAD</h3>
                        </div>
                        <div className="p-2 bg-amber-50 rounded-lg">
                            <Clock className="h-6 w-6 text-amber-600" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 shadow-sm">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between space-x-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Retards</p>
                            <h3 className="text-2xl font-bold">{stats.overdueAmount.toLocaleString('fr-FR')} MAD</h3>
                        </div>
                        <div className="p-2 bg-red-50 rounded-lg">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                <CardContent className="p-6">
                    <div className="flex items-center justify-between space-x-4">
                        <div>
                            <p className="text-sm font-medium text-slate-500">Transactions</p>
                            <h3 className="text-2xl font-bold">{stats.count}</h3>
                        </div>
                        <div className="p-2 bg-emerald-50 rounded-lg">
                            <TrendingUp className="h-6 w-6 text-emerald-600" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

async function ExpenseListWrapper({ filters }: { filters: ExpenseFiltersType }) {
    const expensesRes = await getExpenses(filters);
    const expenses = expensesRes.success ? expensesRes.data : [];

    if (!expenses || expenses.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="p-4 bg-slate-50 rounded-full mb-4">
                    <Banknote className="h-10 w-10 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">Aucune charge trouvée</h3>
                <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1">
                    Aucune dépense ne correspond à vos critères de recherche.
                </p>
            </div>
        );
    }

    return (
        <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
                <thead>
                    <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Titre</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Catégorie</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Statut</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Montant</th>
                        <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Date</th>
                        <th className="h-12 px-4 text-right align-middle font-medium text-muted-foreground">Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {expenses.map((expense: any) => (
                        <tr key={expense.id} className="border-b transition-colors hover:bg-muted/50">
                            <td className="p-4 align-middle font-medium">{expense.title}</td>
                            <td className="p-4 align-middle capitalize">{expense.category}</td>
                            <td className="p-4 align-middle">
                                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold
                                    ${expense.status === 'paid' ? 'bg-emerald-100 text-emerald-700' :
                                        expense.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                            'bg-amber-100 text-amber-700'}`}>
                                    {expense.status === 'paid' ? 'Payé' : expense.status === 'overdue' ? 'Retard' : 'En attente'}
                                </span>
                            </td>
                            <td className="p-4 align-middle font-semibold">{expense.amount.toLocaleString('fr-FR')} {expense.currency}</td>
                            <td className="p-4 align-middle text-slate-500">
                                {expense.createdAt ? new Date(expense.createdAt).toLocaleDateString('fr-FR') : '-'}
                            </td>
                            <td className="p-4 align-middle text-right">
                                <ExpenseActions expense={expense} />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function StatsSkeleton() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[...Array(4)].map((_, i) => (
                <Card key={i} className="shadow-sm">
                    <CardContent className="p-6">
                        <Skeleton className="h-4 w-24 mb-2" />
                        <Skeleton className="h-8 w-32" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

function TableSkeleton() {
    return (
        <div className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
        </div>
    );
}
