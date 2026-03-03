import { notFound, redirect } from 'next/navigation';
import { auth } from '@/auth';
import { getLensOrderById } from '@/app/actions/lens-orders-actions';
import { getDocumentConfig } from '@/app/actions/shop-actions';
import { DEFAULT_TEMPLATE_CONFIG } from '@/types/document-template';
import { LensOrderPrintClient } from './_components/lens-order-print-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function LensOrderPrintPage({ params }: Props) {
  // ── FIX 1: Explicit server-side auth guard ─────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  const { id } = await params;

  // Fetch in parallel — getLensOrderById uses secureAction which also enforces
  // userId ownership, so a document belonging to another tenant returns !success.
  const [result, config] = await Promise.all([
    getLensOrderById(id),
    getDocumentConfig()
  ]);

  if (!result.success || !result.data) {
    notFound();
  }

  return <LensOrderPrintClient data={result.data as any} config={config ?? DEFAULT_TEMPLATE_CONFIG} />;
}
