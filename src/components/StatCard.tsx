import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

type Props = {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** Tailwind classes for the icon chip, e.g. "bg-indigo-50 text-indigo-600" */
  accent?: string;
  className?: string;
  /** Se value é um número puro, anima a contagem até ele. */
  countTo?: number;
  suffix?: string;
};

/** Conta de 0 até `to` com easing, respeitando prefers-reduced-motion. */
function useCountUp(to: number, run: boolean) {
  const [n, setN] = useState(0);
  const raf = useRef<number>();
  useEffect(() => {
    if (!run) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) { setN(to); return; }
    const dur = 800;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(to * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, [to, run]);
  return n;
}

/** Cartão de métrica: ícone em chip, valor grande, rótulo e dica opcional. */
export default function StatCard({ icon, label, value, hint, accent = 'bg-indigo-50 text-indigo-600', className, countTo, suffix }: Props) {
  const counted = useCountUp(countTo ?? 0, countTo !== undefined);
  const display = countTo !== undefined ? `${Math.round(counted)}${suffix || ''}` : value;
  return (
    <div className={cn('bg-white border border-gray-100 rounded-2xl p-5 flex items-start gap-4', className)}>
      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', accent)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-extrabold text-gray-900 leading-tight truncate">{display}</p>
        <p className="text-xs text-gray-400 font-medium mt-0.5">{label}</p>
        {hint && <p className="text-[11px] text-gray-300 mt-0.5">{hint}</p>}
      </div>
    </div>
  );
}
