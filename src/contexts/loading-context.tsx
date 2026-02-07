'use client';

import * as React from 'react';

/**
 * Loading Context - Unified loading state management
 * Tracks all active async operations across the application
 */

interface LoadingState {
  activeRequests: Map<string, number>; // key -> timestamp
  isLoading: boolean;
  currentOperation?: string;
}

interface LoadingContextValue {
  isLoading: boolean;
  currentOperation?: string;
  startLoading: (key: string) => void;
  stopLoading: (key: string) => void;
  activeCount: number;
}

const LoadingContext = React.createContext<LoadingContextValue | undefined>(undefined);

export function LoadingProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = React.useState<LoadingState>({
    activeRequests: new Map(),
    isLoading: false,
    currentOperation: undefined,
  });

  const startLoading = React.useCallback((key: string) => {
    setState((prev) => {
      const newRequests = new Map(prev.activeRequests);
      newRequests.set(key, Date.now());
      
      return {
        activeRequests: newRequests,
        isLoading: true,
        currentOperation: key,
      };
    });
  }, []);

  const stopLoading = React.useCallback((key: string) => {
    setState((prev) => {
      const newRequests = new Map(prev.activeRequests);
      newRequests.delete(key);
      
      return {
        activeRequests: newRequests,
        isLoading: newRequests.size > 0,
        currentOperation: newRequests.size > 0 
          ? Array.from(newRequests.keys())[0] 
          : undefined,
      };
    });
  }, []);

  const value = React.useMemo(
    () => ({
      isLoading: state.isLoading,
      currentOperation: state.currentOperation,
      startLoading,
      stopLoading,
      activeCount: state.activeRequests.size,
    }),
    [state.isLoading, state.currentOperation, state.activeRequests.size, startLoading, stopLoading]
  );

  return (
    <LoadingContext.Provider value={value}>
      {children}
    </LoadingContext.Provider>
  );
}

/**
 * Hook to access global loading state
 */
export function useLoadingContext() {
  const context = React.useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoadingContext must be used within a LoadingProvider');
  }
  return context;
}

/**
 * Hook for managing loading state of a specific operation
 * Auto-cleanup on unmount
 */
export function useGlobalLoading(key: string) {
  const { startLoading, stopLoading } = useLoadingContext();
  
  const start = React.useCallback(() => {
    startLoading(key);
  }, [key, startLoading]);
  
  const stop = React.useCallback(() => {
    stopLoading(key);
  }, [key, stopLoading]);

  // Auto cleanup on unmount
  React.useEffect(() => {
    return () => {
      stopLoading(key);
    };
  }, [key, stopLoading]);

  return { startLoading: start, stopLoading: stop };
}

/**
 * Hook for async operations with automatic loading state
 */
export function useServerAction<T>(
  key: string,
  action: () => Promise<T>,
  options?: { cache?: { ttl: number } }
) {
  const { startLoading, stopLoading } = useLoadingContext();
  const [data, setData] = React.useState<T | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    let mounted = true;
    
    async function execute() {
      try {
        startLoading(key);
        setIsLoading(true);
        
        // Check cache if enabled
        if (options?.cache) {
          const cached = getCachedData<T>(key);
          if (cached) {
            setData(cached);
            setIsLoading(false);
            stopLoading(key);
            return;
          }
        }
        
        const result = await action();
        
        if (mounted) {
          setData(result);
          setError(null);
          
          // Store in cache if enabled
          if (options?.cache) {
            setCachedData(key, result, options.cache.ttl);
          }
        }
      } catch (err) {
        if (mounted) {
          setError(err as Error);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
          stopLoading(key);
        }
      }
    }

    execute();

    return () => {
      mounted = false;
      stopLoading(key);
    };
  }, [key, action, startLoading, stopLoading, options?.cache]);

  return { data, error, isLoading };
}

// Simple cache utilities (will be replaced by action-cache.ts)
function getCachedData<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cached = sessionStorage.getItem(`cache:${key}`);
    if (!cached) return null;
    
    const { data, expiry } = JSON.parse(cached);
    if (Date.now() > expiry) {
      sessionStorage.removeItem(`cache:${key}`);
      return null;
    }
    
    return data as T;
  } catch {
    return null;
  }
}

function setCachedData<T>(key: string, data: T, ttl: number): void {
  if (typeof window === 'undefined') return;
  
  try {
    const expiry = Date.now() + ttl;
    sessionStorage.setItem(`cache:${key}`, JSON.stringify({ data, expiry }));
  } catch {
    // Ignore storage errors
  }
}
