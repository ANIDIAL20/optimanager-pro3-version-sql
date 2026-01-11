'use client';

import { signOut } from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
    const router = useRouter();
    const auth = useAuth();

    const handleLogout = async () => {
        try {
            if (auth) {
                await signOut(auth);
                // Optional: Call a server action to clear the session cookie if you use one
                // await clearSessionCookie(); 
                document.cookie = 'session=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;'; // Client-side clear attempt
                router.push('/login');
                router.refresh();
            }
        } catch (error) {
            console.error("Erreur lors de la déconnexion:", error);
        }
    };

    return (
        <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-sm font-medium text-red-600 transition-colors rounded-lg hover:bg-red-50 hover:text-red-700"
        >
            <LogOut size={20} />
            <span>Se déconnecter</span>
        </button>
    );
}
