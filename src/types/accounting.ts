// ============================================================
// Shared Types — Accounting Module
// ============================================================

/** Date range filter passed from client to server actions */
export interface DateRange {
    from: Date;
    to: Date;
}

/** Normalized row returned by getOfficialSales / getHorsbilanSales / getAllSales */
export interface SaleRow {
    id: number;
    saleNumber: string | null;
    transactionNumber: string | null;
    date: string;           // pre-formatted dd/MM/yyyy
    clientName: string;
    totalTTC: number;
    totalPaye: number;
    resteAPayer: number;
    paymentMethod: string | null;
    status: string;
    isOfficialInvoice: boolean;
}

export interface AccountingMetrics {
    totalRevenue: number;
    salesCount: number;
    averageCart: number;
    chartData: { date: string; amount: number }[];
}
