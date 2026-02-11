'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';

interface BreadcrumbItem {
    label: string;
    href?: string;
    active?: boolean;
}

interface BreadcrumbCustomProps {
    items: BreadcrumbItem[];
    className?: string;
}

export function BreadcrumbCustom({ items, className }: BreadcrumbCustomProps) {
    const router = useRouter();

    return (
        <div className={cn("flex items-center text-sm text-slate-500", className)}>
            {items.map((item, index) => (
                <React.Fragment key={index}>
                    <span
                        className={cn(
                            "transition-all duration-200",
                            item.href && "hover:text-primary cursor-pointer font-medium",
                            item.active && "font-bold text-primary active-breadcrumb"
                        )}
                        onClick={() => item.href && router.push(item.href)}
                    >
                        {item.label}
                    </span>
                    {index < items.length - 1 && (
                        <span className="text-slate-300 mx-2">/</span>
                    )}
                </React.Fragment>
            ))}
        </div>
    );
}
