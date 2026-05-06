import React from 'react';
import { Link, useLocation } from 'react-router-dom';

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
  onLogout: () => void;
};

// ── Icons ──────────────────────────────────────────────────────────────────
const HomeIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);
const ChartIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);
const EditIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const UserSmIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
  </svg>
);
const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
);
const CalendarIcon = () => (
  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const ExternalIcon = () => (
  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
  </svg>
);
// ────────────────────────────────────────────────────────────────────────────

const Sidebar: React.FC<SidebarProps> = ({
  userProfile, isAdmin, members, organizationSlug, organizationName, onLogout,
}) => {
  const location = useLocation();

  const NavItem = ({ to, icon, label, badge }: { to: string; icon: React.ReactNode; label: string; badge?: string }) => {
    const isActive = location.pathname === to;
    return (
      <li>
        <Link
          to={to}
          className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 ${
            isActive
              ? 'bg-indigo-500/20 text-indigo-300 font-medium'
              : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
          }`}
        >
          <span className={isActive ? 'text-indigo-400' : ''}>{icon}</span>
          <span className="flex-1">{label}</span>
          {badge && (
            <span className="text-xs bg-indigo-500/20 text-indigo-300 px-1.5 py-0.5 rounded-md">{badge}</span>
          )}
          {isActive && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />}
        </Link>
      </li>
    );
  };

  return (
    <aside className="w-64 bg-slate-950 flex flex-col min-h-screen border-r border-slate-800 shrink-0">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-800">
        <Link to="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center">
            <CalendarIcon />
          </div>
          <span className="text-white font-bold text-sm">AgendaFácil</span>
        </Link>
      </div>

      {/* User profile */}
      <div className="px-4 py-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <img
            src={userProfile?.avatarUrl || 'https://via.placeholder.com/150'}
            alt="Avatar"
            className="w-10 h-10 rounded-xl border-2 border-indigo-500/30 object-cover flex-shrink-0"
          />
          <div className="min-w-0">
            <p className="text-white font-medium text-sm truncate">{userProfile?.name || 'Carregando...'}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
              isAdmin ? 'bg-violet-500/20 text-violet-300' : 'bg-slate-700 text-slate-400'
            }`}>
              {isAdmin ? 'Admin' : 'Funcionário'}
            </span>
          </div>
        </div>

        {/* Company link for admins */}
        {isAdmin && organizationSlug && (
          <a
            href={`/e/${organizationSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs hover:bg-indigo-500/20 transition-all"
          >
            <ExternalIcon />
            <span className="truncate flex-1">{organizationName || 'Página da empresa'}</span>
          </a>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex flex-col flex-grow p-3 overflow-y-auto">
        <ul className="flex-grow space-y-1">

          {/* Admin nav */}
          {isAdmin && (
            <>
              <li className="pt-1 pb-1">
                <p className="text-xs uppercase text-slate-600 font-bold px-3 tracking-widest">Empresa</p>
              </li>
              <NavItem to="/company/dashboard" icon={<ChartIcon />} label="Painel da Empresa" badge="Analytics" />
              <li className="pt-3 pb-1">
                <p className="text-xs uppercase text-slate-600 font-bold px-3 tracking-widest">Meu Perfil</p>
              </li>
            </>
          )}

          <NavItem to="/dashboard" icon={<HomeIcon />} label="Meu Dashboard" />
          <NavItem to="/profile/edit" icon={<EditIcon />} label="Editar Perfil" />

          {/* Team members list (admin only) */}
          {isAdmin && members.length > 0 && organizationSlug && (
            <li className="mt-4">
              <p className="text-xs uppercase text-slate-600 font-bold px-3 mb-2 tracking-widest">Equipe</p>
              <ul className="space-y-1">
                {members.map((member) => (
                  <li key={member.id}>
                    <Link
                      to={`/${organizationSlug}/p/${member.slug}/dashboard`}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-all duration-200"
                    >
                      <div className="w-6 h-6 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0">
                        <UserSmIcon />
                      </div>
                      <span className="text-xs truncate">{member.name}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </li>
          )}
        </ul>

        <div className="border-t border-slate-800 pt-3 mt-3">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 text-sm"
          >
            <LogoutIcon />
            <span>Sair</span>
          </button>
        </div>
      </nav>
    </aside>
  );
};

export default Sidebar;
