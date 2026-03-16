'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // FIX: BUG 1 - usePathname needed for auth page guard

/**
 * useKeyboardShortcuts - Global hotkeys for power users
 * Ctrl/Meta + K: Focus Search
 * Ctrl/Meta + S: New Sale
 * Ctrl/Meta + P: New Product
 * Ctrl/Meta + B: Dashboard
 */
export function useKeyboardShortcuts() {
  const router = useRouter();
  // FIX: BUG 1 - Only register shortcuts on app pages, not on auth pages
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/login') || pathname.startsWith('/register');

  useEffect(() => {
    // FIX: BUG 1 - Skip shortcut registration entirely on auth pages
    if (isAuthPage) return;
    function handleKeyPress(e: KeyboardEvent) {
      if (!(e.ctrlKey || e.metaKey)) return;

      switch (e.key.toLowerCase()) {
        case 'k':
          e.preventDefault();
          const searchInput = document.querySelector('input[placeholder*="Rechercher"]') as HTMLInputElement;
          if (searchInput) searchInput.focus();
          break;
          
        case 's':
          if (e.shiftKey) {
            e.preventDefault();
            router.push('/dashboard/ventes/new');
          }
          break;
          
        case 'n':
          e.preventDefault();
          if (e.shiftKey) {
            router.push('/dashboard/ventes/new');
          } else {
            router.push('/produits/new');
          }
          break;

        case 'd':
          e.preventDefault();
          router.push('/dashboard');
          break;
          
        default:
          break;
      }
    }
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [router, isAuthPage]); // FIX: BUG 1 - isAuthPage added to dependency array
}
