import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { toast } from 'sonner';
import { supabase } from '../lib/supabaseClient';
import AppShell from '../components/AppShell';
import { ConfirmButton } from '../components/ConfirmButton';
import type { SidebarProps } from '../components/Sidebar';

type Invite = {
  id: string;
  token: string;
  email: string | null;
  created_at: string;
  accepted_at: string | null;
  expires_at: string;
};

const BASE_URL = window.location.origin;

export default function InviteCreatePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sidebarProps, setSidebarProps] = useState<Omit<SidebarProps, 'onLogout'> | null>(null);
  const [orgId, setOrgId] = useState('');
  const [orgName, setOrgName] = useState('');
  const [adminMemberId, setAdminMemberId] = useState('');

  const [email, setEmail] = useState('');
  const [creating, setCreating] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [newLink, setNewLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data: member } = await supabase
        .from('members')
        .select('id, name, role, organization_id, phone, avatar_url')
        .eq('user_id', session.user.id)
        .single();

      if (!member || member.role !== 'admin') { navigate('/dashboard'); return; }

      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('id', member.organization_id)
        .single();

      setOrgId(member.organization_id);
      setOrgName(org?.name || '');
      setAdminMemberId(member.id);

      // Load existing pending invites
      const { data: existingInvites } = await supabase
        .from('member_invites')
        .select('id, token, email, created_at, accepted_at, expires_at')
        .eq('organization_id', member.organization_id)
        .order('created_at', { ascending: false })
        .limit(10);

      setInvites((existingInvites || []) as Invite[]);

      setSidebarProps({
        userProfile: { name: member.name, phone: member.phone, avatarUrl: member.avatar_url || '' },
        isAdmin: true,
        members: [],
        organizationSlug: org?.slug || null,
        organizationName: org?.name || null,
      });
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    setNewLink('');

    const { data, error: err } = await supabase
      .from('member_invites')
      .insert({
        organization_id: orgId,
        email: email.trim() || null,
        created_by: adminMemberId,
      })
      .select('token')
      .single();

    setCreating(false);
    if (err || !data) {
      setError('Erro ao gerar convite. Tente novamente.');
      return;
    }

    const link = `${BASE_URL}/invite/${data.token}`;
    setNewLink(link);
    setEmail('');

    // Refresh list
    const { data: updated } = await supabase
      .from('member_invites')
      .select('id, token, email, created_at, accepted_at, expires_at')
      .eq('organization_id', orgId)
      .order('created_at', { ascending: false })
      .limit(10);
    setInvites((updated || []) as Invite[]);
  };

  const handleCopy = (link: string) => {
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success('Link copiado para a área de transferência!');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const { error } = await supabase.from('member_invites').delete().eq('id', inviteId);
    if (error) { toast.error('Não foi possível revogar o convite.'); return; }
    setInvites(invites.filter((i) => i.id !== inviteId));
    toast.success('Convite revogado.');
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  if (loading || !sidebarProps) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppShell {...sidebarProps} onLogout={handleLogout}>
      <div className="min-w-0">
        {/* Header */}
        <div className="gradient-brand rounded-2xl p-6 mb-8 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <Link to="/dashboard" className="text-indigo-200 text-sm hover:text-white transition-colors flex items-center gap-1 mb-2 w-fit">
              ← Dashboard
            </Link>
            <p className="text-indigo-200 text-sm">{orgName}</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-0.5">Convidar Funcionário</h1>
            <p className="text-indigo-200 text-sm mt-1">Gere um link e envie para o profissional aceitar o convite</p>
          </div>
        </div>

        <div className="max-w-2xl mx-auto space-y-6">
          {/* Create invite form */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-1">Gerar novo link de convite</h2>
            <p className="text-sm text-gray-400 mb-5">
              O link é válido por 7 dias. Você pode gerar links sem email para compartilhar com qualquer pessoa.
            </p>

            <form onSubmit={handleCreateInvite} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  E-mail do profissional <span className="text-gray-400 font-normal">(opcional)</span>
                </label>
                <input
                  type="email"
                  placeholder="profissional@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">Se preenchido, serve apenas como referência para você.</p>
              </div>

              {error && (
                <p className="text-red-600 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 gradient-brand text-white font-semibold px-6 py-3 rounded-xl hover:opacity-90 disabled:opacity-50 transition-all shadow-md shadow-indigo-500/20"
              >
                {creating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                    </svg>
                    Gerar Link de Convite
                  </>
                )}
              </button>
            </form>

            {/* New link display */}
            {newLink && (
              <div className="mt-5 bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="font-semibold text-emerald-800">Link gerado com sucesso!</p>
                </div>
                <p className="text-xs text-emerald-600 mb-3">Copie e envie para o profissional via WhatsApp, e-mail ou SMS:</p>
                <div className="flex gap-2">
                  <div className="flex-1 bg-white border border-emerald-200 rounded-xl px-3 py-2 text-xs text-gray-700 font-mono truncate">
                    {newLink}
                  </div>
                  <button
                    onClick={() => handleCopy(newLink)}
                    className={`shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                      copied
                        ? 'bg-emerald-500 text-white'
                        : 'bg-emerald-600 text-white hover:bg-emerald-700'
                    }`}
                  >
                    {copied ? '✓ Copiado!' : 'Copiar'}
                  </button>
                </div>
                {/* WhatsApp shortcut */}
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(`Olá! Você foi convidado(a) para entrar na equipe *${orgName}* no AgendaFácil. Clique no link para aceitar: ${newLink}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex items-center gap-2 bg-[#25D366]/10 text-[#128C7E] text-sm font-medium px-4 py-2 rounded-xl hover:bg-[#25D366]/20 transition-all w-fit"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  Enviar via WhatsApp
                </a>
              </div>
            )}
          </div>

          {/* Pending invites list */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5">Convites gerados</h2>
            {invites.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-6">Nenhum convite gerado ainda.</p>
            ) : (
              <div className="space-y-3">
                {invites.map((invite) => {
                  const expired = new Date(invite.expires_at) < new Date();
                  const link = `${BASE_URL}/invite/${invite.token}`;
                  return (
                    <div key={invite.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                      invite.accepted_at ? 'border-emerald-100 bg-emerald-50/50' :
                      expired ? 'border-gray-100 bg-gray-50 opacity-60' :
                      'border-gray-100 bg-white'
                    }`}>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        invite.accepted_at ? 'bg-emerald-100' :
                        expired ? 'bg-gray-100' :
                        'gradient-brand'
                      }`}>
                        {invite.accepted_at ? (
                          <svg className="w-4 h-4 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                          {invite.email || 'Convite geral'}
                        </p>
                        <p className="text-xs text-gray-400">
                          {invite.accepted_at
                            ? `✓ Aceito em ${new Date(invite.accepted_at).toLocaleDateString('pt-BR')}`
                            : expired
                            ? 'Expirado'
                            : `Expira em ${new Date(invite.expires_at).toLocaleDateString('pt-BR')}`}
                        </p>
                      </div>
                      {!invite.accepted_at && !expired && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            onClick={() => handleCopy(link)}
                            className="text-xs text-indigo-500 hover:text-indigo-700 font-medium px-2 py-1 rounded-lg hover:bg-indigo-50 transition-all"
                          >
                            Copiar
                          </button>
                          <ConfirmButton
                            onConfirm={() => handleRevokeInvite(invite.id)}
                            title="Revogar este convite?"
                            description="O link deixará de funcionar imediatamente. Esta ação não pode ser desfeita."
                            confirmText="Revogar"
                          >
                            <button
                              className="text-xs text-red-400 hover:text-red-600 font-medium px-2 py-1 rounded-lg hover:bg-red-50 transition-all"
                            >
                              Revogar
                            </button>
                          </ConfirmButton>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
