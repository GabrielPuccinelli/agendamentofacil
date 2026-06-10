import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ManageServices from '../components/ManageServices';
import ManageAvailability from '../components/ManageAvailability';
import AgendaCalendar from '../components/AgendaCalendar';
import ManageMembers from '../components/ManageMembers';
import AppShell from '../components/AppShell';
import type { UserProfile, MemberLink } from '../components/Sidebar';

const SectionDivider = ({ title }: { title: string }) => (
  <div className="flex items-center gap-4 my-8">
    <div className="flex-1 h-px bg-gray-200" />
    <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</span>
    <div className="flex-1 h-px bg-gray-200" />
  </div>
);

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canEditProfile, setCanEditProfile] = useState(false);
  const [canEditServices, setCanEditServices] = useState(false);
  const [canEditPrice, setCanEditPrice] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(null);
  const [membersList, setMembersList] = useState<MemberLink[]>([]);
  const [organizationSlug, setOrganizationSlug] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) { navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); return; }
      const user = session.user;

      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id, name, role, organization_id, can_edit_profile, can_edit_services, can_edit_price, phone, avatar_url')
        .eq('user_id', user.id)
        .order('organization_id', { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (memberError) { navigate('/login'); return; }
      if (!member) { navigate('/onboarding'); return; }

      // Collaborator with no org yet → show waiting screen (handled below via organizationId === null)


      setMemberId(member.id);
      setOrganizationId(member.organization_id);
      setIsAdmin(member.role === 'admin');
      setCanEditProfile(member.can_edit_profile);
      setCanEditServices(member.role === 'admin' ? true : (member.can_edit_services ?? false));
      setCanEditPrice(member.role === 'admin' ? true : (member.can_edit_price ?? false));
      setUserProfile({
        name: member.name,
        phone: member.phone,
        avatarUrl: member.avatar_url || 'https://via.placeholder.com/150',
      });

      if (member.organization_id) {
        const [
          { data: allMembers },
          { data: organization },
        ] = await Promise.all([
          supabase.from('members').select('id, name, slug').eq('organization_id', member.organization_id),
          supabase.from('organizations').select('slug, name').eq('id', member.organization_id).single(),
        ]);

        setMembersList(allMembers || []);
        setOrganizationSlug(organization?.slug || null);
        setOrganizationName(organization?.name || null);
      }
      setLoading(false);
    };

    fetchData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate('/');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => { await supabase.auth.signOut(); };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-indigo-400 text-sm">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  // Collaborator with no organization yet
  if (!organizationId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-3xl gradient-brand flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/40">
            <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-white mb-3">Conta criada com sucesso!</h1>
          <p className="text-indigo-300 mb-6 leading-relaxed">
            Sua conta de colaborador está pronta. Agora aguarde o <strong className="text-white">gestor da empresa</strong> te adicionar à equipe usando o e-mail cadastrado.
          </p>
          <div className="glass rounded-2xl p-5 mb-6 text-left space-y-3">
            <p className="text-white text-sm font-semibold mb-2">Próximos passos:</p>
            {[
              'O gestor vai buscar seu e-mail no sistema',
              'Você receberá acesso ao painel com sua agenda',
              'Seus serviços e horários serão configurados',
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">{i + 1}</div>
                <span className="text-indigo-200 text-sm">{step}</span>
              </div>
            ))}
          </div>
          <button
            onClick={handleLogout}
            className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
          >
            Sair da conta →
          </button>
        </div>
      </div>
    );
  }

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <AppShell
      userProfile={userProfile}
      isAdmin={isAdmin}
      members={membersList}
      organizationSlug={organizationSlug}
      organizationName={organizationName}
      onLogout={handleLogout}
    >
      <div className="min-w-0">
        {/* Welcome banner */}
        <div className="gradient-brand rounded-2xl p-6 mb-8 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <p className="text-indigo-200 text-sm font-medium">{greeting},</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-0.5">{userProfile?.name || ''}!</h1>
            <p className="text-indigo-200 text-sm mt-1">
              {isAdmin ? 'Você está gerenciando sua empresa.' : 'Aqui está a sua agenda.'}
            </p>
          </div>
        </div>

        {/* Calendar */}
        {organizationId && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
            <AgendaCalendar organizationId={organizationId} memberId={isAdmin ? undefined : memberId || undefined} />
          </div>
        )}

        {/* Admin-only: team management */}
        {isAdmin && organizationId && organizationSlug && (
          <>
            <SectionDivider title="Gestão de Membros" />
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
              <ManageMembers organizationId={organizationId} organizationSlug={organizationSlug} />
            </div>
          </>
        )}

        {/* Availability */}
        {(isAdmin || canEditProfile) && memberId && (
          <>
            <SectionDivider title="Minha Disponibilidade" />
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
              <ManageAvailability memberId={memberId} />
            </div>
          </>
        )}

        {/* My Services — staff only if admin granted can_edit_services */}
        {!isAdmin && canEditServices && memberId && organizationId && (
          <>
            <SectionDivider title="Meus Serviços" />
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
              <ManageServices
                memberId={memberId}
                organizationId={undefined}
                canEditPrice={canEditPrice}
              />
            </div>
          </>
        )}

        {/* Admin hint to manage services */}
        {isAdmin && (
          <>
            <SectionDivider title="Gerenciar Serviços" />
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center shrink-0">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">Serviços da Empresa</p>
                <p className="text-sm text-gray-400 mt-0.5">Gerencie o catálogo de serviços no Painel da Empresa.</p>
              </div>
              <a
                href="/company/dashboard"
                className="shrink-0 gradient-brand text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-md shadow-indigo-500/20"
              >
                Ir para Serviços →
              </a>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
