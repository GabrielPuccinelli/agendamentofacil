import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from './ConfirmButton';
import EmptyState from './EmptyState';
import { CalendarOff, Plus, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type TimeBlock = {
  id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
};

type Props = { memberId: string };

const inputCls = 'block w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';

/** Bloqueios de horário: almoço, folga, feriado — somem da página pública. */
export default function ManageTimeBlocks({ memberId }: Props) {
  const [blocks, setBlocks] = useState<TimeBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [date, setDate] = useState('');
  const [startTime, setStartTime] = useState('12:00');
  const [endTime, setEndTime] = useState('13:00');
  const [reason, setReason] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('time_blocks')
        .select('id, start_time, end_time, reason')
        .eq('member_id', memberId)
        .gte('end_time', new Date().toISOString())
        .order('start_time');
      setBlocks(data || []);
      setLoading(false);
    };
    load();
  }, [memberId]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !startTime || !endTime) return;
    const start = new Date(`${date}T${startTime}:00`);
    const end = new Date(`${date}T${endTime}:00`);
    if (end <= start) { toast.error('O horário final deve ser depois do inicial.'); return; }

    setSaving(true);
    const { data, error } = await supabase
      .from('time_blocks')
      .insert({ member_id: memberId, start_time: start.toISOString(), end_time: end.toISOString(), reason: reason.trim() || null })
      .select('id, start_time, end_time, reason')
      .single();
    setSaving(false);

    if (error) { toast.error('Não foi possível criar o bloqueio.'); return; }
    setBlocks([...blocks, data].sort((a, b) => a.start_time.localeCompare(b.start_time)));
    setShowForm(false);
    setDate(''); setReason('');
    toast.success('Horário bloqueado!');
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('time_blocks').delete().eq('id', id);
    if (error) { toast.error('Não foi possível remover o bloqueio.'); return; }
    setBlocks(blocks.filter((b) => b.id !== id));
    toast.success('Bloqueio removido.');
  };

  if (loading) {
    return <div className="h-16 bg-gray-100 rounded-2xl animate-pulse" />;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Bloqueios de Horário</h2>
          <p className="text-xs text-gray-400 mt-0.5">Almoço, folgas e feriados — esses horários somem do seu link público</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} variant={showForm ? 'outline' : 'default'} className={showForm ? '' : 'gradient-brand shadow-md shadow-indigo-500/20'}>
          {showForm ? 'Cancelar' : (<><Plus className="w-4 h-4" /> Bloquear horário</>)}
        </Button>
      </div>

      {showForm && (
        <form onSubmit={handleAdd} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3 items-end">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-medium text-gray-600 mb-1">Data *</label>
            <input type="date" required value={date} min={format(new Date(), 'yyyy-MM-dd')} onChange={(e) => setDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Início *</label>
            <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Fim *</label>
            <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
          </div>
          <div className="col-span-2 sm:col-span-1 flex gap-2">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">Motivo</label>
              <input type="text" placeholder="Almoço" value={reason} onChange={(e) => setReason(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div className="col-span-2 sm:col-span-4 flex justify-end">
            <Button type="submit" disabled={saving} className="gradient-brand">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmar bloqueio'}
            </Button>
          </div>
        </form>
      )}

      {blocks.length === 0 ? (
        <EmptyState
          icon={<CalendarOff className="w-6 h-6" />}
          title="Nenhum bloqueio futuro"
          description="Bloqueie horários de almoço, folgas ou feriados para que clientes não consigam agendar nesses períodos."
        />
      ) : (
        <div className="space-y-2">
          {blocks.map((b) => (
            <div key={b.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
              <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <CalendarOff className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {format(new Date(b.start_time), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                </p>
                <p className="text-xs text-gray-400">
                  {format(new Date(b.start_time), 'HH:mm')} – {format(new Date(b.end_time), 'HH:mm')}
                  {b.reason && <span className="text-gray-500"> · {b.reason}</span>}
                </p>
              </div>
              <ConfirmButton
                onConfirm={() => handleDelete(b.id)}
                title="Remover bloqueio?"
                description="Os horários desse período voltarão a aparecer no seu link público."
                confirmText="Remover"
              >
                <button className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Remover bloqueio">
                  <Trash2 className="w-4 h-4" />
                </button>
              </ConfirmButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
