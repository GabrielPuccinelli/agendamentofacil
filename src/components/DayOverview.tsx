import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import StatCard from './StatCard';
import EmptyState from './EmptyState';
import { CalendarCheck, CalendarClock, UserRound, Gauge, Phone, CalendarDays, Check, X, BellRing } from 'lucide-react';
import { format, startOfDay, endOfDay, addDays, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip } from 'recharts';

const METHOD_COLORS: Record<string, string> = { Pix: '#6366f1', Dinheiro: '#10b981', 'Débito': '#f59e0b', 'Crédito': '#7c3aed', Outro: '#94a3b8' };

type Booking = {
  id: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string | null;
  status: string;
  paid: boolean;
  payment_method: string | null;
  services: { name: string; price: number } | null;
};

const PAYMENT_METHODS = ['Pix', 'Dinheiro', 'Débito', 'Crédito'];

type Props = { memberId: string };

const waLink = (phone: string) => `https://wa.me/55${phone.replace(/\D/g, '')}`;

const dayLabel = (d: Date) =>
  isToday(d) ? 'Hoje' : isTomorrow(d) ? 'Amanhã' : format(d, "EEEE, dd 'de' MMMM", { locale: ptBR });

/** Visão do dia do profissional: métricas + agenda de hoje + próximos 7 dias. */
export default function DayOverview({ memberId }: Props) {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [occupancy, setOccupancy] = useState<number | null>(null);
  const [monthFin, setMonthFin] = useState<{ received: number; toReceive: number; byMethod: Record<string, number> }>({ received: 0, toReceive: 0, byMethod: {} });

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const [{ data: bookingData }, { data: availabilityData }, { data: monthData }] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, start_time, end_time, client_name, client_phone, status, paid, payment_method, services(name, price)')
          .eq('member_id', memberId)
          .neq('status', 'cancelled')
          .gte('start_time', startOfDay(now).toISOString())
          .lte('start_time', endOfDay(addDays(now, 7)).toISOString())
          .order('start_time'),
        supabase
          .from('availability')
          .select('day_of_week, start_time, end_time')
          .eq('member_id', memberId)
          .eq('day_of_week', now.getDay()),
        supabase
          .from('bookings')
          .select('status, paid, payment_method, services(price)')
          .eq('member_id', memberId)
          .neq('status', 'cancelled')
          .gte('start_time', startMonth.toISOString())
          .lte('start_time', endOfDay(addDays(now, 60)).toISOString()),
      ]);

      // Resumo financeiro do mês
      let received = 0, toReceive = 0;
      const byMethod: Record<string, number> = {};
      (monthData || []).forEach((b: any) => {
        const price = b.services?.price || 0;
        if (b.paid) { received += price; const m = b.payment_method || 'Outro'; byMethod[m] = (byMethod[m] || 0) + price; }
        else toReceive += price;
      });
      setMonthFin({ received, toReceive, byMethod });

      const list = (bookingData || []) as unknown as Booking[];
      setBookings(list);

      // Ocupação de hoje: minutos agendados / minutos de expediente
      const work = (availabilityData || [])[0];
      if (work) {
        const [sh, sm] = work.start_time.split(':').map(Number);
        const [eh, em] = work.end_time.split(':').map(Number);
        const workMinutes = (eh * 60 + em) - (sh * 60 + sm);
        const todayBooked = list
          .filter((b) => isToday(new Date(b.start_time)))
          .reduce((acc, b) => acc + (new Date(b.end_time).getTime() - new Date(b.start_time).getTime()) / 60000, 0);
        setOccupancy(workMinutes > 0 ? Math.min(100, Math.round((todayBooked / workMinutes) * 100)) : null);
      }
      setLoading(false);
    };
    load();
  }, [memberId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  const pending = bookings.filter((b) => b.status === 'pending');
  const confirmed = bookings.filter((b) => b.status !== 'pending');
  const todayBookings = confirmed.filter((b) => isToday(new Date(b.start_time)));
  const upcoming = confirmed.filter((b) => !isToday(new Date(b.start_time)));
  const next = bookings.find((b) => new Date(b.start_time) > new Date() && b.status !== 'pending');

  // Agrupa os próximos por dia
  const upcomingByDay = upcoming.reduce<Record<string, Booking[]>>((acc, b) => {
    const key = format(new Date(b.start_time), 'yyyy-MM-dd');
    (acc[key] = acc[key] || []).push(b);
    return acc;
  }, {});

  const handleDecision = async (id: string, decision: 'confirmed' | 'cancelled') => {
    const { error } = await supabase.from('bookings').update({ status: decision }).eq('id', id);
    if (error) { toast.error('Não foi possível atualizar o agendamento.'); return; }
    setBookings((prev) => decision === 'cancelled'
      ? prev.filter((b) => b.id !== id)
      : prev.map((b) => b.id === id ? { ...b, status: 'confirmed' } : b));
    toast.success(decision === 'confirmed' ? 'Agendamento confirmado!' : 'Agendamento recusado.');
  };

  const markPaid = async (id: string, method: string) => {
    // Marcar pago = serviço realizado + como foi pago
    const { error } = await supabase
      .from('bookings')
      .update({ paid: true, payment_method: method, paid_at: new Date().toISOString(), status: 'completed' })
      .eq('id', id);
    if (error) { toast.error('Não foi possível registrar o pagamento.'); return; }
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, paid: true, payment_method: method, status: 'completed' } : b));
    toast.success(`Serviço concluído e pago (${method}).`);
  };

  const markNoShow = async (id: string) => {
    const { error } = await supabase.from('bookings').update({ status: 'cancelled' }).eq('id', id);
    if (error) { toast.error('Não foi possível atualizar.'); return; }
    setBookings((prev) => prev.filter((b) => b.id !== id));
    toast.success('Marcado como não compareceu / cancelado.');
  };

  return (
    <div className="mb-8">
      {/* Pedidos pendentes de confirmação */}
      {pending.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <BellRing className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-amber-900">
              {pending.length} pedido{pending.length > 1 ? 's' : ''} aguardando confirmação
            </h2>
          </div>
          <div className="space-y-2">
            {pending.map((b) => (
              <div key={b.id} className="flex items-center gap-3 bg-white border border-amber-100 rounded-xl px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{b.client_name}</p>
                  <p className="text-xs text-gray-400">
                    {format(new Date(b.start_time), "dd/MM 'às' HH:mm", { locale: ptBR })}
                    {b.services?.name && <span> · {b.services.name}</span>}
                  </p>
                </div>
                <button
                  onClick={() => handleDecision(b.id, 'confirmed')}
                  className="flex items-center gap-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                >
                  <Check className="w-3.5 h-3.5" /> Confirmar
                </button>
                <button
                  onClick={() => handleDecision(b.id, 'cancelled')}
                  className="flex items-center gap-1 bg-white border border-gray-200 text-gray-500 hover:text-red-500 hover:border-red-200 text-xs font-semibold px-3 py-2 rounded-lg transition-all"
                >
                  <X className="w-3.5 h-3.5" /> Recusar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<CalendarCheck className="w-5 h-5" />}
          label="Agendamentos hoje"
          value={todayBookings.length}
          countTo={todayBookings.length}
          accent="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={<CalendarClock className="w-5 h-5" />}
          label="Próximos 7 dias"
          value={bookings.length}
          countTo={bookings.length}
          accent="bg-violet-50 text-violet-600"
        />
        <StatCard
          icon={<UserRound className="w-5 h-5" />}
          label="Próximo cliente"
          value={next ? format(new Date(next.start_time), 'HH:mm') : '—'}
          hint={next ? `${next.client_name} · ${dayLabel(new Date(next.start_time))}` : 'Nenhum agendamento futuro'}
          accent="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={<Gauge className="w-5 h-5" />}
          label="Ocupação hoje"
          value={occupancy !== null ? `${occupancy}%` : '—'}
          hint={occupancy === null ? 'Sem expediente hoje' : undefined}
          accent="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Resumo financeiro do mês */}
      {(monthFin.received > 0 || monthFin.toReceive > 0) && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mb-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <div>
              <h2 className="text-lg font-bold text-gray-900">Seu financeiro do mês</h2>
              <p className="text-xs text-gray-400">O que você recebeu e o que tem a receber</p>
            </div>
            <div className="flex gap-4">
              <div className="text-right">
                <p className="text-lg font-extrabold text-emerald-600">R$ {monthFin.received.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-[11px] text-gray-400">recebido</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-extrabold text-amber-500">R$ {monthFin.toReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
                <p className="text-[11px] text-gray-400">a receber</p>
              </div>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4 items-center">
            <div className="grid grid-cols-2 gap-3">
              {['Pix', 'Dinheiro', 'Débito', 'Crédito'].map((m) => (
                <div key={m} className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: METHOD_COLORS[m] }} />
                  <div>
                    <p className="text-sm font-extrabold text-gray-800">R$ {(monthFin.byMethod[m] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                    <p className="text-xs text-gray-400">{m}</p>
                  </div>
                </div>
              ))}
            </div>
            {['Pix', 'Dinheiro', 'Débito', 'Crédito'].some((m) => (monthFin.byMethod[m] || 0) > 0) && (
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={['Pix', 'Dinheiro', 'Débito', 'Crédito'].filter((m) => (monthFin.byMethod[m] || 0) > 0).map((m) => ({ name: m, value: monthFin.byMethod[m] }))}
                    dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={36} outerRadius={64} paddingAngle={2}
                  >
                    {['Pix', 'Dinheiro', 'Débito', 'Crédito'].filter((m) => (monthFin.byMethod[m] || 0) > 0).map((m) => <Cell key={m} fill={METHOD_COLORS[m]} />)}
                  </Pie>
                  <RTooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString('pt-BR')}`} contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Agenda do dia */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Agenda de hoje</h2>
          <p className="text-xs text-gray-400 mb-4 capitalize">{format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}</p>
          {todayBookings.length === 0 ? (
            <EmptyState
              icon={<CalendarDays className="w-6 h-6" />}
              title="Dia livre por enquanto"
              description="Quando um cliente agendar para hoje, ele aparece aqui."
            />
          ) : (
            <ol className="relative border-l-2 border-indigo-100 ml-3 space-y-4">
              {todayBookings.map((b) => {
                const past = new Date(b.end_time) < new Date();
                return (
                  <li key={b.id} className="ml-4 relative">
                    <span className={`absolute -left-[23px] top-1.5 w-3 h-3 rounded-full border-2 border-white ${past ? 'bg-gray-300' : 'bg-indigo-500'}`} />
                    <div className={`rounded-xl border px-4 py-3 ${past ? 'bg-gray-50 border-gray-100 opacity-70' : 'bg-indigo-50/50 border-indigo-100'}`}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-gray-900">
                          {format(new Date(b.start_time), 'HH:mm')} – {format(new Date(b.end_time), 'HH:mm')}
                        </p>
                        {b.client_phone && (
                          <a
                            href={waLink(b.client_phone)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors"
                          >
                            <Phone className="w-3 h-3" /> WhatsApp
                          </a>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 mt-0.5">{b.client_name}</p>
                      {b.services?.name && (
                        <p className="text-xs text-gray-400">
                          {b.services.name}
                          {b.services.price > 0 && <span> · R$ {Number(b.services.price).toFixed(2)}</span>}
                        </p>
                      )}
                      {/* Conclusão / pagamento */}
                      <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                        {b.paid ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                            <Check className="w-3 h-3" /> Realizado · {b.payment_method || 'pago'}
                          </span>
                        ) : (
                          <>
                            <span className="text-[11px] text-gray-400 mr-1">{past ? 'Concluir (pago em):' : 'Marcar pago:'}</span>
                            {PAYMENT_METHODS.map((m) => (
                              <button
                                key={m}
                                onClick={() => markPaid(b.id, m)}
                                className="text-[11px] font-medium text-gray-500 bg-white border border-gray-200 hover:border-emerald-300 hover:text-emerald-600 px-2 py-1 rounded-lg transition-all"
                              >
                                {m}
                              </button>
                            ))}
                            {past && (
                              <button
                                onClick={() => markNoShow(b.id)}
                                className="text-[11px] font-medium text-gray-400 bg-white border border-gray-200 hover:border-red-300 hover:text-red-500 px-2 py-1 rounded-lg transition-all flex items-center gap-1"
                              >
                                <X className="w-3 h-3" /> Não compareceu
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>

        {/* Próximos 7 dias */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-bold text-gray-900 mb-1">Próximos dias</h2>
          <p className="text-xs text-gray-400 mb-4">Agendamentos da semana</p>
          {upcoming.length === 0 ? (
            <EmptyState
              icon={<CalendarClock className="w-6 h-6" />}
              title="Semana ainda vazia"
              description="Compartilhe seu link público para receber agendamentos."
            />
          ) : (
            <div className="space-y-4">
              {Object.entries(upcomingByDay).map(([day, items]) => (
                <div key={day}>
                  <p className="text-[11px] uppercase tracking-widest font-bold text-gray-400 mb-2 capitalize">
                    {dayLabel(new Date(`${day}T12:00:00`))}
                  </p>
                  <div className="space-y-1.5">
                    {items.map((b) => (
                      <div key={b.id} className="flex items-center gap-3 rounded-xl border border-gray-100 px-3 py-2">
                        <span className="text-sm font-bold text-indigo-600 w-12 shrink-0">{format(new Date(b.start_time), 'HH:mm')}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-800 truncate">{b.client_name}</p>
                          {b.services?.name && <p className="text-[11px] text-gray-400 truncate">{b.services.name}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
