import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

type InviteInfo = {
  id: string;
  organization_id: string;
  email: string | null;
  expires_at: string;
  accepted_at: string | null;
  organizations: { name: string; slug: string } | null;
};

const formatSlug = (v: string) =>
  v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export default function InviteAcceptPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [inviteError, setInviteError] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userName, setUserName] = useState('');
  const [slug, setSlug] = useState('');
  const [accepting, setAccepting] = useState(false);
  const [acceptError, setAcceptError] = useState('');
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    const load = async () => {
      // Check auth
      const { data: { session } } = await supabase.auth.getSession();
      setIsLoggedIn(!!session);

      if (session) {
        // Get user name from metadata or member record
        const { data: member } = await supabase
          .from('members')
          .select('name')
          .eq('user_id', session.user.id)
          .maybeSingle();

        const name = member?.name ||
          session.user.user_metadata?.name ||
          session.user.email?.split('@')[0] || '';
        setUserName(name);
        setSlug(formatSlug(name));
      }

      // Fetch invite info
      if (!token) { setInviteError('Link inválido.'); setLoading(false); return; }

      const { data, error } = await supabase
        .from('member_invites')
        .select('id, organization_id, email, expires_at, accepted_at, organizations(name, slug)')
        .eq('token', token)
        .maybeSingle();

      if (error || !data) {
        setInviteError('Convite não encontrado ou inválido.');
      } else if (data.accepted_at) {
        setInviteError('Este convite já foi utilizado.');
      } else if (new Date(data.expires_at) < new Date()) {
        setInviteError('Este convite expirou. Peça um novo link ao gestor.');
      } else {
        setInvite(data as InviteInfo);
      }

      setLoading(false);
    };
    load();
  }, [token]);

  const handleAccept = async () => {
    if (!slug.trim()) { setAcceptError('Escolha um link público para seu perfil.'); return; }
    setAccepting(true);
    setAcceptError('');

    const { data, error } = await supabase.rpc('accept_invite', {
      invite_token: token,
      member_slug: slug.trim(),
    });

    setAccepting(false);

    if (error) { setAcceptError('Erro ao aceitar convite. Tente novamente.'); return; }

    const result = data as { error?: string; success?: boolean };
    if (result.error === 'already_member') {
      setAcceptError('Você já faz parte desta empresa.');
      return;
    }
    if (result.error === 'slug_taken') {
      setAcceptError('Esse link já está em uso. Escolha outro.');
      return;
    }
    if (result.error) {
      setAcceptError('Erro inesperado. Tente novamente.');
      return;
    }

    setAccepted(true);
    setTimeout(() => navigate('/dashboard'), 2500);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  const orgName = (invite?.organizations as any)?.name || 'a empresa';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 flex items-center justify-center p-4">
      {/* Decorative orbs */}
      <div className="fixed top-1/4 left-[10%] w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-[10%] w-64 h-64 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2.5 justify-center">
            <div className="w-10 h-10 rounded-xl gradient-brand flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-white font-bold text-lg">AgendaFácil</span>
          </Link>
        </div>

        <div className="glass rounded-3xl p-8">
          {/* Error state */}
          {inviteError && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Link inválido</h2>
              <p className="text-indigo-300 text-sm mb-6">{inviteError}</p>
              <Link to="/" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">
                ← Voltar ao início
              </Link>
            </div>
          )}

          {/* Accepted success */}
          {accepted && (
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Bem-vindo(a) à equipe! 🎉</h2>
              <p className="text-indigo-300 text-sm">Redirecionando para seu dashboard...</p>
              <div className="mt-4 flex justify-center">
                <div className="w-8 h-8 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
              </div>
            </div>
          )}

          {/* Valid invite */}
          {invite && !accepted && (
            <>
              {/* Org info */}
              <div className="text-center mb-6">
                <div className="w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/30">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h2 className="text-2xl font-extrabold text-white mb-1">Convite recebido!</h2>
                <p className="text-indigo-300 text-sm">
                  Você foi convidado(a) para fazer parte da equipe
                </p>
                <div className="mt-3 inline-block bg-indigo-500/20 border border-indigo-500/30 rounded-xl px-4 py-2">
                  <p className="text-white font-bold text-lg">{orgName}</p>
                </div>
              </div>

              {/* Not logged in */}
              {!isLoggedIn && (
                <div className="space-y-3">
                  <p className="text-indigo-300 text-sm text-center mb-4">
                    Para aceitar o convite, você precisa ter uma conta no AgendaFácil.
                  </p>
                  <Link
                    to={`/login?redirect=/invite/${token}`}
                    className="block w-full gradient-brand text-white font-bold py-3 px-6 rounded-2xl hover:opacity-90 transition-all text-center"
                  >
                    Entrar na minha conta
                  </Link>
                  <Link
                    to={`/login?redirect=/invite/${token}&mode=signup`}
                    className="block w-full border border-indigo-500/30 text-indigo-300 font-semibold py-3 px-6 rounded-2xl hover:bg-white/10 transition-all text-center text-sm"
                  >
                    Criar conta gratuitamente
                  </Link>
                </div>
              )}

              {/* Logged in — accept form */}
              {isLoggedIn && (
                <div className="space-y-4">
                  <div className="bg-white/10 rounded-xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg gradient-brand flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {userName.charAt(0).toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-white text-sm font-semibold">{userName}</p>
                      <p className="text-indigo-400 text-xs">Conta ativa</p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">
                      Seu link público na empresa <span className="text-rose-400">*</span>
                    </label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all bg-white">
                      <span className="bg-gray-50 text-gray-400 text-xs px-3 py-3 whitespace-nowrap border-r border-gray-200">/p/</span>
                      <input
                        type="text"
                        placeholder="seu-nome"
                        value={slug}
                        onChange={(e) => setSlug(formatSlug(e.target.value))}
                        className="flex-1 px-3 py-3 text-sm outline-none text-gray-900"
                      />
                    </div>
                    <p className="text-xs text-indigo-400 mt-1">URL que seus clientes usarão para agendar com você.</p>
                  </div>

                  {acceptError && (
                    <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">
                      <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {acceptError}
                    </div>
                  )}

                  <button
                    onClick={handleAccept}
                    disabled={accepting || !slug}
                    className="w-full gradient-brand text-white font-bold py-4 px-6 rounded-2xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                  >
                    {accepting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Aceitando...
                      </>
                    ) : (
                      '✓ Aceitar convite e entrar na equipe'
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
