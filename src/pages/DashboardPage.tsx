// src/pages/DashboardPage.tsx
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
        // Lidar com erros de busca secundários, talvez com um feedback na UI
        console.error("Erro ao buscar dados da organização:", allMembersError || orgError);
      } else {
        setMembersList(allMembers || []);
        setOrganizationSlug(organization?.slug || null);
      }

      setLoading(false);
    };

    fetchData();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        navigate('/');
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><h1 className="text-2xl">Carregando...</h1></div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar userProfile={userProfile} members={membersList} organizationSlug={organizationSlug} onLogout={handleLogout} />
      <main className="flex-1 p-4 md:p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Bem-vindo, {userProfile?.name || ''}!</h1>
        </div>
        {organizationId && <AgendaCalendar organizationId={organizationId} />}
        <hr className="my-10 border-t-2" />
        {isAdmin && organizationId && organizationSlug && (
          <>
            <ManageMembers organizationId={organizationId} organizationSlug={organizationSlug} />
            <hr className="my-10" />
          </>
        )}
        {(isAdmin || canEditProfile) && memberId && (
          <>
            <ManageAvailability memberId={memberId} />
            <hr className="my-10" />
            <ManageServices memberId={memberId} organizationId={isAdmin && organizationId ? organizationId : undefined} />
          </>
        )}
      </main>
    </div>
  );
}
