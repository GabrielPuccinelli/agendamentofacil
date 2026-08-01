import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { addMinutes } from 'date-fns';

type MemberOpt = { id: string; name: string };
type Service = { id: string; name: string; price: number; duration: number };
type ClientOpt = { id: string; name: string; phone: string | null; email: string | null };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Profissional padrão (o usuário logado). */
  defaultMemberId: string;
  organizationId: string;
  /** Admin pode escolher qualquer profissional; staff só ele mesmo. */
  isAdmin: boolean;
  members: MemberOpt[];
  onCreated: () => void;
};

const inputCls = 'block w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';

/** Cadastro manual de agendamento (walk-in / cliente que não usa internet). */
export default function NewBookingDialog({ open, onOpenChange, defaultMemberId, organizationId, isAdmin, members, onCreated }: Props) {
  const [memberId, setMemberId] = useState(defaultMemberId);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceId, setServiceId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientId, setClientId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<ClientOpt[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('09:00');
  const [markPaid, setMarkPaid] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Dinheiro');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setMemberId(defaultMemberId); }, [defaultMemberId]);

  // Autocomplete de clientes cadastrados (busca por nome ou telefone)
  useEffect(() => {
    const term = clientName.trim();
    if (!open || clientId || term.length < 2) { setSuggestions([]); return; }
    const t = setTimeout(async () => {
      const digits = term.replace(/\D/g, '');
      let query = supabase.from('clients').select('id, name, phone, email').eq('organization_id', organizationId).limit(6);
      query = digits.length >= 2
        ? query.or(`name.ilike.%${term}%,phone.ilike.%${digits}%`)
        : query.ilike('name', `%${term}%`);
      const { data } = await query;
      setSuggestions(data || []);
      setShowSuggestions((data || []).length > 0);
    }, 250);
    return () => clearTimeout(t);
  }, [clientName, open, organizationId, clientId]);

  const pickClient = (c: ClientOpt) => {
    setClientId(c.id);
    setClientName(c.name);
    setClientPhone(c.phone || '');
    setClientEmail(c.email || '');
    setShowSuggestions(false);
  };

  // Carrega os serviços do profissional selecionado
  useEffect(() => {
    if (!open || !memberId) return;
    supabase
      .from('member_services')
      .select('services(id, name, price, duration)')
      .eq('member_id', memberId)
      .then(({ data }) => {
        const list = (data || []).map((r: any) => r.services).filter(Boolean) as Service[];
        setServices(list);
        setServiceId((prev) => list.some((s) => s.id === prev) ? prev : (list[0]?.id || ''));
      });
  }, [open, memberId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const service = services.find((s) => s.id === serviceId);
    if (!service || !clientName.trim() || !date || !time) {
      toast.error('Preencha cliente, serviço, data e horário.');
      return;
    }
    setSaving(true);
    const start = new Date(`${date}T${time}:00`);
    const end = addMinutes(start, service.duration);

    // Salva/atualiza o cliente no cadastro (reuso futuro) e vincula ao agendamento
    let resolvedClientId = clientId;
    const phoneDigits = clientPhone.replace(/\D/g, '');
    if (!resolvedClientId && phoneDigits.length >= 8) {
      const { data: up } = await supabase.from('clients')
        .upsert({ organization_id: organizationId, name: clientName.trim(), phone: clientPhone.trim(), email: clientEmail.trim() || null, updated_at: new Date().toISOString() }, { onConflict: 'organization_id,phone' })
        .select('id').single();
      resolvedClientId = up?.id || null;
    }

    const { error } = await supabase.from('bookings').insert({
      member_id: memberId,
      service_id: service.id,
      client_id: resolvedClientId,
      client_name: clientName.trim(),
      client_phone: clientPhone.trim() || null,
      client_email: clientEmail.trim() || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      status: 'confirmed',
      paid: markPaid,
      payment_method: markPaid ? paymentMethod : null,
      paid_at: markPaid ? new Date().toISOString() : null,
    });
    setSaving(false);
    if (error) {
      toast.error(error.code === '23P01' || error.message?.includes('no_overlap')
        ? 'Já existe um agendamento nesse horário para o profissional.'
        : 'Não foi possível criar o agendamento.');
      return;
    }
    toast.success('Agendamento criado!');
    setClientName(''); setClientPhone(''); setClientEmail(''); setClientId(null); setDate(''); setMarkPaid(false);
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Novo agendamento</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-400 -mt-2">Para clientes atendidos pessoalmente ou por telefone.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {isAdmin && members.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Profissional</label>
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className={inputCls}>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <div className="relative">
            <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
            <input
              type="text"
              required
              value={clientName}
              onChange={(e) => { setClientName(e.target.value); setClientId(null); }}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder="Digite para buscar ou cadastrar"
              autoComplete="off"
              className={inputCls}
            />
            {clientId && <span className="absolute right-3 top-8 text-[11px] text-emerald-600 font-semibold">cadastrado ✓</span>}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute z-10 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden">
                {suggestions.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => pickClient(c)}
                    className="w-full text-left px-3 py-2 hover:bg-indigo-50 transition-colors"
                  >
                    <p className="text-sm text-gray-800">{c.name}</p>
                    {c.phone && <p className="text-xs text-gray-400">{c.phone}</p>}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
              <input type="tel" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} placeholder="(XX) XXXXX-XXXX" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
              <input type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="opcional" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Serviço *</label>
            {services.length === 0 ? (
              <p className="text-xs text-amber-600">Este profissional não tem serviços ativos.</p>
            ) : (
              <select value={serviceId} onChange={(e) => setServiceId(e.target.value)} className={inputCls}>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name} · {s.duration}min · R$ {Number(s.price).toFixed(2)}</option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Data *</label>
              <input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Horário *</label>
              <input type="time" required value={time} onChange={(e) => setTime(e.target.value)} className={inputCls} />
            </div>
          </div>
          <label className="flex items-center gap-2 pt-1">
            <input type="checkbox" checked={markPaid} onChange={(e) => setMarkPaid(e.target.checked)} className="rounded" />
            <span className="text-sm text-gray-600">Já pago</span>
            {markPaid && (
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="ml-2 px-2 py-1 border border-gray-200 rounded-lg text-xs">
                {['Dinheiro', 'Pix', 'Débito', 'Crédito'].map((m) => <option key={m}>{m}</option>)}
              </select>
            )}
          </label>
          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={saving || services.length === 0} className="gradient-brand shadow-md shadow-indigo-500/20">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Criar agendamento'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
