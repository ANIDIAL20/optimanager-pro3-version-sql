import 'server-only';
import { cookies } from 'next/headers';
import { adminAuth } from './firebaseAdmin';
import { redirect } from 'next/navigation';

import { cache } from 'react';

const SUPER_ADMIN_EMAIL = "ousayehamine3002@gmail.com";

export const verifySuperAdmin = cache(async () => {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    if (!sessionCookie) {
        redirect('/login');
    }

    try {
        // Optimization: checkRevoked = false (faster, no DB round-trip)
        const decodedClaims = await adminAuth.verifySessionCookie(sessionCookie, false);

        if (decodedClaims.email !== SUPER_ADMIN_EMAIL) {
            console.error(`Access attempt by unauthorized email: ${decodedClaims.email}`);
            redirect('/dashboard');
        }

        return decodedClaims;
    } catch (error) {
        console.error("Admin Verification Failed:", error);
        redirect('/login');
    }
});
