'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface ThumbnailProps {
  selected?: boolean;
  primaryColor?: string;
}

export const ClassicTemplateThumbnail = ({ selected, primaryColor = '#1e293b' }: ThumbnailProps) => (
  <div className={cn(
    "w-[130px] h-[180px] border-2 rounded-lg bg-white p-2 overflow-hidden flex flex-col cursor-pointer transition-all shrink-0",
    selected ? "border-indigo-600 ring-2 ring-indigo-200 shadow-md" : "border-slate-200 hover:border-indigo-300 hover:shadow-sm"
  )}>
    <div className="flex justify-between items-start mb-1.5 pb-1.5" style={{ borderBottom: `1.5px solid ${primaryColor}` }}>
      <div className="w-7 h-4 rounded-sm" style={{ background: primaryColor, opacity: 0.15, border: `1px solid ${primaryColor}` }} />
      <div className="text-right">
        <div className="text-[7px] font-black tracking-widest" style={{ color: primaryColor }}>FACTURE</div>
        <div className="text-[5px] text-slate-400">N┬░ 001</div>
      </div>
    </div>
    <div className="space-y-1 flex-1">
      {[60, 80, 50].map((w, i) => (
        <div key={i} className="flex justify-between border-b border-slate-100 pb-0.5">
          <div className="h-1.5 bg-slate-200 rounded" style={{ width: `${w}%` }} />
          <div className="w-8 h-1.5 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
    <div className="mt-1.5 flex justify-end">
      <div className="px-2 py-0.5 rounded text-[6px] font-bold text-white" style={{ background: primaryColor }}>
        1 800 DH
      </div>
    </div>
  </div>
);

export const ModernTemplateThumbnail = ({ selected, primaryColor = '#4f46e5' }: ThumbnailProps) => (
  <div className={cn(
    "w-[130px] h-[180px] border-2 rounded-lg bg-white overflow-hidden flex flex-col cursor-pointer transition-all shrink-0",
    selected ? "border-indigo-600 ring-2 ring-indigo-200 shadow-md" : "border-slate-200 hover:border-indigo-300 hover:shadow-sm"
  )}>
    <div className="px-2 py-2 text-white flex justify-between items-center" style={{ background: primaryColor }}>
      <div className="w-7 h-4 bg-white/20 rounded-sm" />
      <div className="text-right">
        <div className="text-[7px] font-black tracking-widest text-white/95">FACTURE</div>
        <div className="text-[5px] text-white/60">N┬░ 001</div>
      </div>
    </div>
    <div className="p-2 flex-1 flex flex-col">
      <div className="space-y-1 flex-1">
        <div className="flex justify-between text-[5px] py-0.5 rounded px-1" style={{ background: primaryColor + '18' }}>
          <div className="h-1.5 w-12 rounded" style={{ background: primaryColor + '40' }} />
          <div className="h-1.5 w-6 rounded" style={{ background: primaryColor + '40' }} />
        </div>
        {[1, 2].map(i => (
          <div key={i} className="flex justify-between py-0.5 border-b border-slate-50">
            <div className="h-1.5 w-14 bg-slate-200 rounded" />
            <div className="h-1.5 w-7 bg-slate-300 rounded" />
          </div>
        ))}
      </div>
      <div className="flex justify-end mt-1">
        <div className="px-1.5 py-0.5 rounded text-[6px] font-bold text-white" style={{ background: primaryColor }}>
          1 800 DH
        </div>
      </div>
    </div>
  </div>
);

export const MinimalTemplateThumbnail = ({ selected }: ThumbnailProps) => (
  <div className={cn(
    "w-[130px] h-[180px] border-2 rounded-lg bg-white p-3 overflow-hidden flex flex-col cursor-pointer transition-all shrink-0",
    selected ? "border-indigo-600 ring-2 ring-indigo-200 shadow-md" : "border-slate-200 hover:border-indigo-300 hover:shadow-sm"
  )}>
    <div className="flex justify-between items-center mb-3">
      <div className="w-5 h-5 bg-slate-200 rounded-full" />
      <div className="text-[6px] tracking-[0.25em] text-slate-400 font-light">FACTURE</div>
    </div>
    <div className="space-y-2 flex-1">
      {[1, 2].map(i => (
        <div key={i} className="flex justify-between">
          <div className="space-y-0.5">
            <div className="h-1.5 w-14 bg-slate-300 rounded" />
            <div className="h-1 w-9 bg-slate-100 rounded" />
          </div>
          <div className="h-1.5 w-8 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
    <div className="border-t border-slate-100 pt-1.5 flex justify-between items-baseline">
      <div className="text-[5px] text-slate-400 uppercase tracking-wider">Net ├á payer</div>
      <div className="text-[7px] font-bold text-slate-700">1 800 DH</div>
    </div>
  </div>
);

export const BoldTemplateThumbnail = ({ selected, primaryColor = '#dc2626' }: ThumbnailProps) => (
  <div className={cn(
    "w-[130px] h-[180px] border-2 rounded-lg bg-white p-2 overflow-hidden flex flex-col cursor-pointer transition-all shrink-0",
    selected ? "border-indigo-600 ring-2 ring-indigo-200 shadow-md" : "border-slate-200 hover:border-indigo-300 hover:shadow-sm"
  )}>
    <div className="mb-2">
      <div className="text-[11px] font-black tracking-tighter text-slate-900 leading-none">FACTURE</div>
      <div className="flex justify-between items-center mt-0.5">
        <div className="w-10 h-2 rounded-sm" style={{ background: primaryColor }} />
        <div className="text-[6px] font-bold" style={{ color: primaryColor }}>N┬░ 001</div>
      </div>
    </div>
    <div className="flex-1">
      <div className="flex justify-between text-[5px] py-0.5 border-b-2 border-slate-900 font-bold mb-0.5">
        <div className="w-12 h-1.5 bg-slate-900 rounded" />
        <div className="w-6 h-1.5 bg-slate-900 rounded" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="flex justify-between py-0.5 border-b border-slate-100">
          <div className="w-14 h-1.5 bg-slate-400 rounded" />
          <div className="w-8 h-1.5 bg-slate-700 rounded" />
        </div>
      ))}
    </div>
    <div className="mt-1 p-1.5 rounded-sm flex justify-between items-center text-white text-[6px] font-black" style={{ background: '#1e293b' }}>
      <div>TOTAL</div>
      <div>1 800 DH</div>
    </div>
  </div>
);

export const ElegantTemplateThumbnail = ({ selected, primaryColor = '#92400e' }: ThumbnailProps) => (
  <div className={cn(
    "w-[130px] h-[180px] border-2 rounded-lg bg-amber-50/40 p-2.5 overflow-hidden flex flex-col cursor-pointer transition-all shrink-0",
    selected ? "border-indigo-600 ring-2 ring-indigo-200 shadow-md" : "border-slate-200 hover:border-indigo-300 hover:shadow-sm"
  )}>
    <div className="flex flex-col items-center mb-2" style={{ borderBottom: `0.5px solid ${primaryColor}40` }}>
      <div className="w-6 h-6 rounded-full flex items-center justify-center mb-1" style={{ background: primaryColor + '20', border: `0.5px solid ${primaryColor}60` }}>
        <div className="w-3 h-3 rounded-full" style={{ background: primaryColor + '60' }} />
      </div>
      <div className="text-[6px] tracking-[0.3em] font-medium pb-1.5" style={{ color: primaryColor }}>FACTURE</div>
    </div>
    <div className="flex-1 pt-1 space-y-1.5">
      {[1, 2].map(i => (
        <div key={i} className="flex justify-between">
          <div className="h-1.5 w-14 rounded" style={{ background: primaryColor + '25' }} />
          <div className="h-1.5 w-8 rounded" style={{ background: primaryColor + '18' }} />
        </div>
      ))}
    </div>
    <div className="mt-1.5 pt-1 text-center border-t border-double" style={{ borderColor: primaryColor + '40' }}>
      <div className="text-[6px] italic font-medium" style={{ color: primaryColor }}>Total : 1 800 DH</div>
    </div>
  </div>
);
