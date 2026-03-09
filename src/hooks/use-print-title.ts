import { useEffect } from 'react';

/**
 * Hook to set the browser document title (used for PDF filename during print).
 * High priority: sets it immediately AND on a small delay to out-race metadata hydration.
 */
export function usePrintTitle(filename: string | null | undefined) {
  useEffect(() => {
    if (!filename) return;
    
    // 1. Force the title immediately (ensure .pdf extension for browser hints)
    const title = filename.toLowerCase().endsWith('.pdf') ? filename : `${filename}.pdf`;
    document.title = title;

    // 2. Use a MutationObserver to "lock" the title
    // This prevents Next.js metadata system from overriding it during hydration
    // or as the user interacts with the page.
    const target = document.querySelector('title');
  
    const observer = new MutationObserver(() => {
      if (document.title !== title) {
        document.title = title;
      }
    });

    if (target) {
      observer.observe(target, { childList: true, characterData: true });
    }

    // 3. Fallback: Repeated check in case the observer is missed
    const timer = setInterval(() => {
      if (document.title !== title) document.title = title;
    }, 200);

    return () => {
      observer.disconnect();
      clearInterval(timer);
      document.title = 'OptiManager Pro';
    };
  }, [filename]);
}
