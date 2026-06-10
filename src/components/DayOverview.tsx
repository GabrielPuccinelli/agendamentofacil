import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import StatCard from './StatCard';
import EmptyState from './EmptyState';
import { CalendarCheck, CalendarClock, UserRound, Gauge, Phone, CalendarDays } from 'lucide-react';
import { format, startOfDay, endOfDay, addDays, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Booking = {
  id: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string | null;
  status: string;
  services: { name: string } | null;
};

type Props = { memberId: string };

const waLink = (phone: string) => `https://wa.me/55${phone.replace(/\D/g, '')}`;

const dayLabel = (d: Date) =>
  isToday(d) ? 'Hoje' : isTomorrow(d) ? 'Amanhã' : format(d, "EEEE, dd 'de' MMMM", { locale: ptBR });

/** Visão do dia do profissional: métricas + agenda de hoje + próximos 7 dias. */
export default function DayOverview({ memberId }: Props) {
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [occupancy, setOccupancy] = useState<number | null>(null);

  useEffect(() => {
    const load = async () => {
      const now = new Date();
      const [{ data: bookingData }, { data: availabilityData }] = await Promise.all([
        supabase
          .from('bookings')
          .select('id, start_time, end_time, client_name, client_phone, status, services(name)')
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
      ]);

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

  const todayBookings = bookings.filter((b) => isToday(new Date(b.start_time)));
  const upcoming = bookings.filter((b) => !isToday(new Date(b.start_time)));
  const next = bookings.find((b) => new Date(b.start_time) > new Date());

  // Agrupa os próximos por dia
  const upcomingByDay = upcoming.reduce<Record<string, Booking[]>>((acc, b) => {
    const key = format(new Date(b.start_time), 'yyyy-MM-dd');
    (acc[key] = acc[key] || []).push(b);
    return acc;
  }, {});

  return (
    <div className="mb-8">
      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<CalendarCheck className="w-5 h-5" />}
          label="Agendamentos hoje"
          value={todayBookings.length}
          accent="bg-indigo-50 text-indigo-600"
        />
        <StatCard
          icon={<CalendarClock className="w-5 h-5" />}
          label="Próximos 7 dias"
          value={bookings.length}
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
                      {b.services?.name && <p className="text-xs text-gray-400">{b.services.name}</p>}
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
