import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Check, Circle, X, Rocket } from 'lucide-react';

type Step = { label: string; done: boolean; to: string; cta: string };

type Props = {
  isAdmin: boolean;
  memberId: string;
  organizationId: string;
  organizationSlug: string | null;
  memberSlug: string | null;
};

/**
 * Checklist de primeiros passos. Aparece até tudo estar configurado
 * (ou até o usuário dispensar). Guarda a dispensa em localStorage.
 */
export default function GettingStarted({ isAdmin, memberId, organizationId, organizationSlug, memberSlug }: Props) {
  const [steps, setSteps] = useState<Step[] | null>(null);
  const dismissKey = `gs_dismissed_${memberId}`;
  const [dismissed, setDismissed] = useState(() => localStorage.getItem(dismissKey) === '1');

  useEffect(() => {
    const load = async () => {
      const [{ count: servicesCount }, { count: availCount }, { count: assignedCount }] = await Promise.all([
        supabase.from('services').select('id', { count: 'exact', head: true }).eq('organization_id', organizationId),
        supabase.from('availability').select('id', { count: 'exact', head: true }).eq('member_id', memberId),
        supabase.from('member_services').select('member_id', { count: 'exact', head: true }).eq('member_id', memberId),
      ]);

      const publicLink = organizationSlug && memberSlug ? `/${organizationSlug}/${memberSlug}` : '/dashboard';

      const list: Step[] = isAdmin
        ? [
            { label: 'Cadastrar seus serviços', done: (servicesCount || 0) > 0, to: '/company/services', cta: 'Criar serviços' },
            { label: 'Definir seus horários de atendimento', done: (availCount || 0) > 0, to: '/dashboard', cta: 'Definir horários' },
            { label: 'Completar o perfil público da empresa', done: false, to: '/company/profile', cta: 'Editar perfil' },
            { label: 'Compartilhar seu link de agendamento', done: false, to: publicLink, cta: 'Ver meu link' },
          ]
        : [
            { label: 'Definir seus horários de atendimento', done: (availCount || 0) > 0, to: '/dashboard', cta: 'Definir horários' },
            { label: 'Ativar os serviços que você faz', done: (assignedCount || 0) > 0, to: '/dashboard', cta: 'Escolher serviços' },
            { label: 'Compartilhar seu link de agendamento', done: false, to: publicLink, cta: 'Ver meu link' },
          ];
      setSteps(list);
    };
    load();
  }, [isAdmin, memberId, organizationId, organizationSlug, memberSlug]);

  if (dismissed || !steps) return null;

  const doneCount = steps.filter((s) => s.done).length;
  const pct = Math.round((doneCount / steps.length) * 100);
  // Some passos não são detectáveis (perfil/compartilhar); só some ao dispensar.

  const dismiss = () => { localStorage.setItem(dismissKey, '1'); setDismissed(true); };

  return (
    <div className="bg-white border border-indigo-100 rounded-2xl p-5 mb-8 shadow-sm relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
      <div className="relative">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center shrink-0">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900">Primeiros passos</h2>
              <p className="text-xs text-gray-400">Configure sua conta para começar a receber agendamentos</p>
            </div>
          </div>
          <button onClick={dismiss} title="Dispensar" className="text-gray-300 hover:text-gray-500 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Barra de progresso */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full gradient-brand rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
          </div>
          <span className="text-xs font-bold text-indigo-600 shrink-0">{doneCount}/{steps.length}</span>
        </div>

        <ul className="space-y-2">
          {steps.map((s) => (
            <li key={s.label} className="flex items-center gap-3">
              {s.done
                ? <Check className="w-5 h-5 text-emerald-500 shrink-0" />
                : <Circle className="w-5 h-5 text-gray-200 shrink-0" />}
              <span className={`flex-1 text-sm ${s.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>{s.label}</span>
              {!s.done && (
                <Link to={s.to} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors shrink-0">
                  {s.cta} →
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
