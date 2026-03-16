'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('Next.js Error Boundary caught an error:', error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] p-8 border border-red-200 bg-red-50 rounded-lg m-8">
      <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
      <h2 className="text-xl font-bold text-slate-900 mb-2">Something went wrong!</h2>
      <div className="bg-white p-4 rounded-md border border-red-100 max-w-2xl w-full text-left overflow-auto mb-6">
        <p className="font-mono text-sm text-red-600 font-bold mb-2 break-words">
          Message: {error.message || 'Unknown error'}
        </p>
        {error.digest && (
          <p className="font-mono text-xs text-slate-500 mb-2">Digest: {error.digest}</p>
        )}
        {error.stack && (
          <pre className="text-xs text-slate-600 mt-2 whitespace-pre-wrap">
            {error.stack}
          </pre>
        )}
      </div>
      <Button
        onClick={() => reset()}
        variant="outline"
        className="bg-white hover:bg-slate-50"
      >
        Try again
      </Button>
    </div>
  );
}
