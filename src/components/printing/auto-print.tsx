'use client';

/**
 * AutoPrint — reliable, font-aware auto-print trigger.
 *
 * Replaces the old `setTimeout(() => window.print(), 800)` pattern.
 *
 * Strategy:
 *  1. Wait for `document.fonts.ready` (all custom webfonts loaded).
 *  2. Wait for every <img> in the document to finish loading.
 *  3. Then call `window.print()`.
 *
 * This guarantees that fonts are not swapped mid-print and logos are visible,
 * fixing the blank-logo and FOUT artifacts that the 800ms timer couldn't prevent
 * on slow connections.
 *
 * Usage: Render this component only when auto-print is desired.
 *   {searchParams.auto === 'true' && <AutoPrint />}
 */

import { useEffect } from 'react';

export function AutoPrint() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const shouldPrint = params.get('autoprint') === 'true' || params.get('autoprint') === '1';

    // Disable auto-print if we are inside the hidden printInPlace iframe.
    // The parent window handles the print() call.
    if (!shouldPrint || window !== window.parent) return;

    let cancelled = false;
    let timeoutId: NodeJS.Timeout;

    const handleAfterPrint = () => {
      window.close();
    };

    window.addEventListener('afterprint', handleAfterPrint);

    async function trigger() {
      // 1. Wait for all web fonts to load
      await document.fonts.ready;

      if (cancelled) return;

      // 2. Wait for all images that are still loading
      const images = Array.from(document.querySelectorAll('img'));
      const imagePromises = images
        .filter((img) => !img.complete)
        .map(
          (img) =>
            new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
            })
        );

      await Promise.all(imagePromises);

      if (cancelled) return;

      timeoutId = setTimeout(() => {
        if (!cancelled) window.print();
      }, 500);
    }

    trigger();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      window.removeEventListener('afterprint', handleAfterPrint);
    };
  }, []);

  // Renders nothing — purely a side-effect component
  return null;
}
