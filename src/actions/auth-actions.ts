'use server';

import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebaseAdmin';

export async function createSession(idToken: string) {
    try {
        // Session expires in 1 day (faster than 5 days)
        const expiresIn = 60 * 60 * 24 * 1000; // 1 day

        const sessionCookie = await adminAuth.createSessionCookie(idToken, { expiresIn });

        const cookieStore = await cookies();
        cookieStore.set('session', sessionCookie, {
            maxAge: expiresIn / 1000, // Convert to seconds
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            path: '/',
            sameSite: 'lax',
        });

        return { success: true };
    } catch (error) {
        console.error('Failed to create session:', error);
        return { success: false, error: 'Unauthorized' };
    }
}

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete('session');
    return { success: true };
}
