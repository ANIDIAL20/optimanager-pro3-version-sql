import { useEffect } from 'react';

export function usePrintTitle(filename: string | null | undefined) {
  useEffect(() => {
    if (!filename) return;
    
    // setTimeout(0) out-races Next.js metadata hydration
    const timer = setTimeout(() => {
      document.title = filename;
    }, 0);

    return () => {
      clearTimeout(timer);
      document.title = 'OptiManager Pro';
    };
  }, [filename]);
}
