import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  LayoutDashboard, BarChart3, Contact, Scissors, Users, UserPlus,
  Building2, UserCog, ExternalLink, Copy, LogOut, Search,
} from 'lucide-react';

type Props = {
  isAdmin: boolean;
  organizationSlug: string | null;
  memberSlug?: string | null;
  onLogout: () => void;
};

/** Paleta de comandos global (Ctrl/Cmd+K) para navegar e agir rápido. */
export default function CommandPalette({ isAdmin, organizationSlug, memberSlug, onLogout }: Props) {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const go = (to: string) => { setOpen(false); navigate(to); };

  const copyLink = async (path: string, label: string) => {
    setOpen(false);
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${path}`);
      toast.success(`${label} copiado!`);
    } catch { toast.error('Não foi possível copiar.'); }
  };

  const Item = ({ icon, label, onSelect, kw }: { icon: React.ReactNode; label: string; onSelect: () => void; kw?: string }) => (
    <Command.Item
      value={`${label} ${kw || ''}`}
      onSelect={onSelect}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-gray-700 cursor-pointer data-[selected=true]:bg-indigo-50 data-[selected=true]:text-indigo-700 transition-colors"
    >
      <span className="text-gray-400">{icon}</span>
      {label}
    </Command.Item>
  );

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4 bg-black/40" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <Command className="bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden" loop>
          <div className="flex items-center gap-2 px-4 border-b border-gray-100">
            <Search className="w-4 h-4 text-gray-300" />
            <Command.Input
              autoFocus
              placeholder="Buscar tela ou ação…"
              className="w-full py-3.5 text-sm outline-none placeholder:text-gray-300"
            />
            <kbd className="text-[10px] text-gray-300 border border-gray-200 rounded px-1.5 py-0.5">ESC</kbd>
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="py-8 text-center text-sm text-gray-400">Nada encontrado.</Command.Empty>

            <Command.Group heading="Navegar" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-group-heading]]:font-bold">
              <Item icon={<LayoutDashboard className="w-4 h-4" />} label="Meu Dashboard" onSelect={() => go('/dashboard')} kw="agenda dia" />
              {isAdmin && <Item icon={<BarChart3 className="w-4 h-4" />} label="Visão Geral" onSelect={() => go('/company/dashboard')} kw="analytics faturamento" />}
              {isAdmin && <Item icon={<Contact className="w-4 h-4" />} label="Clientes" onSelect={() => go('/company/clients')} kw="crm historico" />}
              {isAdmin && <Item icon={<Scissors className="w-4 h-4" />} label="Serviços" onSelect={() => go('/company/services')} kw="precos catalogo" />}
              {isAdmin && <Item icon={<Users className="w-4 h-4" />} label="Equipe" onSelect={() => go('/company/team')} kw="membros comissao" />}
              {isAdmin && <Item icon={<UserPlus className="w-4 h-4" />} label="Convidar Membro" onSelect={() => go('/company/invite')} />}
              {isAdmin && <Item icon={<Building2 className="w-4 h-4" />} label="Perfil da Empresa" onSelect={() => go('/company/profile')} kw="logo capa" />}
              <Item icon={<UserCog className="w-4 h-4" />} label="Editar Perfil" onSelect={() => go('/profile/edit')} />
            </Command.Group>

            <Command.Group heading="Ações" className="[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-widest [&_[cmdk-group-heading]]:text-gray-400 [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:mt-2">
              {isAdmin && organizationSlug && (
                <Item icon={<ExternalLink className="w-4 h-4" />} label="Abrir página da empresa" onSelect={() => { setOpen(false); window.open(`/${organizationSlug}`, '_blank'); }} />
              )}
              {organizationSlug && memberSlug && (
                <Item icon={<Copy className="w-4 h-4" />} label="Copiar meu link de agendamento" onSelect={() => copyLink(`/${organizationSlug}/${memberSlug}`, 'Link')} />
              )}
              <Item icon={<LogOut className="w-4 h-4" />} label="Sair" onSelect={() => { setOpen(false); onLogout(); navigate('/'); }} />
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
