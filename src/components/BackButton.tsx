import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

type Props = {
  to: string;
  label: string;
  /** 'light' para fundos escuros (texto claro), 'dark' para fundos claros. */
  variant?: 'light' | 'dark';
  className?: string;
};

/** Botão de voltar em pill, com seta que desliza no hover. */
export default function BackButton({ to, label, variant = 'dark', className }: Props) {
  return (
    <Link
      to={to}
      className={cn(
        'group inline-flex items-center gap-1.5 rounded-full pl-2 pr-3.5 py-1.5 text-sm font-medium border transition-all',
        variant === 'light'
          ? 'bg-white/10 border-white/20 text-white hover:bg-white/20'
          : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 shadow-sm',
        className,
      )}
    >
      <span className={cn(
        'flex items-center justify-center w-5 h-5 rounded-full transition-transform group-hover:-translate-x-0.5',
        variant === 'light' ? 'bg-white/20' : 'bg-gray-100 group-hover:bg-indigo-50',
      )}>
        <ArrowLeft className="w-3.5 h-3.5" />
      </span>
      <span className="truncate max-w-[200px]">{label}</span>
    </Link>
  );
}
