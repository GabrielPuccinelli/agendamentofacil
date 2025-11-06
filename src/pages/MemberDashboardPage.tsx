// src/pages/MemberDashboardPage.tsx
import { supabase } from '../lib/supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import ManageServices from '../components/ManageServices';
import ManageAvailability from '../components/ManageAvailability';
import AgendaCalendar from '../components/AgendaCalendar';

export default function MemberDashboardPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkPermissionsAndFetchData = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !session) {
        navigate('/');
        return;
      }

      try {
        // 1. Get the currently logged-in user's member profile to check if they are an admin
        const { data: adminData, error: adminError } = await supabase
          .from('members')
          .select('role, organization_id')
          .eq('user_id', session.user.id)
          .single();

        if (adminError || !adminData || adminData.role !== 'admin') {
          throw new Error('Acesso negado. Você precisa ser um administrador.');
        }

        // 2. Get the profile of the member whose dashboard is being viewed
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('name, organization_id')
          .eq('id', memberId)
          .single();

        if (memberError) {
          throw new Error('Membro não encontrado.');
        }

        // 3. Security Check: Verify both are in the same organization
        if (adminData.organization_id !== memberData.organization_id) {
          throw new Error('Acesso negado. Este membro não pertence à sua organização.');
        }

        // If all checks pass, set the state to render the dashboard
        setUserName(memberData.name);
        setOrganizationId(memberData.organization_id);
        setIsAdmin(true); // The viewer is an admin
        setLoading(false);

      } catch (err: any) {
        setError(err.message);
        setLoading(false);
      }
    };

    checkPermissionsAndFetchData();
  }, [memberId, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <h1 className="text-2xl">Carregando Dashboard do Membro...</h1>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-4xl font-bold">Dashboard de {userName}</h1>
        <button
          onClick={() => navigate('/dashboard')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Voltar ao seu Dashboard
        </button>
      </div>

      {organizationId && (
        <AgendaCalendar organizationId={organizationId} />
      )}

      <hr className="my-10 border-t-2" />

      {memberId && (
        <ManageAvailability memberId={memberId} />
      )}

      <hr className="my-10" />

      {isAdmin && organizationId && (
        <ManageServices organizationId={organizationId} />
      )}

    </div>
  );
}
