import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, CalendarDays, LayoutDashboard, BarChart3, Contact, UserCog, Command as CommandIcon } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { SidebarContent } from '@/components/Sidebar';
import type { SidebarProps } from '@/components/Sidebar';
import NotificationBell from '@/components/NotificationBell';
import CommandPalette from '@/components/CommandPalette';
import { cn } from '@/lib/utils';

type AppShellProps = SidebarProps & {
  children: React.ReactNode;
  /** Optional extra classes for the <main> element. */
  mainClassName?: string;
};

/**
 * Responsive app layout shell.
 * - Desktop (lg+): fixed sidebar rail + scrollable main.
 * - Mobile: sticky top bar with a hamburger that opens the sidebar in a Sheet.
 */
const AppShell: React.FC<AppShellProps> = ({ children, mainClassName, ...sidebarProps }) => {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Agenda', show: true },
    { to: '/company/dashboard', icon: BarChart3, label: 'Painel', show: sidebarProps.isAdmin },
    { to: '/company/clients', icon: Contact, label: 'Clientes', show: sidebarProps.isAdmin },
    { to: '/profile/edit', icon: UserCog, label: 'Perfil', show: true },
  ].filter((i) => i.show).slice(0, 4);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <CommandPalette
        isAdmin={sidebarProps.isAdmin}
        organizationSlug={sidebarProps.organizationSlug}
        memberSlug={sidebarProps.memberSlug}
        onLogout={sidebarProps.onLogout}
      />
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 min-h-screen border-r border-slate-800 shrink-0">
        <SidebarContent {...sidebarProps} />
      </aside>

      {/* Content column */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-30 flex items-center gap-3 h-14 px-4 bg-slate-950 border-b border-slate-800">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Abrir menu"
                className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-300 hover:bg-slate-800 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72 border-slate-800 bg-slate-950 [&>button]:text-slate-400">
              <SheetTitle className="sr-only">Menu de navegação</SheetTitle>
              <SidebarContent {...sidebarProps} onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>

          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center">
              <CalendarDays className="w-4 h-4 text-white" />
            </div>
            <span className="text-white font-bold text-sm">AgendaFácil</span>
          </Link>
          <div className="ml-auto [&_button]:text-slate-300 [&_button:hover]:bg-slate-800">
            <NotificationBell />
          </div>
        </header>

        {/* Desktop top bar (busca + sino) */}
        <header className="hidden lg:flex items-center justify-end gap-3 h-14 px-8 bg-white border-b border-gray-100">
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
            className="flex items-center gap-2 text-sm text-gray-400 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-3 py-1.5 transition-colors"
          >
            <CommandIcon className="w-3.5 h-3.5" /> Buscar
            <kbd className="text-[10px] text-gray-400 border border-gray-200 rounded px-1 py-0.5 bg-white">Ctrl K</kbd>
          </button>
          <NotificationBell />
        </header>

        <main className={cn('flex-1 p-4 sm:p-6 md:p-8 overflow-auto min-w-0 pb-20 lg:pb-8', mainClassName)}>
          {children}
        </main>

        {/* Navegação inferior (mobile) */}
        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-gray-100 flex items-stretch">
          {navItems.map(({ to, icon: Icon, label }) => {
            const active = location.pathname === to;
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors',
                  active ? 'text-indigo-600' : 'text-gray-400',
                )}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
};

export default AppShell;
