import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Bell, CalendarClock, ArrowLeft, Phone, Clock, X } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Item = {
  id: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string | null;
  status: string;
  paid: boolean;
  payment_method: string | null;
  created_at: string;
  services: { name: string; price: number } | null;
};

const waLink = (phone: string) => `https://wa.me/55${phone.replace(/\D/g, '')}`;

const dayLabel = (d: Date) =>
  isToday(d) ? 'Hoje' : isTomorrow(d) ? 'Amanhã' : format(d, 'dd/MM', { locale: ptBR });

/**
 * Sino de notificações — autônomo: descobre o próprio member/org pela sessão,
 * mostra os agendamentos mais recentes (por criação) e abre os detalhes ao clicar.
 */
export default function NotificationBell() {
  const [items, setItems] = useState<Item[]>([]);
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<Item | null>(null);
  const [lastSeen, setLastSeen] = useState<number>(() => Number(localStorage.getItem('notif_last_seen') || 0));
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set(JSON.parse(localStorage.getItem('notif_dismissed') || '[]')));
  const ref = useRef<HTMLDivElement>(null);

  const persistDismissed = (s: Set<string>) => localStorage.setItem('notif_dismissed', JSON.stringify([...s]));
  const dismiss = (id: string) => setDismissed((prev) => { const n = new Set(prev); n.add(id); persistDismissed(n); return n; });
  const dismissAll = () => setDismissed((prev) => { const n = new Set(prev); visible.forEach((i) => n.add(i.id)); persistDismissed(n); return n; });

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
        .select('id, start_time, end_time, client_name, client_phone, status, paid, payment_method, created_at, services(name, price)')
        .in('member_id', memberIds)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(15);
      setItems((data || []) as unknown as Item[]);
    };
    load();
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSelected(null); }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const visible = items.filter((i) => !dismissed.has(i.id));
  const pendingCount = visible.filter((i) => i.status === 'pending').length;
  const newSinceSeen = Math.max(visible.length - lastSeen, 0);
  const badge = pendingCount > 0 ? pendingCount : newSinceSeen;

  const toggle = () => {
    const next = !open;
    setOpen(next);
    setSelected(null);
    if (next) {
      localStorage.setItem('notif_last_seen', String(visible.length));
      setLastSeen(visible.length);
    }
  };

  const statusLabel = (s: string) => s === 'pending' ? 'Pendente' : s === 'completed' ? 'Realizado' : 'Confirmado';

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
          {selected ? (
            /* Detalhe do agendamento */
            <div>
              <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-50">
                <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <p className="font-bold text-gray-900 text-sm">Detalhes do agendamento</p>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold shrink-0 ${selected.status === 'pending' ? 'bg-amber-400' : 'gradient-brand'}`}>
                    {selected.client_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{selected.client_name}</p>
                    <span className={`text-[11px] font-semibold ${selected.status === 'pending' ? 'text-amber-500' : 'text-emerald-500'}`}>
                      {statusLabel(selected.status)}{selected.paid ? ` · Pago${selected.payment_method ? ` (${selected.payment_method})` : ''}` : ''}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5 text-sm border-t border-gray-50 pt-3">
                  <p className="flex items-center gap-2 text-gray-600"><Clock className="w-4 h-4 text-gray-300" /> {format(new Date(selected.start_time), "EEEE, dd/MM 'às' HH:mm", { locale: ptBR })}</p>
                  {selected.services?.name && (
                    <p className="flex justify-between"><span className="text-gray-400">Serviço</span><strong className="text-gray-700">{selected.services.name}</strong></p>
                  )}
                  {selected.services?.price ? (
                    <p className="flex justify-between"><span className="text-gray-400">Valor</span><strong className="text-gray-700">R$ {Number(selected.services.price).toFixed(2)}</strong></p>
                  ) : null}
                </div>
                {selected.client_phone && (
                  <a
                    href={waLink(selected.client_phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-1.5 w-full bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold py-2.5 rounded-xl transition-all"
                  >
                    <Phone className="w-4 h-4" /> Falar no WhatsApp
                  </a>
                )}
              </div>
            </div>
          ) : (
            /* Lista */
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50">
                <div>
                  <p className="font-bold text-gray-900 text-sm">Notificações</p>
                  <p className="text-xs text-gray-400">
                    {pendingCount > 0 ? `${pendingCount} aguardando confirmação` : 'Agendamentos mais recentes'}
                  </p>
                </div>
                {visible.length > 0 && (
                  <button onClick={dismissAll} className="text-xs text-gray-400 hover:text-indigo-600 transition-colors">Limpar</button>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {visible.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">
                    <CalendarClock className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                    Nenhuma notificação
                  </div>
                ) : (
                  visible.map((it) => (
                    <div
                      key={it.id}
                      className="group flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors"
                    >
                      <button onClick={() => setSelected(it)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
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
                      </button>
                      <button
                        onClick={() => dismiss(it.id)}
                        aria-label="Dispensar"
                        className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
