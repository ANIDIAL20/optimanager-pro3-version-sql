'use client';

import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LogOut } from 'lucide-react';

export default function LogoutButton() {
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signOut({ callbackUrl: window.location.origin + '/login' });
            router.refresh();
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
