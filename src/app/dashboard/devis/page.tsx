import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { getDevis } from '@/app/actions/devis-actions';
import { DevisClientPage } from './devis-client';
import type { Devis } from '@/app/actions/devis-actions';

/**
 * Devis Page - Server Component
 * Handles authentication and data loading server-side
 */
export default async function DevisPage() {
    // ============================================
    // 1. STRICT AUTHENTICATION CHECK
    // ============================================
    const user = await getCurrentUser();
    
    // Strict security: require authenticated user
    if (!user) {
        console.warn('⚠️ Unauthorized access attempt to /dashboard/devis');
        redirect('/login');
    }

    console.log('✅ Authenticated user accessing devis:', user.uid);

    // ============================================
    // 2. DATA FETCHING WITH ERROR HANDLING
    // ============================================
    let devisList: Devis[] = [];
    let error: string | null = null;

    try {
        const devisRes = await getDevis();

        if (devisRes.success && devisRes.devis) {
            devisList = devisRes.devis;
        } else {
            // If explicit error from action
            error = devisRes.error || 'Impossible de charger les devis.';
        }

    } catch (err: any) {
        console.error('❌ Error loading devis data:', err);
        error = err.message || 'Impossible de charger les devis.';
    }

    // ============================================
    // 3. RENDER CLIENT COMPONENT WITH DATA
    // ============================================
    return (
        <DevisClientPage 
            initialDevis={devisList} 
            initialError={error} 
        />
    );
}
