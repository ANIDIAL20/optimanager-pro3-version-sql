import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getSales } from '@/app/actions/sales-actions';
import { getClients } from '@/app/actions/clients-actions';
import { VentesClientPage } from './ventes-client';
import type { Sale, Client } from '@/lib/types';

/**
 * Ventes Page - Server Component
 * Handles authentication and data loading server-side
 */
export default async function VentesPage() {
    // ============================================
    // 1. STRICT AUTHENTICATION CHECK
    // ============================================
    const user = await getCurrentUser();
    
    // Strict security: require authenticated user
    if (!user) {
        console.warn('âš ï¸ Unauthorized access attempt to /dashboard/ventes');
        redirect('/login');
    }

    console.log('âœ… Authenticated user accessing ventes:', user.uid);

    // ============================================
    // 2. DATA FETCHING WITH ERROR HANDLING
    // ============================================
    let sales: Sale[] = [];
    let clients: Client[] = [];
    let error: string | null = null;

    try {
        // Parallel fetch for performance
        // Note: getSales() and getClients() use secureAction
        // which automatically validates userId from Clerk session
        const [salesRes, clientsRes] = await Promise.all([
            getSales(),
            getClients()
        ]);

        // Handle sales response
        if (salesRes.success && salesRes.sales) {
            sales = salesRes.sales as Sale[];
            console.log(`âœ… Loaded ${sales.length} sales`);
        } else {
            throw new Error(salesRes.error || 'Failed to load sales');
        }

        // Handle clients response (non-critical)
        if (clientsRes.success && clientsRes.clients) {
            // Adapt clients to match legacy UI expectations
            clients = clientsRes.clients.map(c => {
                const nameParts = c.name?.split(' ') || [''];
                const prenom = nameParts.length > 1 ? nameParts[0] : '';
                const nom = nameParts.length > 1 ? nameParts.slice(1).join(' ') : c.name;
                
                return {
                    ...c,
                    nom,
                    prenom,
                    telephone1: c.phone || '',
                    id: c.id?.toString() || '',
                } as any;
            });
            console.log(`âœ… Loaded ${clients.length} clients`);
        } else {
            // Non-critical - UI still works without client data
            console.warn('âš ï¸ Failed to load clients:', clientsRes.error);
        }

    } catch (err: any) {
        console.error('âŒ Error loading ventes data:', err);
        error = err.message || 'Impossible de charger les ventes.';
    }

    // ============================================
    // 3. RENDER CLIENT COMPONENT WITH DATA
    // ============================================
    return (
        <VentesClientPage 
            initialSales={sales} 
            initialClients={clients} 
            initialError={error} 
        />
    );
}
