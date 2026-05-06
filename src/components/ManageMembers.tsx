import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link } from 'react-router-dom';

type Member = {
  id: string;
  name: string;
  slug: string;
  role: string;
  user_id: string | null;
  can_edit_profile: boolean;
  can_edit_price: boolean;
};

type Props = {
  organizationId: string;
  organizationSlug: string;
};

const Toggle = ({
  checked, onChange, label, color = 'indigo',
}: {
  checked: boolean; onChange: () => void; label: string; color?: 'indigo' | 'violet';
}) => (
  <label className="flex items-center gap-2 cursor-pointer group">
    <div className="relative">
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <div className={`w-9 h-5 rounded-full transition-all duration-200 ${
        checked
          ? color === 'violet' ? 'bg-violet-500' : 'bg-indigo-500'
          : 'bg-gray-200'
      }`} />
      <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${checked ? 'translate-x-4' : ''}`} />
    </div>
    <span className="text-xs text-gray-600 group-hover:text-gray-800 transition-colors">{label}</span>
  </label>
);

const formatSlug = (v: string) =>
  v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export default function ManageMembers({ organizationId, organizationSlug }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('members')
        .select('id, name, slug, role, user_id, can_edit_profile, can_edit_price')
        .eq('organization_id', organizationId)
        .order('role')
        .order('name');

      if (error) setError('Não foi possível carregar a equipe.');
      else setMembers(data || []);
      setLoading(false);
    };
    fetchMembers();
  }, [organizationId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    const { data, error } = await supabase
      .from('members')
      .insert({ name, slug, organization_id: organizationId, role: 'staff', can_edit_price: false })
      .select()
      .single();

    if (error) {
      setError(error.message.includes('duplicate key') ? 'Esse link já está em uso por outro profissional.' : 'Erro ao criar membro.');
    } else if (data) {
      setMembers([...members, data]);
      setName(''); setSlug('');
      setShowCreate(false);
    }
    setCreating(false);
  };

  const handleDelete = async (memberId: string) => {
    if (!window.confirm('Remover este membro da equipe?')) return;
    const { error } = await supabase.from('members').delete().eq('id', memberId);
    if (error) setError('Não foi possível remover o membro.');
    else setMembers(members.filter((m) => m.id !== memberId));
  };

  const toggleField = async (member: Member, field: 'can_edit_profile' | 'can_edit_price') => {
    const updated = !member[field];
    const { error } = await supabase.from('members').update({ [field]: updated }).eq('id', member.id);
    if (error) { setError('Não foi possível atualizar a permissão.'); return; }
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
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 gradient-brand text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-md shadow-indigo-500/20"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Adicionar Membro
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-6">
          <h3 className="font-semibold text-indigo-800 mb-4">Novo profissional</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome completo *</label>
              <input type="text" placeholder="Maria Souza" required value={name} onChange={(e) => setName(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Link público *</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 bg-white transition-all">
                <span className="bg-gray-50 text-gray-400 text-xs px-3 py-3 whitespace-nowrap border-r border-gray-200">/p/</span>
                <input
                  type="text" placeholder="maria-manicure" required
                  value={slug} onChange={(e) => setSlug(formatSlug(e.target.value))}
                  className="flex-1 px-3 py-3 text-sm outline-none"
                />
              </div>
            </div>
          </div>
          {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
              Cancelar
            </button>
            <button type="submit" disabled={creating} className="px-4 py-2 text-sm font-semibold text-white gradient-brand rounded-xl hover:opacity-90 disabled:opacity-50 transition-all">
              {creating ? 'Adicionando...' : 'Adicionar'}
            </button>
          </div>
        </form>
      )}

      {error && !showCreate && <p className="text-red-600 text-sm mb-4">{error}</p>}

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
                      Sem acesso
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
                    href={`/e/${organizationSlug}/p/${member.slug}`}
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
                  label="Pode editar perfil"
                  color="indigo"
                />
                <Toggle
                  checked={member.can_edit_price}
                  onChange={() => toggleField(member, 'can_edit_price')}
                  label="Pode alterar preços"
                  color="violet"
                />
              </div>
            )}

            {/* Delete */}
            {member.role === 'staff' && (
              <button
                onClick={() => handleDelete(member.id)}
                className="shrink-0 w-8 h-8 flex items-center justify-center text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                title="Remover membro"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
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
