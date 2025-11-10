// src/pages/MemberDashboardPage.tsx
import { useParams } from "react-router-dom";
import { useQuery } from "react-query";
import { supabase } from "../lib/supabaseClient";
import ManageAvailability from "../components/ManageAvailability";
import ManageServices from "../components/ManageServices";
import AgendaCalendar from "../components/AgendaCalendar";
import type { Member } from "../types";

const MemberDashboardPage = () => {
  const { memberId } = useParams<{ memberId: string }>();

  const {
    data: viewedMember,
    isLoading,
    error,
  } = useQuery(
    ["viewedMember", memberId],
    async () => {
      if (!memberId) throw new Error("ID de membro inválido.");

      const { data, error } = await supabase.rpc(
        "get_member_details_for_admin",
        { p_member_id: memberId }
      );

      if (error) throw new Error(error.message);
      if (!data || data.length === 0)
        throw new Error(
          "Acesso negado. Você não tem permissão para ver esta página ou o membro não existe."
        );

      // A função RPC retorna um array, então pegamos o primeiro elemento
      return data[0] as Member & { organizations: { name: string } };
    },
    { enabled: !!memberId }
  );

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  if (error) {
    return <div>Ocorreu um erro: {(error as Error).message}</div>;
  }

  if (!viewedMember) {
    return <div>Membro não encontrado ou acesso negado.</div>;
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
          <ManageServices memberId={memberId!} />
        </div>
        <div>
          <h3 className="text-lg font-medium mb-4">
            Disponibilidade do Funcionário
          </h3>
          <ManageAvailability memberId={memberId!} />
        </div>
      </div>
      <div className="mt-8">
        <h3 className="text-lg font-medium mb-4">Agenda do Funcionário</h3>
        <AgendaCalendar memberId={memberId!} />
      </div>
    </div>
  );
};

export default MemberDashboardPage;
