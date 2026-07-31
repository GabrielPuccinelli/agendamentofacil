import { Skeleton } from '@/components/ui/skeleton';

const Bar = ({ className = '' }: { className?: string }) => (
  <div className={`bg-slate-800/60 rounded-md animate-pulse ${className}`} />
);

/**
 * Skeleton de página autenticada: imita a sidebar escura + conteúdo claro,
 * bem mais suave que um spinner isolado. Usado enquanto o AppShell carrega.
 */
export function AppLoading() {
  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Faux sidebar */}
      <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-slate-950 border-r border-slate-800 p-4 gap-3">
        <div className="flex items-center gap-2.5 mb-2">
          <Bar className="w-8 h-8 rounded-lg" />
          <Bar className="h-4 w-24" />
        </div>
        <div className="flex items-center gap-3 py-3 border-y border-slate-800/80">
          <Bar className="w-10 h-10 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <Bar className="h-3 w-20" />
            <Bar className="h-2.5 w-12" />
          </div>
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <Bar key={i} className="h-9 w-full rounded-xl" />
        ))}
      </aside>

      {/* Faux content */}
      <div className="flex-1 p-4 sm:p-6 md:p-8">
        <Skeleton className="h-8 w-56 mb-2" />
        <Skeleton className="h-4 w-72 mb-8" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <div className="grid lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

/** Skeleton para páginas públicas (fundo claro). */
export function PublicLoading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Skeleton className="h-44 sm:h-56 w-full rounded-none" />
      <div className="max-w-2xl mx-auto px-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 -mt-14 relative z-10">
          <div className="flex items-center gap-4">
            <Skeleton className="w-20 h-20 rounded-2xl -mt-14" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-40" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        </div>
        <div className="py-8 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
