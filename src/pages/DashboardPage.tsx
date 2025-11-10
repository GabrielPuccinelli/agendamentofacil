// src/pages/DashboardPage.tsx
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ManageServices from '../components/ManageServices';
import ManageAvailability from '../components/ManageAvailability';
import AgendaCalendar from '../components/AgendaCalendar';
import ManageMembers from '../components/ManageMembers';

export default function DashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [memberId, setMemberId] = useState<string | null>(null); 
  const [isAdmin, setIsAdmin] = useState(false);
  const [canEditProfile, setCanEditProfile] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => { 
      
      if (!session) {
        navigate('/');
        return;
      }

      const user = session.user;
      
      try {
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id, name, role, organization_id, can_edit_profile')
          .eq('user_id', user.id)
          .maybeSingle();

        if (memberError) throw memberError;

        if (member) {
          setUserName(member.name);
          setOrganizationId(member.organization_id);
          setMemberId(member.id);
          setIsAdmin(member.role === 'admin');
          setCanEditProfile(member.can_edit_profile);
          setLoading(false);
        } else {
          navigate('/onboarding');
        }
      } catch (err: any) {
        console.error("Erro no 'gatekeeper' do dashboard:", err);
        navigate('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]); 

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <h1 className="text-2xl">Carregando...</h1>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Bem-vindo, {userName}!</h1>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Sair (Logout)
        </button>
      </div>

      {organizationId && (
        <AgendaCalendar organizationId={organizationId} />
      )}
      
      <hr className="my-10 border-t-2" /> 

      {isAdmin && organizationId && (
        <>
          <ManageMembers organizationId={organizationId} />
          <hr className="my-10" />
        </>
      )}

      {(isAdmin || canEditProfile) && memberId && (
        <>
          <ManageAvailability memberId={memberId} />
          <hr className="my-10" />
          <ManageServices
            memberId={memberId}
            organizationId={isAdmin && organizationId ? organizationId : undefined}
          />
        </>
      )}
    </div>
  );
}