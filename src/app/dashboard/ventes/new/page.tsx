import type { Metadata } from 'next';
import { requireAuth } from '@/lib/auth-helpers';
import { PosWorkspace } from '@/features/pos/components/PosWorkspace';

export const metadata: Metadata = {
  title: 'Nouvelle Vente | OptiManager Pro',
  description: 'Point de vente professionnel — Encaissement rapide',
};

export default async function NewSalePage() {
  await requireAuth();

  return (
    <div className="space-y-6">
      <PosWorkspace />
    </div>
  );
}
