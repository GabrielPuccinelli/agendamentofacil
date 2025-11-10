import { useParams } from "react-router-dom";
import { useQuery } from "react-query";
import { supabase } from "../lib/supabaseClient";
import ManageAvailability from "../components/ManageAvailability";
import ManageServices from "../components/ManageServices";
import AgendaCalendar from "../components/AgendaCalendar";
import type { Member } from "../types"; // Corrigido: Importa o tipo Member

const MemberDashboardPage = () => {
  const { memberId } = useParams<{ memberId: string }>();

  const { data: adminUser } = useQuery("user", async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  });

  const { data: adminMember } = useQuery(
    ["adminMember", adminUser?.id],
    async () => {
      if (!adminUser?.id) return null;
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .eq("user_id", adminUser.id)
        .single();
      if (error) throw new Error(error.message);
      return data as Member;
    },
    { enabled: !!adminUser?.id }
  );

  const {
    data: viewedMember,
    isLoading,
    error,
  } = useQuery(
    ["viewedMember", memberId],
    async () => {
      const { data, error } = await supabase
        .from("members")
        .select("*, organizations(*)")
        .eq("id", memberId)
        .single();
      if (error) throw new Error(error.message);
      // Corrigido: Usa o tipo Member e Organization (parcial)
      return data as Member & { organizations: { name: string } };
    },
    { enabled: !!memberId }
  );

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return <div>Ocorreu um erro: {(error as Error).message}</div>;
  }

  // Corrigido: Garante que memberId é uma string antes de renderizar os filhos
  if (!memberId) {
    return <div>ID de membro inválido.</div>;
  }

  if (
    !adminMember ||
    !viewedMember ||
    adminMember.organization_id !== viewedMember.organization_id ||
    adminMember.role !== "admin"
  ) {
    return (
      <div>
        Acesso negado. Você não tem permissão para ver esta página.
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Gerenciando {viewedMember.name || "Funcionário"}
      </h1>
      <h2 className="text-xl font-semibold mb-2">
        Organização: {viewedMember.organizations?.name}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
        <div>
          <h3 className="text-lg font-medium mb-4">Serviços do Funcionário</h3>
          <ManageServices memberId={memberId} />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-4">
            Disponibilidade do Funcionário
          </h3>
          <ManageAvailability memberId={memberId} />
        </div>
      </div>
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Agenda do Funcionário</h3>
        <AgendaCalendar memberId={memberId} />
      </div>
    </div>
  );
};

export default MemberDashboardPage;
