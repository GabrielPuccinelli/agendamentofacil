import React from 'react';
import { cn } from '@/lib/utils';

type Props = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** Tailwind classes for the icon chip, e.g. "bg-indigo-50 text-indigo-600" */
  accent?: string;
  className?: string;
};

/** Cartão de métrica: ícone em chip, valor grande, rótulo e dica opcional. */
export default function StatCard({ icon, label, value, hint, accent = 'bg-indigo-50 text-indigo-600', className }: Props) {
  return (
    <div className={cn('bg-white border border-gray-100 rounded-2xl p-5 flex items-start gap-4', className)}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', accent)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-gray-900 leading-tight truncate">{value}</p>
        <p className="text-xs text-gray-400 font-medium mt-0.5">{label}</p>
        {hint && <p className="text-[11px] text-gray-300 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}
