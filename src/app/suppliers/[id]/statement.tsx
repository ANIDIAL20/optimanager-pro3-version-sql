// @ts-nocheck
'use client';

import React from 'react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { 
  ArrowUpCircle, 
  ArrowDownCircle, 
  Wallet, 
  FileText, 
  Download,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useSupplierStatement } from '@/hooks/use-supplier-statement';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { TransactionActions } from '@/components/suppliers/transaction-actions';

interface StatementProps {
  supplierId: string;
  credits?: any[];
}

export function SupplierStatement({ supplierId }: StatementProps) {
  const { data, isLoading, error } = useSupplierStatement(supplierId);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});
  const itemsPerPage = 50;

  // 1. Fusionner et trier les transactions
  const transactions = React.useMemo(() => {
    if (!data) return [];
    
    const combined = [
      ...data.orders.map((o: any) => ({
        id: `order-${o.id}`,
        date: new Date(o.orderDate),
        type: 'ACHAT',
        reference: o.reference,
        debit: Number(o.totalAmount),
        credit: 0,
        items: o.items,
        paymentStatus: o.status
      })),
      ...data.payments.map(p => ({
        id: `payment-${p.id}`,
        date: new Date(p.paymentDate),
        type: 'PAIEMENT',
        reference: p.reference || '-',
        debit: 0,
        credit: Number(p.amount)
      })),
      ...(credits || []).map(c => ({
        id: `credit-${c.id}`,
        date: new Date(c.createdAt),
        type: 'AVOIR',
        reference: c.reference || `AV-${c.id.slice(0, 8)}`,
        debit: 0,
        credit: Number(c.amount),
        description: c.notes || 'Avoir fournisseur',
        status: c.status
      }))
    ];

    // Tri chronologique (ancien -> nouveau) pour calculer le solde progressif
    combined.sort((a, b) => a.date.getTime() - b.date.getTime());

    let runningBalance = 0;
    const withBalance = combined.map(t => {
      runningBalance += t.debit - t.credit;
      return { ...t, balance: runningBalance };
    });

    // Tri inverse pour l'affichage (récent -> ancien)
    return withBalance.reverse();
  }, [data]);

  // Pagination
  const totalPages = Math.ceil(transactions.length / itemsPerPage);
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const exportPDF = () => {
    const doc = jsPDF();
    doc.text(`Relevé Fournisseur - ID: ${supplierId}`, 14, 15);
    
    const tableData = transactions.map(t => [
      format(t.date, 'dd/MM/yyyy'),
      t.type,
      t.reference,
      t.debit.toFixed(2),
      t.credit.toFixed(2),
      t.balance.toFixed(2)
    ]);

    autoTable(doc, {
      head: [['Date', 'Type', 'Référence', 'Débit', 'Crédit', 'Solde']],
      body: tableData,
      startY: 20
    });
    
    const sanitize = (str: string) => {
      if (!str) return '';
      return str.replace(/[^a-zA-Z0-9\u00C0-\u017F\u0600-\u06FF-]/g, '_')
                .replace(/_+/g, '_')
                .replace(/^_|_$/g, '');
    };
    
    const supplierName = data?.summary?.supplierName || data?.summary?.name || data?.fournisseur?.nom || `Fournisseur_${supplierId}`;
    const safeSupplierName = sanitize(supplierName);

    doc.save(`Releve_${supplierId}_${safeSupplierName}.pdf`);
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground animate-pulse">Chargement des données...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Une erreur est survenue lors du chargement des données.</div>;

  const summary = data?.summary;

  return (
    <div className="space-y-6">
      {/* 📜 Transactions Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Relevé de Compte Détaillé
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
                <TableHead>Référence</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="text-right">Débit (Achat)</TableHead>
                <TableHead className="text-right">Crédit (Paiement)</TableHead>
                <TableHead className="text-right">Solde</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedTransactions.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Aucune transaction trouvée.</TableCell>
                </TableRow>
              ) : (
                paginatedTransactions.map((t: any) => (
                  <React.Fragment key={t.id}>
                    <TableRow 
                      className={cn(
                        "hover:bg-muted/50 transition-colors", 
                        t.type === 'ACHAT' ? "cursor-pointer" : ""
                      )}
                      onClick={() => {
                        if (t.type === 'ACHAT') setExpanded(p => ({ ...p, [t.id]: !p[t.id] }));
                      }}
                    >
                      <TableCell>{format(t.date, 'dd MMMM yyyy', { locale: fr })}</TableCell>
                      <TableCell>
                        <Badge 
                          className={cn(
                            "font-bold",
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
                            t.paymentStatus === 'paid'    ? 'default'      :
                            t.paymentStatus === 'partial' ? 'secondary'    : 'destructive'
                          }>
                            {t.paymentStatus === 'paid'    ? '✅ Soldé'    :
                             t.paymentStatus === 'partial' ? '⏳ Partiel'  : '🔴 Impayé'}
                          </Badge>
                        ) : (
                          t.type === 'AVOIR' ? (
                            <Badge className={cn(
                              t.status === 'closed' ? 'bg-slate-100 text-slate-600' : 
                              t.status === 'partial' ? 'bg-amber-100 text-amber-700' : 
                              'bg-green-100 text-green-700'
                            )}>
                              {t.status === 'open' ? 'Ouvert' : t.status === 'partial' ? 'Partiel' : 'Clôturé'}
                            </Badge>
                          ) : (
                            t.type === 'PAIEMENT' ? <Badge variant="outline">Paiement</Badge> : null
                          )
                        )}
                      </TableCell>
                      <TableCell className="text-right text-red-500">{t.debit > 0 ? `+${t.debit.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className="text-right text-green-500">{t.credit > 0 ? `-${t.credit.toFixed(2)}` : '-'}</TableCell>
                      <TableCell className={cn(
                        "text-right font-bold",
                        t.balance > 0 ? "text-red-600" : "text-green-600"
                      )}>
                        {t.balance.toFixed(2)}
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <TransactionActions 
                          transaction={{
                            ...t, 
                            amount: t.type === 'ACHAT' ? t.debit : t.credit,
                            supplierId 
                          }} 
                        />
                      </TableCell>
                    </TableRow>

                    {/* Expanded items row */}
                    {expanded[t.id] && t.items && t.items.map((item: any, i: number) => (
                      <TableRow key={`${t.id}-item-${i}`} className="bg-muted/10 text-xs hover:bg-muted/20">
                        <TableCell colSpan={2} />
                        <TableCell colSpan={2} className="pl-6 text-muted-foreground border-l-2 border-primary/20">
                          ↳ {item.label}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {item.quantity} × {Number(item.unitPrice).toFixed(2)}
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

          {/* 🔢 Pagination */}
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
                  onClick={() => setCurrentPage(p => p - 1)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(p => p + 1)}
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
