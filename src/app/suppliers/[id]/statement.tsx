// @ts-nocheck
'use client';

import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import {
  Download,
  ChevronLeft,
  ChevronRight,
  FileText,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSupplierStatement } from '@/hooks/use-supplier-statement';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TransactionActions } from '@/components/suppliers/transaction-actions';
import type {
  SupplierStatementOrder,
  SupplierStatementPayment,
  SupplierStatementResult,
} from '@/app/actions/supplier-statement';

interface SupplierCreditRecord {
  id: string;
  createdAt: string | Date;
  reference?: string | null;
  amount: number | string;
  remainingAmount?: number | string;
  notes?: string | null;
  status?: string | null;
}

interface StatementProps {
  supplierId: string;
  credits?: SupplierCreditRecord[];
}

type StatementTransaction = {
  id: string;
  date: Date;
  type: 'ACHAT' | 'PAIEMENT' | 'AVOIR';
  reference: string;
  debit: number;
  credit: number;
  balance: number;
  items?: SupplierStatementOrder['items'];
  paymentStatus?: string;
  description?: string;
  status?: string | null;
  isAllocated?: boolean;
};

export function SupplierStatement({ supplierId, credits = [] }: StatementProps) {
  const { data, isLoading, error } = useSupplierStatement(supplierId);
  const statementData = data as SupplierStatementResult | undefined;
  const [currentPage, setCurrentPage] = React.useState(1);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const itemsPerPage = 50;

  const transactions = React.useMemo(() => {
    if (!statementData) return [] as StatementTransaction[];

    const combined: Omit<StatementTransaction, 'balance'>[] = [
      ...statementData.orders.map((o: SupplierStatementOrder) => ({
        id: `order-${o.id}`,
        date: new Date(o.orderDate || Date.now()),
        type: 'ACHAT' as const,
        reference: o.reference,
        debit: Number(o.totalAmount || 0),
        credit: 0,
        items: o.items,
        paymentStatus: o.status,
      })),
      ...statementData.payments.map((p: SupplierStatementPayment) => ({
        id: `payment-${p.id}`,
        date: new Date(p.paymentDate || Date.now()),
        type: 'PAIEMENT' as const,
        reference: p.reference || '-',
        debit: 0,
        credit: Number(p.amount || 0),
        isAllocated: p.isAllocated,
      })),
      ...credits.map((c) => ({
        id: `credit-${c.id}`,
        date: new Date(c.createdAt),
        type: 'AVOIR' as const,
        reference: c.reference || `AV-${c.id.slice(0, 8)}`,
        debit: 0,
        credit: Math.max(0, Number(c.amount || 0) - Number(c.remainingAmount || 0)),
        description: c.notes || 'Avoir fournisseur',
        status: c.status,
      })),
    ];

    combined.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0;
    const withBalance: StatementTransaction[] = combined.map((transaction) => {
      runningBalance += transaction.debit - transaction.credit;
      return { ...transaction, balance: runningBalance };
    });

    return withBalance.reverse();
  }, [statementData, credits]);

  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportPDF = () => {
    const doc = jsPDF();
    doc.text(`Releve Fournisseur - ID: ${supplierId}`, 14, 15);

    const tableData = transactions.map((t) => [
      format(t.date, 'dd/MM/yyyy'),
      t.type,
      t.reference,
      t.debit.toFixed(2),
      t.credit.toFixed(2),
      t.balance.toFixed(2),
    ]);

    autoTable(doc, {
      head: [['Date', 'Type', 'Reference', 'Debit', 'Credit', 'Solde']],
      body: tableData,
      startY: 20,
    });

    const sanitize = (str: string) => {
      if (!str) return '';
      return str.replace(/[^a-zA-Z0-9\u00C0-\u017F\u0600-\u06FF-]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
    };

    const safeSupplierName = sanitize(`Fournisseur_${supplierId}`);
    doc.save(`Releve_${supplierId}_${safeSupplierName}.pdf`);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement des donnees...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Une erreur est survenue lors du chargement des donnees.</div>;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Releve de Compte Detaille
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={exportPDF}>
              <Download className="h-4 w-4 mr-2" />
              Exporter PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Debit (Achat)</TableHead>
                <TableHead className="text-right">Credit (Paiement)</TableHead>
                <TableHead className="text-right">Solde</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucune transaction trouvee.</TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((t) => (
                  <React.Fragment key={t.id}>
                    <TableRow
                      className={cn(
                        'hover:bg-muted/50 transition-colors',
                        t.type === 'ACHAT' ? 'cursor-pointer' : ''
                      )}
                      onClick={() => {
                        if (t.type === 'ACHAT') setExpanded((p) => ({ ...p, [t.id]: !p[t.id] }));
                      }}
                    >
                      <TableCell>{format(t.date, 'dd MMMM yyyy', { locale: fr })}</TableCell>
                      <TableCell>
                        <Badge
                          className={cn(
                            'font-bold',
                            t.type === 'ACHAT' ? 'bg-red-100 text-red-700' :
                            t.type === 'PAIEMENT' ? 'bg-emerald-100 text-emerald-700' :
                            'bg-indigo-100 text-indigo-700'
                          )}
                          variant="outline"
                        >
                          {t.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{t.reference}</TableCell>
                      <TableCell>
                        {t.type === 'ACHAT' && t.paymentStatus ? (
                          <Badge variant={
                            t.paymentStatus === 'paid' ? 'default' :
                            t.paymentStatus === 'partial' ? 'secondary' : 'destructive'
                          }>
                            {t.paymentStatus === 'paid' ? 'Solde' :
                             t.paymentStatus === 'partial' ? 'Partiel' : 'Impaye'}
                          </Badge>
                        ) : (
                          t.type === 'AVOIR' ? (
                            <Badge className={cn(
                              t.status === 'closed' ? 'bg-slate-100 text-slate-600' :
                              t.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                              'bg-green-100 text-green-700'
                            )}>
                              {t.status === 'open' ? 'Ouvert' : t.status === 'partial' ? 'Partiel' : 'Cloture'}
                            </Badge>
                          ) : (
                            t.type === 'PAIEMENT' ? (
                              <Badge variant="outline" className={cn(t.isAllocated ? 'border-emerald-200 text-emerald-700 bg-emerald-50' : 'border-amber-200 text-amber-700 bg-amber-50')}>
                                {t.isAllocated ? 'Paiement alloue' : 'Paiement global'}
                              </Badge>
                            ) : null
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-right text-red-500">{t.debit > 0 ? `+${t.debit.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="text-right text-green-500">{t.credit > 0 ? `-${t.credit.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className={cn(
                        'text-right font-bold',
                        t.balance > 0 ? 'text-red-600' : 'text-green-600'
                      )}>
                        {t.balance.toFixed(2)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <TransactionActions
                          transaction={{
                            ...t,
                            amount: t.type === 'ACHAT' ? t.debit : t.credit,
                            supplierId,
                          }}
                        />
                      </TableCell>
                    </TableRow>

                    {expanded[t.id] && t.items && t.items.map((item, i) => (
                      <TableRow key={`${t.id}-item-${i}`} className="bg-muted/10 text-xs hover:bg-muted/20">
                        <TableCell colSpan={2} />
                        <TableCell colSpan={2} className="pl-6 text-muted-foreground border-l-2 border-primary/20">
                          &rarr; {item.label}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.quantity} x {Number(item.unitPrice).toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {Number(item.total).toFixed(2)} DH
                        </TableCell>
                        <TableCell colSpan={2} />
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))
              )}
            </TableBody>
          </Table>

          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <span className="text-sm text-muted-foreground">
                Page {currentPage} sur {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
