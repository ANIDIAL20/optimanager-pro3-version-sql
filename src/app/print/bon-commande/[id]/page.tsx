/**
 * /print/bon-commande/[id] Ã¢â‚¬â€ Server Component
 * Standardized to match Facture/Devis/Recu for SSR Title & Template consistency.
 */
import { notFound } from 'next/navigation';
import { getSupplierOrderPrintData } from '@/app/actions/supplier-orders-actions';
import { getDocumentConfigForPrint } from '@/app/actions/shop-actions';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document-template';
import { bonCommandeAdapter } from '@/lib/documents/adapters';
import { PrintShell } from '@/components/printing/print-shell';
import { buildBonCommandeFilename } from '@/lib/filename-utils';
import type { Metadata } from 'next';

interface BonCommandePrintPageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string; autoprint?: string; preview?: string }>;
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const result = await getSupplierOrderPrintData(id);
  
  if (!result.success || !result.data) {
    return { title: 'Bon de Commande - OptiManager Pro' };
  }

  const data = bonCommandeAdapter.toStandardDocument(result.data);
  const filename = buildBonCommandeFilename(data.documentNumber, data.fournisseur?.nom || 'Fournisseur');

  return {
    title: filename,
  };
}

export default async function BonCommandePrintPage({
  params,
  searchParams,
}: BonCommandePrintPageProps) {
  const { id } = await params;
  const sp = await searchParams;

  const [result, docConfig] = await Promise.all([
    getSupplierOrderPrintData(id),
    getDocumentConfigForPrint(),
  ]);

  if (!result.success || !result.data) notFound();

  const data = bonCommandeAdapter.toStandardDocument(result.data);

  return (
    <PrintShell
      data={data}
      config={docConfig ?? DEFAULT_TEMPLATE_CONFIG}
      autoprint={sp.auto === 'true' || sp.autoprint === 'true'}
      isPreview={!!sp.preview}
    />
  );
}
