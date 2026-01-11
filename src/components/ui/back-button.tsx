'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';

export function BackButton() {
    const router = useRouter();

    return (
        <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 flex items-center text-sm text-slate-500 hover:text-slate-900 transition-colors"
        >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Retour
        </Button>
    );
}
