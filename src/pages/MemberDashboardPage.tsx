import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import ManageAvailability from '../components/ManageAvailability';
import ManageServices from '../components/ManageServices';
import AgendaCalendar from '../components/AgendaCalendar';
import Sidebar from '../components/Sidebar';
import type { UserProfile, MemberLink } from '../components/Sidebar';
import type { Member, Organization } from '../types';

const MemberDashboardPage = () => {
  const { memberSlug, organizationSlug } = useParams<{ memberSlug: string; organizationSlug: string }>();
  const navigate = useNavigate();

  // Sidebar data (current logged-in admin)
  const [sidebarReady, setSidebarReady] = useState(false);
  const [adminProfile, setAdminProfile] = useState<UserProfile>(null);
  const [membersList, setMembersList] = useState<MemberLink[]>([]);
  const [orgSlug, setOrgSlug] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); return; }

      const { data: admin } = await supabase
        .from('members')
        .select('name, phone, avatar_url, organization_id')
        .eq('user_id', session.user.id)
        .single();

      if (!admin) return;

      const { data: org } = await supabase
        .from('organizations')
        .select('slug, name')
        .eq('id', admin.organization_id)
        .single();

      const { data: allMembers } = await supabase
        .from('members')
        .select('id, name, slug')
        .eq('organization_id', admin.organization_id);

      setAdminProfile({ name: admin.name, phone: admin.phone, avatarUrl: admin.avatar_url || '' });
      setOrgSlug(org?.slug || null);
      setOrgName(org?.name || null);
      setMembersList(allMembers || []);
      setSidebarReady(true);
    };
    load();
  }, [navigate]);

  const handleLogout = async () => { await supabase.auth.signOut(); };

  const { data, isLoading, error } = useQuery(
    ['memberDashboard', memberSlug, organizationSlug],
    async () => {
      if (!memberSlug || !organizationSlug) throw new Error('Parâmetros inválidos.');

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Acesso negado. Você precisa estar logado.');

      const { data: adminMember, error: adminError } = await supabase
        .from('members')
        .select('organization_id, can_edit_price')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (adminError || !adminMember) throw new Error('Acesso negado. Você não é um administrador.');

      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug, allow_staff_price_edit')
        .eq('slug', organizationSlug)
        .single();

      if (orgError || !organization) throw new Error('Organização não encontrada.');
      if (organization.id !== adminMember.organization_id) throw new Error('Acesso negado.');

      const { data: viewedMember, error: memberError } = await supabase
        .from('members')
        .select('*, can_edit_price')
        .eq('slug', memberSlug)
        .eq('organization_id', organization.id)
        .single();

      if (memberError || !viewedMember) throw new Error('Membro não encontrado.');

      return {
        viewedMember: viewedMember as Member,
        organization: organization as Organization,
        canEditPrice: adminMember.can_edit_price || organization.allow_staff_price_edit,
      };
    }
  );

  if (isLoading || !sidebarReady) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-indigo-400 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 gap-4 text-center p-8">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-xl font-semibold text-gray-800">{(error as Error).message}</p>
        <Link to="/dashboard" className="text-indigo-600 hover:text-indigo-700 font-medium text-sm transition-colors">
          ← Voltar ao Dashboard
        </Link>
      </div>
    );
  }

  const { viewedMember, organization, canEditPrice } = data!;

  const SectionDivider = ({ title }: { title: string }) => (
    <div className="flex items-center gap-4 my-8">
      <div className="flex-1 h-px bg-gray-200" />
      <span className="text-xs font-bold uppercase tracking-widest text-gray-400">{title}</span>
      <div className="flex-1 h-px bg-gray-200" />
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        userProfile={adminProfile}
        isAdmin={true}
        members={membersList}
        organizationSlug={orgSlug}
        organizationName={orgName}
        onLogout={handleLogout}
      />

      <main className="flex-1 p-6 md:p-8 overflow-auto min-w-0">
        {/* Header */}
        <div className="gradient-brand rounded-2xl p-6 mb-8 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <Link to="/dashboard" className="text-indigo-200 text-sm hover:text-white transition-colors flex items-center gap-1 mb-2 w-fit">
              ← Dashboard principal
            </Link>
            <p className="text-indigo-200 text-sm">{organization.name}</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-0.5">
              {viewedMember.name} {viewedMember.last_name || ''}
            </h1>
          </div>
        </div>

        {/* Calendar */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
          <AgendaCalendar memberId={viewedMember.id} organizationId={organization.id} />
        </div>

        <SectionDivider title="Disponibilidade" />
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
          <ManageAvailability memberId={viewedMember.id} />
        </div>

        <SectionDivider title="Serviços" />
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
          <ManageServices
            memberId={viewedMember.id}
            organizationId={organization.id}
            canEditPrice={canEditPrice}
          />
        </div>
      </main>
    </div>
  );
};

export default MemberDashboardPage;
