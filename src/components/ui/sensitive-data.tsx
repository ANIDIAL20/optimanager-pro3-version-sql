'use client';

import * as React from 'react';
import { usePrivacy } from '@/context/privacy-context';
import { cn } from '@/lib/utils';

interface SensitiveDataProps {
    value: string | number;
    className?: string;
    type?: 'text' | 'currency' | 'number';
    currency?: string;
}

/**
 * SensitiveData component that automatically blurs content when Patient Mode is active
 * Use this for any financial or sensitive numerical data display
 */
export function SensitiveData({
    value,
    className,
    type = 'text',
    currency = 'MAD'
}: SensitiveDataProps) {
    const { isPatientMode } = usePrivacy();

    const formattedValue = React.useMemo(() => {
        if (type === 'currency') {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            return `${numValue.toFixed(2)} ${currency}`;
        }
        if (type === 'number') {
            const numValue = typeof value === 'string' ? parseFloat(value) : value;
            return numValue.toLocaleString('fr-FR');
        }
        return value.toString();
    }, [value, type, currency]);

    // For masked version, use asterisks
    const maskedValue = '****';

    return (
        <span
            className={cn(
                "transition-all duration-300",
                isPatientMode && "blur-sm select-none",
                className
            )}
            aria-hidden={isPatientMode}
        >
            {isPatientMode ? maskedValue : formattedValue}
        </span>
    );
}
