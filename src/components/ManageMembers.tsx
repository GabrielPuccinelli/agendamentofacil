import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from './ConfirmButton';
import { Trash2, UserPlus } from 'lucide-react';

type Member = {
  id: string;
  name: string;
  slug: string;
  role: string;
  user_id: string | null;
  can_edit_profile: boolean;
  can_edit_price: boolean;
  can_edit_services: boolean;
};

type FoundUser = {
  found_user_id: string;
  found_name: string;
  found_slug: string;
};

type Props = {
  organizationId: string;
  organizationSlug: string;
};

const Toggle = ({
  checked, onChange, label,
}: {
  checked: boolean; onChange: () => void; label: string;
}) => (
  <label className="flex items-center gap-2 cursor-pointer group">
    <Switch checked={checked} onCheckedChange={onChange} />
    <span className="text-xs text-gray-600 group-hover:text-gray-800 transition-colors select-none">{label}</span>
  </label>
);

const formatSlug = (v: string) =>
  v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export default function ManageMembers({ organizationId, organizationSlug }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  const [error, setError] = useState('');

  // Invite-by-email state
  const [searchEmail, setSearchEmail] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [foundUser, setFoundUser] = useState<FoundUser | null>(null);
  const [inviteSlug, setInviteSlug] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('members')
        .select('id, name, slug, role, user_id, can_edit_profile, can_edit_price, can_edit_services')
        .eq('organization_id', organizationId)
        .order('role')
        .order('name');

      if (error) setError('Não foi possível carregar a equipe.');
      else setMembers(data || []);
      setLoading(false);
    };
    fetchMembers();
  }, [organizationId]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError('');
    setFoundUser(null);
    if (!searchEmail.trim()) return;
    setSearching(true);

    const { data, error } = await supabase.rpc('find_member_by_email', { search_email: searchEmail.trim() });

    setSearching(false);
    if (error) { setSearchError('Erro ao buscar usuário. Tente novamente.'); return; }
    if (!data || data.length === 0) {
      setSearchError('Nenhuma conta encontrada com este e-mail. O usuário precisa se cadastrar primeiro.');
      return;
    }

    const user = data[0] as FoundUser;

    // Check if already in this org
    const alreadyIn = members.some((m) => m.user_id === user.found_user_id);
    if (alreadyIn) {
      setSearchError('Este usuário já faz parte da sua equipe.');
      return;
    }

    setFoundUser(user);
    setInviteSlug(formatSlug(user.found_slug || user.found_name));
  };

  const handleAdd = async () => {
    if (!foundUser || !inviteSlug) return;
    setAdding(true);
    setSearchError('');

    const { data, error } = await supabase.rpc('add_member_to_organization', {
      p_user_id: foundUser.found_user_id,
      p_slug: inviteSlug,
      p_name: foundUser.found_name,
    });

    setAdding(false);
    if (error) {
      setSearchError(
        error.message.includes('slug_taken') || error.message.includes('duplicate key')
          ? 'Esse link já está em uso por outro profissional. Escolha outro.'
          : error.message.includes('already_member')
          ? 'Este usuário já faz parte da sua equipe.'
          : 'Erro ao adicionar membro.',
      );
    } else if (data) {
      setMembers([...members, data]);
      setShowInvite(false);
      setSearchEmail('');
      setFoundUser(null);
      setInviteSlug('');
      toast.success(`${data.name} foi adicionado à equipe!`);
    }
  };

  const handleDelete = async (memberId: string) => {
    const { error } = await supabase.from('members').delete().eq('id', memberId);
    if (error) { toast.error('Não foi possível remover o membro.'); return; }
    setMembers(members.filter((m) => m.id !== memberId));
    toast.success('Membro removido da equipe.');
  };

  const toggleField = async (member: Member, field: 'can_edit_profile' | 'can_edit_price' | 'can_edit_services') => {
    const updated = !member[field];
    const { error } = await supabase.from('members').update({ [field]: updated }).eq('id', member.id);
    if (error) { toast.error('Não foi possível atualizar a permissão.'); return; }
    setMembers(members.map((m) => m.id === member.id ? { ...m, [field]: updated } : m));
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => <div key={i} className="h-16 bg-gray-100 rounded-2xl animate-pulse" />)}
      </div>
    );
  }

  const inputCls = 'block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Equipe</h2>
          <p className="text-sm text-gray-400 mt-0.5">Gerencie os profissionais da sua empresa</p>
        </div>
        <Button
          onClick={() => { setShowInvite(!showInvite); setFoundUser(null); setSearchEmail(''); setSearchError(''); }}
          className="gradient-brand shadow-md shadow-indigo-500/20"
        >
          <UserPlus className="w-4 h-4" />
          Adicionar Membro
        </Button>
      </div>

      {/* Invite by email form */}
      {showInvite && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-6">
          <h3 className="font-semibold text-indigo-800 mb-1">Adicionar profissional à equipe</h3>
          <p className="text-xs text-indigo-500 mb-4">
            O profissional precisa já ter uma conta no AgendaFácil. Busque pelo e-mail cadastrado.
          </p>

          {/* Step 1: Search by email */}
          {!foundUser && (
            <form onSubmit={handleSearch} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-mail do profissional *</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    placeholder="profissional@email.com"
                    required
                    value={searchEmail}
                    onChange={(e) => setSearchEmail(e.target.value)}
                    className={`${inputCls} flex-1`}
                  />
                  <button
                    type="submit"
                    disabled={searching}
                    className="px-4 py-2 text-sm font-semibold text-white gradient-brand rounded-xl hover:opacity-90 disabled:opacity-50 transition-all whitespace-nowrap"
                  >
                    {searching ? 'Buscando...' : 'Buscar'}
                  </button>
                </div>
              </div>
              {searchError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-600 text-sm">{searchError}</p>
                </div>
              )}
              <div className="flex justify-end">
                <button type="button" onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Step 2: Confirm found user */}
          {foundUser && (
            <div className="space-y-4">
              {/* Found user card */}
              <div className="flex items-center gap-3 bg-white border border-indigo-200 rounded-xl p-3">
                <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center text-white font-bold text-sm shrink-0">
                  {foundUser.found_name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{foundUser.found_name}</p>
                  <p className="text-xs text-gray-400">{searchEmail}</p>
                </div>
                <span className="text-xs bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-medium">
                  Conta encontrada ✓
                </span>
              </div>

              {/* Slug field */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Link público do profissional *</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 bg-white transition-all">
                  <span className="bg-gray-50 text-gray-400 text-xs px-3 py-3 whitespace-nowrap border-r border-gray-200">/p/</span>
                  <input
                    type="text"
                    placeholder="nome-profissional"
                    required
                    value={inviteSlug}
                    onChange={(e) => setInviteSlug(formatSlug(e.target.value))}
                    className="flex-1 px-3 py-3 text-sm outline-none"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">Usado na URL pública de agendamento do profissional.</p>
              </div>

              {searchError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-xl p-3">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-red-600 text-sm">{searchError}</p>
                </div>
              )}

              <div className="flex gap-2 justify-between">
                <button
                  type="button"
                  onClick={() => { setFoundUser(null); setSearchError(''); }}
                  className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
                >
                  ← Voltar
                </button>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setShowInvite(false)} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={handleAdd}
                    disabled={adding || !inviteSlug}
                    className="px-4 py-2 text-sm font-semibold text-white gradient-brand rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
                  >
                    {adding ? 'Adicionando...' : 'Confirmar'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {error && !showInvite && <p className="text-red-600 text-sm mb-4">{error}</p>}

      {/* Members list */}
      <div className="space-y-3">
        {members.map((member) => (
          <div key={member.id} className="bg-white border border-gray-100 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Avatar + info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                member.role === 'admin' ? 'gradient-brand' : 'bg-gradient-to-br from-slate-500 to-slate-600'
              }`}>
                {member.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-900 text-sm">{member.name}</p>
                  <span className={`text-xs px-1.5 py-0.5 rounded-md font-medium ${
                    member.role === 'admin' ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {member.role === 'admin' ? 'Admin' : 'Funcionário'}
                  </span>
                  {!member.user_id && (
                    <span className="text-xs px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-600 font-medium">
                      Sem conta vinculada
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3 mt-1 flex-wrap">
                  <Link
                    to={`/${organizationSlug}/p/${member.slug}/dashboard`}
                    className="text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
                  >
                    Ver dashboard →
                  </Link>
                  <a
                    href={`/${organizationSlug}/${member.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Link público ↗
                  </a>
                </div>
              </div>
            </div>

            {/* Permissions (staff only) */}
            {member.role === 'staff' && (
              <div className="flex flex-col gap-2 shrink-0">
                <Toggle
                  checked={member.can_edit_profile}
                  onChange={() => toggleField(member, 'can_edit_profile')}
                  label="Editar perfil"
                />
                <Toggle
                  checked={member.can_edit_services}
                  onChange={() => toggleField(member, 'can_edit_services')}
                  label="Gerenciar serviços"
                />
                <Toggle
                  checked={member.can_edit_price}
                  onChange={() => toggleField(member, 'can_edit_price')}
                  label="Alterar preços"
                />
              </div>
            )}

            {/* Delete */}
            {member.role === 'staff' && (
              <ConfirmButton
                onConfirm={() => handleDelete(member.id)}
                title={`Remover ${member.name}?`}
                description="O profissional perderá o acesso ao painel desta empresa. Esta ação não pode ser desfeita."
                confirmText="Remover"
              >
                <button
                  className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                  title="Remover membro"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </ConfirmButton>
            )}
          </div>
        ))}

        {members.length === 0 && (
          <div className="text-center py-10 text-gray-400">
            <svg className="w-10 h-10 mx-auto mb-2 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="font-medium text-sm">Nenhum funcionário adicionado ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
