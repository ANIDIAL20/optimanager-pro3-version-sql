import { notFound } from 'next/navigation';
import ClientDetailView from './client-view';
import { getClient } from '@/app/actions/clients-actions';
import { getClientReservations } from '@/features/reservations/queries/get-client-reservations';
import type { Client } from '@/lib/types';
import type { FrameReservation } from '@/features/reservations/types/reservation.types';

// The page component is now an async Server Component
export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Parallel data fetching
  const [clientResult, reservations] = await Promise.all([
    getClient(id),
    getClientReservations(parseInt(id))
  ]);

  if (!clientResult.success || !clientResult.client) {
    notFound();
  }

  const c = clientResult.client;
  // Adapter logic matching previous client-view manual implementation
  const nameParts = c.name.split(' ');
  const prenom = nameParts.length > 1 ? nameParts[0] : '';
  const nom = nameParts.length > 1 ? nameParts.slice(1).join(' ') : c.name;

  const adaptedClient: Client = {
    ...c,
    id: c.id!,
    nom,
    prenom,
    telephone1: c.phone || '',
  } as unknown as Client;

  const initialReservations = reservations;

  return (
    <ClientDetailView
      initialClient={adaptedClient}
      initialReservations={initialReservations}
    />
  );
}
