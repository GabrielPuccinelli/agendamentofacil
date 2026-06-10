import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '../components/ConfirmButton';
import { toast } from 'sonner';
import { format, addMinutes, setHours, setMinutes, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarCheck, CalendarX, CalendarClock, Loader2, ArrowLeft } from 'lucide-react';

type BookingInfo = {
  id: string;
  start_time: string;
  end_time: string;
  client_name: string;
  status: string;
  service_name: string | null;
  service_duration: number | null;
  member_id: string;
  member_name: string;
  member_slug: string;
  organization_name: string | null;
  organization_slug: string | null;
};

type Availability = { day_of_week: number; start_time: string; end_time: string };

/** Página pública para o cliente cancelar ou remarcar via link secreto. */
export default function ManageBookingPage() {
  const { token } = useParams<{ token: string }>();
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState<BookingInfo | null>(null);
  const [error, setError] = useState('');

  // Remarcação
  const [rescheduling, setRescheduling] = useState(false);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [newDate, setNewDate] = useState('');
  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const { data, error } = await supabase.rpc('get_booking_by_token', { p_token: token });
    if (error || !data || data.length === 0) {
      setError('Agendamento não encontrado. Verifique o link.');
      setLoading(false);
      return;
    }
    setBooking(data[0] as BookingInfo);
    setLoading(false);
  };

  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Carrega disponibilidade quando entra no modo remarcar
  useEffect(() => {
    if (!rescheduling || !booking) return;
    supabase
      .from('availability')
      .select('day_of_week, start_time, end_time')
      .eq('member_id', booking.member_id)
      .then(({ data }) => setAvailability(data || []));
  }, [rescheduling, booking]);

  // Calcula slots da data escolhida
  useEffect(() => {
    if (!newDate || !booking) { setSlots([]); return; }
    const calc = async () => {
      const date = new Date(`${newDate}T12:00:00`);
      const work = availability.find((a) => a.day_of_week === date.getDay());
      if (!work) { setSlots([]); return; }

      const [{ data: bookings }, { data: blocks }] = await Promise.all([
        supabase.from('bookings').select('id, start_time, end_time')
          .eq('member_id', booking.member_id).neq('status', 'cancelled')
          .gte('start_time', `${newDate}T00:00:00Z`).lte('end_time', `${newDate}T23:59:59Z`),
        supabase.from('time_blocks').select('start_time, end_time')
          .eq('member_id', booking.member_id)
          .lte('start_time', `${newDate}T23:59:59Z`).gte('end_time', `${newDate}T00:00:00Z`),
      ]);

      const busy = [
        ...(bookings || []).filter((b: any) => b.id !== booking.id),
        ...(blocks || []),
      ];
      const duration = booking.service_duration || 30;
      const [sh, sm] = work.start_time.split(':').map(Number);
      const [eh, em] = work.end_time.split(':').map(Number);
      let cur = setMinutes(setHours(date, sh), sm);
      const end = setMinutes(setHours(date, eh), em);
      const now = new Date();
      const out: string[] = [];
      while (cur < end) {
        const slotEnd = addMinutes(cur, duration);
        if (slotEnd > end) break;
        const occupied = busy.some((b: any) => cur < new Date(b.end_time) && slotEnd > new Date(b.start_time));
        if (!occupied && cur > now) out.push(format(cur, 'HH:mm'));
        cur = slotEnd;
      }
      setSlots(out);
      setSelectedSlot(null);
    };
    calc();
  }, [newDate, availability, booking]);

  const handleCancel = async () => {
    const { error } = await supabase.rpc('cancel_booking_by_token', { p_token: token });
    if (error) { toast.error('Não foi possível cancelar. O horário pode já ter passado.'); return; }
    toast.success('Agendamento cancelado.');
    load();
  };

  const handleReschedule = async () => {
    if (!newDate || !selectedSlot || !booking) return;
    setSaving(true);
    const [h, m] = selectedSlot.split(':').map(Number);
    const start = setMinutes(setHours(new Date(`${newDate}T12:00:00`), h), m);
    const end = addMinutes(start, booking.service_duration || 30);
    const { error } = await supabase.rpc('reschedule_booking_by_token', {
      p_token: token,
      p_start: start.toISOString(),
      p_end: end.toISOString(),
    });
    setSaving(false);
    if (error) {
      toast.error(error.message.includes('slot_taken') ? 'Esse horário acabou de ser ocupado. Escolha outro.' : 'Não foi possível remarcar.');
      return;
    }
    toast.success('Agendamento remarcado!');
    setRescheduling(false);
    setNewDate('');
    load();
  };

  const inputCls = 'block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-400 flex items-center justify-center mx-auto mb-4">
            <CalendarX className="w-7 h-7" />
          </div>
          <p className="font-bold text-gray-800">{error || 'Agendamento não encontrado.'}</p>
          <Link to="/" className="text-sm text-indigo-500 hover:text-indigo-700 mt-3 inline-block">← Página inicial</Link>
        </div>
      </div>
    );
  }

  const cancelled = booking.status === 'cancelled';
  const past = new Date(booking.start_time) < new Date();

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-6">
          <p className="text-xs uppercase tracking-widest text-gray-400 font-bold">{booking.organization_name}</p>
          <h1 className="text-2xl font-extrabold text-gray-900 mt-1">Seu agendamento</h1>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
              cancelled ? 'bg-red-50 text-red-400' : 'bg-emerald-50 text-emerald-500'
            }`}>
              {cancelled ? <CalendarX className="w-5 h-5" /> : <CalendarCheck className="w-5 h-5" />}
            </div>
            <div>
              <p className="font-bold text-gray-900">{cancelled ? 'Cancelado' : past ? 'Realizado' : 'Confirmado'}</p>
              <p className="text-xs text-gray-400">Olá, {booking.client_name}!</p>
            </div>
          </div>

          <div className="space-y-2 text-sm border-t border-gray-50 pt-4">
            <p className="flex justify-between"><span className="text-gray-400">Serviço</span><strong className="text-gray-800">{booking.service_name || '—'}</strong></p>
            <p className="flex justify-between"><span className="text-gray-400">Profissional</span><strong className="text-gray-800">{booking.member_name}</strong></p>
            <p className="flex justify-between"><span className="text-gray-400">Data</span><strong className="text-gray-800 capitalize">{format(new Date(booking.start_time), "EEE, dd 'de' MMMM", { locale: ptBR })}</strong></p>
            <p className="flex justify-between"><span className="text-gray-400">Horário</span><strong className="text-gray-800">{format(new Date(booking.start_time), 'HH:mm')} – {format(new Date(booking.end_time), 'HH:mm')}</strong></p>
          </div>
        </div>

        {!cancelled && !past && !rescheduling && (
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setRescheduling(true)}>
              <CalendarClock className="w-4 h-4" /> Remarcar
            </Button>
            <ConfirmButton
              onConfirm={handleCancel}
              title="Cancelar agendamento?"
              description="O horário será liberado para outros clientes. Esta ação não pode ser desfeita."
              confirmText="Cancelar agendamento"
              cancelText="Voltar"
            >
              <Button variant="outline" className="w-full text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600">
                <CalendarX className="w-4 h-4" /> Cancelar
              </Button>
            </ConfirmButton>
          </div>
        )}

        {rescheduling && !cancelled && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <button onClick={() => setRescheduling(false)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 mb-4 transition-colors">
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
            <h2 className="font-bold text-gray-900 mb-4">Escolha a nova data</h2>
            <input
              type="date"
              value={newDate}
              min={format(new Date(), 'yyyy-MM-dd')}
              max={format(addDays(new Date(), 60), 'yyyy-MM-dd')}
              onChange={(e) => setNewDate(e.target.value)}
              className={inputCls}
            />
            {newDate && (
              <div className="mt-4">
                {slots.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">Nenhum horário disponível nesse dia. Tente outra data.</p>
                ) : (
                  <div className="grid grid-cols-4 gap-2">
                    {slots.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSelectedSlot(s)}
                        className={`py-2 rounded-xl text-sm font-semibold border transition-all ${
                          selectedSlot === s
                            ? 'gradient-brand text-white border-transparent shadow-md shadow-indigo-500/20'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            {selectedSlot && (
              <Button onClick={handleReschedule} disabled={saving} className="w-full mt-4 gradient-brand shadow-md shadow-indigo-500/20">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : `Confirmar para ${format(new Date(`${newDate}T12:00:00`), 'dd/MM')} às ${selectedSlot}`}
              </Button>
            )}
          </div>
        )}

        {(cancelled || past) && booking.organization_slug && (
          <Button asChild className="w-full gradient-brand shadow-md shadow-indigo-500/20">
            <Link to={`/${booking.organization_slug}/${booking.member_slug}`}>
              Fazer novo agendamento
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
