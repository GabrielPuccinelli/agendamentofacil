import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Bell, CalendarClock } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Item = {
  id: string;
  start_time: string;
  client_name: string;
  status: string;
  created_at?: string;
  services: { name: string } | null;
};

/**
 * Sino de notificações — autônomo: descobre o próprio member/org pela sessão
 * e mostra agendamentos futuros (pendentes primeiro). "Não vistos" via localStorage.
 */
export default function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [lastSeen, setLastSeen] = useState<number>(() => Number(localStorage.getItem('notif_last_seen') || 0));
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data: member } = await supabase
        .from('members')
        .select('id, role, organization_id')
        .eq('user_id', session.user.id)
        .order('organization_id', { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();
      if (!member) return;

      let memberIds = [member.id];
      if (member.role === 'admin' && member.organization_id) {
        const { data: all } = await supabase.from('members').select('id').eq('organization_id', member.organization_id);
        memberIds = (all || []).map((m) => m.id);
      }

      const { data } = await supabase
        .from('bookings')
        .select('id, start_time, client_name, status, services(name)')
        .in('member_id', memberIds)
        .neq('status', 'cancelled')
        .gte('start_time', new Date().toISOString())
        .order('start_time')
        .limit(15);
      setItems((data || []) as unknown as Item[]);
    };
    load();
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const pendingCount = items.filter((i) => i.status === 'pending').length;
  // Badge: pendentes (ação necessária) ou novos agendamentos ainda não vistos
  const newSinceSeen = Math.max(items.length - lastSeen, 0);
  const badge = pendingCount > 0 ? pendingCount : newSinceSeen;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      localStorage.setItem('notif_last_seen', String(items.length));
      setLastSeen(items.length);
    }
  };

  const dayLabel = (d: Date) =>
    isToday(d) ? 'Hoje' : isTomorrow(d) ? 'Amanhã' : format(d, 'dd/MM', { locale: ptBR });

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={toggle}
        aria-label="Notificações"
        className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
      >
        <Bell className="w-5 h-5" />
        {badge > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[90vw] bg-white rounded-2xl shadow-xl border border-gray-100 z-50 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-50">
            <p className="font-bold text-gray-900 text-sm">Notificações</p>
            <p className="text-xs text-gray-400">
              {pendingCount > 0 ? `${pendingCount} aguardando confirmação` : 'Próximos agendamentos'}
            </p>
          </div>
          <div className="max-h-80 overflow-y-auto">
            {items.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-400 text-sm">
                <CalendarClock className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                Nenhum agendamento futuro
              </div>
            ) : (
              items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${it.status === 'pending' ? 'bg-amber-400' : 'gradient-brand'}`}>
                    {it.client_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-gray-800 truncate">
                      {it.client_name}
                      {it.status === 'pending' && <span className="ml-1.5 text-[10px] text-amber-500 font-bold">PENDENTE</span>}
                    </p>
                    <p className="text-xs text-gray-400 truncate">
                      {dayLabel(new Date(it.start_time))} · {format(new Date(it.start_time), 'HH:mm')}
                      {it.services?.name && ` · ${it.services.name}`}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
