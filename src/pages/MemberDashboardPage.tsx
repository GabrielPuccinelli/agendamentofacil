// src/pages/MemberDashboardPage.tsx
import { useParams, Link } from "react-router-dom";
import { useQuery } from "react-query";
import { supabase } from "../lib/supabaseClient";
import ManageAvailability from "../components/ManageAvailability";
import ManageServices from "../components/ManageServices";
import AgendaCalendar from "../components/AgendaCalendar";
import type { Member, Organization } from "../types"; // Importar tipos

const MemberDashboardPage = () => {
  const { memberSlug, organizationSlug } = useParams<{
    memberSlug: string;
    organizationSlug: string;
  }>();

  // Query para buscar os detalhes do membro e da organização
  const {
    data,
    isLoading,
    error,
  } = useQuery(
    ["memberDashboard", memberSlug, organizationSlug],
    async () => {
      if (!memberSlug || !organizationSlug) {
        throw new Error("Slugs da organização ou do membro não fornecidos.");
      }

      // Primeiro, verificar se o usuário logado é um admin da organização
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Acesso negado. Você precisa estar logado.");

      const { data: adminMember, error: adminError } = await supabase
        .from('members')
        .select('organization_id')
        .eq('user_id', user.id)
        .eq('role', 'admin')
        .single();

      if (adminError || !adminMember) {
        throw new Error("Acesso negado. Você não é um administrador.");
      }

      // Agora, buscar a organização e o membro alvo
      const { data: organization, error: orgError } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('slug', organizationSlug)
        .single();

      if (orgError || !organization) {
        throw new Error("Organização não encontrada.");
      }

      // Verificar se o admin logado pertence a esta organização
      if (organization.id !== adminMember.organization_id) {
        throw new Error("Acesso negado. Você não pertence a esta organização.");
      }

      const { data: viewedMember, error: memberError } = await supabase
        .from('members')
        .select('*')
        .eq('slug', memberSlug)
        .eq('organization_id', organization.id)
        .single();

      if (memberError || !viewedMember) {
        throw new Error("Membro não encontrado nesta organização.");
      }

      return { viewedMember: viewedMember as Member, organization: organization as Organization };
    }
  );

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen text-center">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Ocorreu um erro</h1>
        <p className="mb-6">{(error as Error).message}</p>
        <Link to="/dashboard" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Voltar para o Dashboard
        </Link>
      </div>
    );
  }

  const { viewedMember, organization } = data!;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8 p-4 border rounded-md bg-white shadow-sm">
        <Link to="/dashboard" className="text-sm text-blue-600 hover:underline mb-2 block">
          &larr; Voltar para o Dashboard Principal
        </Link>
        <h1 className="text-3xl font-bold">
          Dashboard de: <span className="text-blue-700">{viewedMember.name}</span>
        </h1>
        <h2 className="text-xl text-gray-600">
          Organização: {organization.name}
        </h2>
      </div>

      <div className="space-y-12">
        <div>
          <h3 className="text-2xl font-semibold mb-4 border-b pb-2">Agenda do Funcionário</h3>
          <AgendaCalendar memberId={viewedMember.id} organizationId={organization.id} />
        </div>

        <div>
          <h3 className="text-2xl font-semibold mb-4 border-b pb-2">Disponibilidade</h3>
          <ManageAvailability memberId={viewedMember.id} />
        </div>

        <div>
          <h3 className="text-2xl font-semibold mb-4 border-b pb-2">Serviços</h3>
          <ManageServices memberId={viewedMember.id} organizationId={organization.id} />
        </div>
      </div>
    </div>
  );
};

export default MemberDashboardPage;
