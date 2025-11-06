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

  useEffect(() => {
    // --- ESTA É A CORREÇÃO PRINCIPAL ---
    // Usamos onAuthStateChange, que é a "fonte da verdade"
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      
      if (!session) {
        // Se a sessão for nula (ou o token for inválido e limpo),
        // envia para o login.
        navigate('/');
        return;
      }

      // Se a sessão EXISTE, agora verificamos o onboarding
      const user = session.user;
      
      try {
        const { data: member, error: memberError } = await supabase
          .from('members')
          .select('id, name, role, organization_id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (memberError) throw memberError;

        if (member) {
          // O usuário está logado E FEZ onboarding
          setUserName(member.name);
          setOrganizationId(member.organization_id);
          setMemberId(member.id);
          if (member.role === 'admin') {
            setIsAdmin(true);
          }
          setLoading(false);
        } else {
          // O usuário está logado MAS NÃO FEZ onboarding
          navigate('/onboarding');
        }
      } catch (err: any) {
        console.error("Erro no 'gatekeeper' do dashboard:", err);
        // Se der erro (ex: RLS), manda para o login por segurança
        navigate('/');
      }
    });

    // Limpa o listener ao sair da página
    return () => {
      subscription.unsubscribe();
    };
    // Array vazio para rodar APENAS UMA VEZ
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

  // O resto do return (renderização) permanece o mesmo
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

      {organizationId && memberId && (
        <AgendaCalendar organizationId={organizationId} memberId={memberId} />
      )}
      
      <hr className="my-10 border-t-2" /> 

      {isAdmin && organizationId && (
        <>
          <ManageMembers organizationId={organizationId} />
          <hr className="my-10" /> 
        </>
      )}

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