import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ManageServices from '../components/ManageServices';
import ManageAvailability from '../components/ManageAvailability';
import AgendaCalendar from '../components/AgendaCalendar';
import ManageMembers from '../components/ManageMembers';
import Sidebar from '../components/Sidebar';

type UserProfile = {
  avatarUrl: string;
  name: string;
  phone: string | null;
};

type MemberLink = {
  id: string;
  name: string;
  slug: string;
};

const SectionDivider = ({ title }: { title: string }) => (
  <div className="flex items-center gap-4 my-10">
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
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [membersList, setMembersList] = useState<MemberLink[]>([]);
  const [organizationSlug, setOrganizationSlug] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        navigate('/login');
        return;
      }
      const user = session.user;
      if (!user) {
        navigate('/login');
        return;
      }

      const { data: member, error: memberError } = await supabase
        .from('members')
        .select('id, name, role, organization_id, can_edit_profile, phone, avatar_url')
        .eq('user_id', user.id)
        .single();

      if (memberError || !member) {
        navigate('/onboarding');
        return;
      }

      setMemberId(member.id);
      setOrganizationId(member.organization_id);
      setIsAdmin(member.role === 'admin');
      setCanEditProfile(member.can_edit_profile);
      setUserProfile({
        name: member.name,
        phone: member.phone,
        avatarUrl: member.avatar_url || 'https://via.placeholder.com/150',
      });

      const [
        { data: allMembers, error: allMembersError },
        { data: organization, error: orgError }
      ] = await Promise.all([
        supabase.from('members').select('id, name, slug').eq('organization_id', member.organization_id),
        supabase.from('organizations').select('slug').eq('id', member.organization_id).single(),
      ]);

      if (allMembersError || orgError) {
        console.error('Erro ao buscar dados da organização:', allMembersError || orgError);
      } else {
        setMembersList(allMembers || []);
        setOrganizationSlug(organization?.slug || null);
      }

      setLoading(false);
    };

    fetchData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') navigate('/');
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

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

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar
        userProfile={userProfile}
        members={membersList}
        organizationSlug={organizationSlug}
        onLogout={handleLogout}
      />
      <main className="flex-1 p-6 md:p-8 overflow-auto min-w-0">
        {/* Welcome banner */}
        <div className="gradient-brand rounded-2xl p-6 mb-8 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10">
            <p className="text-indigo-200 text-sm font-medium">{greeting},</p>
            <h1 className="text-2xl md:text-3xl font-bold mt-0.5">{userProfile?.name || ''}!</h1>
            <p className="text-indigo-200 text-sm mt-2">Aqui está uma visão geral da sua agenda.</p>
          </div>
        </div>

        {/* Calendar */}
        {organizationId && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-2">
            <AgendaCalendar organizationId={organizationId} />
          </div>
        )}

        {isAdmin && organizationId && organizationSlug && (
          <>
            <SectionDivider title="Gestão de Membros" />
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
              <ManageMembers organizationId={organizationId} organizationSlug={organizationSlug} />
            </div>
          </>
        )}

        {(isAdmin || canEditProfile) && memberId && (
          <>
            <SectionDivider title="Disponibilidade" />
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6 mb-8">
              <ManageAvailability memberId={memberId} />
            </div>

            <SectionDivider title="Serviços" />
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 md:p-6">
              <ManageServices
                memberId={memberId}
                organizationId={isAdmin && organizationId ? organizationId : undefined}
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
