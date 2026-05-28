import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, CalendarDays } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { SidebarContent } from '@/components/Sidebar';
import type { SidebarProps } from '@/components/Sidebar';
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

  return (
    <div className="flex min-h-screen bg-slate-50">
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
        </header>

        <main className={cn('flex-1 p-4 sm:p-6 md:p-8 overflow-auto min-w-0', mainClassName)}>
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppShell;
