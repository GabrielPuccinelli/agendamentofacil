import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { ConfirmButton } from './ConfirmButton';
import { Clock3, Phone, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

type Item = {
  id: string;
  client_name: string;
  client_phone: string;
  note: string | null;
  created_at: string;
  services: { name: string } | null;
};

type Props = { memberId: string };

const waLink = (phone: string) => `https://wa.me/55${phone.replace(/\D/g, '')}`;

/** Lista de espera do profissional (clientes que não acharam horário). */
export default function ManageWaitlist({ memberId }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('waitlist')
      .select('id, client_name, client_phone, note, created_at, services(name)')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setItems((data || []) as unknown as Item[]); setLoading(false); });
  }, [memberId]);

  const remove = async (id: string) => {
    const { error } = await supabase.from('waitlist').delete().eq('id', id);
    if (error) { toast.error('Não foi possível remover.'); return; }
    setItems(items.filter((i) => i.id !== id));
    toast.success('Removido da lista.');
  };

  if (loading) return <div className="h-16 bg-gray-100 rounded-2xl animate-pulse" />;
  if (items.length === 0) return null; // só aparece quando há gente esperando

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Clock3 className="w-5 h-5 text-indigo-500" />
        <h2 className="text-lg font-bold text-gray-900">Lista de espera</h2>
        <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-semibold">{items.length}</span>
      </div>
      <div className="space-y-2">
        {items.map((it) => (
          <div key={it.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
              {it.client_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{it.client_name}</p>
              <p className="text-xs text-gray-400">
                {it.services?.name ? `${it.services.name} · ` : ''}
                desde {format(new Date(it.created_at), "dd/MM", { locale: ptBR })}
              </p>
            </div>
            <a
              href={waLink(it.client_phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium transition-colors shrink-0"
            >
              <Phone className="w-3.5 h-3.5" /> Chamar
            </a>
            <ConfirmButton
              onConfirm={() => remove(it.id)}
              title="Remover da lista?"
              description="O cliente sairá da sua lista de espera."
              confirmText="Remover"
            >
              <button className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all" title="Remover">
                <Trash2 className="w-4 h-4" />
              </button>
            </ConfirmButton>
          </div>
        ))}
      </div>
    </div>
  );
}
