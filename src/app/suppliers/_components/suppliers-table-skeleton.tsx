import React from 'react';

export function SuppliersTableSkeleton() {
  return (
    <div className="space-y-4">
      {/* Search & Filter Skeleton */}
      <div className="h-24 bg-slate-100 animate-pulse rounded-xl border border-slate-200" />
      
      {/* Table Header Skeleton */}
      <div className="h-12 bg-slate-100 animate-pulse rounded-t-xl border border-slate-200" />
      
      {/* Table Rows Skeleton */}
      <div className="space-y-2">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="h-16 bg-slate-50 animate-pulse rounded-md border border-slate-100" />
        ))}
      </div>
      
      {/* Pagination Skeleton */}
      <div className="flex justify-between items-center mt-4">
        <div className="h-4 w-32 bg-slate-100 animate-pulse rounded-md" />
        <div className="flex gap-2">
          <div className="h-8 w-8 bg-slate-100 animate-pulse rounded-md" />
          <div className="h-8 w-8 bg-slate-100 animate-pulse rounded-md" />
          <div className="h-8 w-8 bg-slate-100 animate-pulse rounded-md" />
        </div>
      </div>
    </div>
  );
}
