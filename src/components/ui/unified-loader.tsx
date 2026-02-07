'use client';

import * as React from 'react';
import { useLoadingContext } from '@/contexts/loading-context';
import { BrandLoader } from './loader-brand';
import { cn } from '@/lib/utils';

/**
 * Unified Loader - Global loading indicator
 * Automatically shows/hides based on LoadingContext state
 */

interface UnifiedLoaderProps {
  className?: string;
  minDisplayTime?: number; // Minimum time to show loader (prevents flash)
}

export function UnifiedLoader({ 
  className,
  minDisplayTime = 200 
}: UnifiedLoaderProps = {}) {
  const { isLoading, currentOperation, activeCount } = useLoadingContext();
  const [shouldShow, setShouldShow] = React.useState(false);
  const showTimerRef = React.useRef<NodeJS.Timeout | null>(null);
  const hideTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    // Clear any pending timers
    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
    }
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
    }

    if (isLoading) {
      // Delay showing loader slightly to avoid flashing for quick operations
      showTimerRef.current = setTimeout(() => {
        setShouldShow(true);
      }, 100);
    } else if (shouldShow) {
      // Keep loader visible for minimum time to prevent jarring flash
      hideTimerRef.current = setTimeout(() => {
        setShouldShow(false);
      }, minDisplayTime);
    }

    return () => {
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [isLoading, shouldShow, minDisplayTime]);

  if (!shouldShow) return null;

  return (
    <div
      className={cn(
        'fixed top-4 right-4 z-[9999] flex items-center gap-3 rounded-lg bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm border border-slate-200',
        'animate-in fade-in slide-in-from-top-2 duration-300',
        className
      )}
    >
      <BrandLoader size="sm" />
      
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-slate-900">
          Chargement...
        </p>
        {currentOperation && (
          <p className="text-xs text-slate-500 max-w-[200px] truncate">
            {formatOperationName(currentOperation)}
          </p>
        )}
        {activeCount > 1 && (
          <p className="text-xs text-slate-400">
            {activeCount} opérations actives
          </p>
        )}
      </div>
    </div>
  );
}

/**
 * Format operation key to human-readable name
 */
function formatOperationName(key: string): string {
  // Convert kebab-case or snake_case to readable text
  return key
    .replace(/[-_]/g, ' ')
    .replace(/^\w/, (c) => c.toUpperCase());
}
