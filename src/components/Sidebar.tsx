import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, BarChart3, Scissors, Users, UserPlus,
  UserCog, LogOut, CalendarDays, ExternalLink, Copy, Check,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type UserProfile = {
  avatarUrl: string;
  name: string;
  phone: string | null;
} | null;

export type MemberLink = {
  id: string;
  name: string;
  slug: string;
};

export type SidebarProps = {
  userProfile: UserProfile;
  isAdmin: boolean;
  members: MemberLink[];
  organizationSlug: string | null;
  organizationName: string | null;
  /** Slug público do membro logado — habilita o card "meu link" para funcionários */
  memberSlug?: string | null;
  onLogout: () => void;
};

/** Card de link público com botão copiar (usado para empresa e profissional). */
const PublicLinkCard = ({ href, label }: { href: string; label: string }) => {
  const [copied, setCopied] = useState(false);
  const fullUrl = `${window.location.origin}${href}`;
  const copy = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Não foi possível copiar o link.');
    }
  };
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs hover:bg-indigo-500/20 transition-all group/link"
    >
      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
      <span className="truncate flex-1">{label}</span>
      <button
        onClick={copy}
        title="Copiar link"
        className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md hover:bg-indigo-500/30 transition-all"
      >
        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </a>
  );
};

type NavItemProps = {
  to: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  onNavigate?: () => void;
};

const NavItem = ({ to, icon, label, badge, onNavigate }: NavItemProps) => {
  const location = useLocation();
  const isActive = location.pathname === to;
  return (
    <li>
      <Link
        to={to}
        onClick={onNavigate}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 group',
          isActive
            ? 'bg-indigo-500/15 text-indigo-300 font-medium'
            : 'text-slate-400 hover:bg-slate-800/70 hover:text-slate-100',
        )}
      >
        <span className={cn('transition-transform duration-200 group-hover:scale-110', isActive && 'text-indigo-400')}>
          {icon}
        </span>
        <span className="flex-1">{label}</span>
        {badge && (
          <span className="text-[10px] uppercase tracking-wide bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-md">
            {badge}
          </span>
        )}
        {isActive && <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
      </Link>
    </li>
  );
};

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <li className="pt-3 pb-1 first:pt-1">
    <p className="text-[10px] uppercase text-slate-600 font-bold px-3 tracking-widest">{children}</p>
  </li>
);

/**
 * The inner sidebar content — reused by both the desktop aside and the mobile Sheet.
 * `onNavigate` lets the mobile drawer close itself when a link is tapped.
 */
export const SidebarContent: React.FC<SidebarProps & { onNavigate?: () => void }> = ({
  userProfile, isAdmin, organizationSlug, organizationName, memberSlug, onLogout, onNavigate,
}) => {
  const navigate = useNavigate();
  const initials = userProfile?.name?.trim()?.charAt(0).toUpperCase() || '?';

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-950">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-800/80">
        <Link to="/" onClick={onNavigate} className="flex items-center gap-2.5 group w-fit">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center shadow-lg shadow-indigo-500/30 transition-transform duration-200 group-hover:scale-105">
            <CalendarDays className="w-4 h-4 text-white" />
          </div>
          <span className="text-white font-bold text-sm tracking-tight">AgendaFácil</span>
        </Link>
      </div>

      {/* User profile */}
      <div className="px-4 py-4 border-b border-slate-800/80">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 rounded-xl border-2 border-indigo-500/30">
            <AvatarImage src={userProfile?.avatarUrl || undefined} alt={userProfile?.name || 'Avatar'} className="object-cover" />
            <AvatarFallback className="rounded-xl gradient-brand text-white font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="text-white font-medium text-sm truncate">{userProfile?.name || 'Carregando...'}</p>
            <Badge
              variant="secondary"
              className={cn(
                'mt-0.5 text-[10px] font-medium border-0',
                isAdmin ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-700 text-slate-300',
              )}
            >
              {isAdmin ? 'Admin' : 'Funcionário'}
            </Badge>
          </div>
        </div>

        {/* Links públicos com copiar */}
        {isAdmin && organizationSlug && (
          <PublicLinkCard href={`/${organizationSlug}`} label={organizationName || 'Página da empresa'} />
        )}
        {organizationSlug && memberSlug && (
          <PublicLinkCard href={`/${organizationSlug}/${memberSlug}`} label="Meu link de agendamento" />
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col flex-grow p-3 overflow-y-auto">
        <ul className="flex-grow space-y-1">
          {isAdmin && (
            <>
              <SectionLabel>Empresa</SectionLabel>
              <NavItem to="/company/dashboard" icon={<BarChart3 className="w-5 h-5" />} label="Analytics" onNavigate={onNavigate} />
              <NavItem to="/company/services" icon={<Scissors className="w-5 h-5" />} label="Serviços" onNavigate={onNavigate} />
              <NavItem to="/company/team" icon={<Users className="w-5 h-5" />} label="Equipe" onNavigate={onNavigate} />
              <NavItem to="/company/invite" icon={<UserPlus className="w-5 h-5" />} label="Convidar Membro" onNavigate={onNavigate} />
              <SectionLabel>Meu Perfil</SectionLabel>
            </>
          )}

          <NavItem to="/dashboard" icon={<LayoutDashboard className="w-5 h-5" />} label="Meu Dashboard" onNavigate={onNavigate} />
          <NavItem to="/profile/edit" icon={<UserCog className="w-5 h-5" />} label="Editar Perfil" onNavigate={onNavigate} />
        </ul>

        <div className="border-t border-slate-800/80 pt-3 mt-3">
          <button
            onClick={() => { onNavigate?.(); onLogout(); navigate('/'); }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 text-sm"
          >
            <LogOut className="w-5 h-5" />
            <span>Sair</span>
          </button>
        </div>
      </nav>
    </div>
  );
};

/** Desktop sidebar (fixed rail). Hidden on mobile — AppShell renders the Sheet there. */
const Sidebar: React.FC<SidebarProps> = (props) => (
  <aside className="hidden lg:flex w-64 min-h-screen border-r border-slate-800 shrink-0">
    <SidebarContent {...props} />
  </aside>
);

export default Sidebar;
