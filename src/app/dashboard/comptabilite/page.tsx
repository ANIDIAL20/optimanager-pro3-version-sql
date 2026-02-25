import { redirect } from 'next/navigation';
import { db } from '@/db';
import { sales, clients } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { requireUser } from '@/lib/auth-helpers';
import { ComptabiliteClient } from './comptabilite-client';

export const metadata = {
    title: 'Comptabilité | OptiManager Pro'
};

export default async function ComptabilitePage() {
    const user = await requireUser();
    
    if (user.role !== 'ADMIN' && (user as any).role !== 'COMPTABLE') {
        redirect('/dashboard');
    }

    const allSales = await db
        .select({
            sale: sales,
            clientNom: clients.nom,
            clientPrenom: clients.prenom,
        })
        .from(sales)
        .leftJoin(clients, eq(sales.clientId, clients.id))
        .where(eq(sales.userId, user.id))
        .orderBy(desc(sales.createdAt));

    const formattedSales = allSales.map((r: { sale: typeof sales.$inferSelect; clientNom: string | null; clientPrenom: string | null }) => ({
        ...r.sale,
        clientNom: r.clientNom || 'Inconnu',
        clientPrenom: r.clientPrenom || ''
    }));

    return <ComptabiliteClient initialSales={formattedSales} />;
}
