/**
 * Print Layout — server component
 *
 * Responsibilities:
 *  1. AUTH GUARD: Redirect unauthenticated users before any DB fetch happens.
 *     This is a defense-in-depth layer on top of the global middleware redirect.
 *  2. ISOLATION: Renders ONLY {children} — no navigation, no sidebar, no app-shell.
 *  3. PRINT CSS: Injects the @page A4 rule and color-adjust flags once for all
 *     print/* pages so the template component doesn't have to duplicate it.
 */

import { redirect } from 'next/navigation';
import { auth } from '@/auth';

export default async function PrintLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // ── FIX 1: Explicit server-side auth guard ─────────────────────────────────
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/login');
  }

  return (
    <>
      {/* ── FIX 3 & 6: Global print CSS injected once at layout level ──────── */}
      <style>{`
        @media print {
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          @page {
            size: A4;
            margin: 8mm 10mm;
          }
        }
      `}</style>

      {/* No sidebar, no navbar — only the print content */}
      {children}
    </>
  );
}
