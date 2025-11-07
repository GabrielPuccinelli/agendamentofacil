import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "react-query";

type Service = {
  id: string;
  name: string;
  duration: number;
  organization_id: string;
};

type Props = {
  memberId: string;
  organizationId?: string;
};

export default function ManageServices({ memberId, organizationId }: Props) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [duration, setDuration] = useState(30);

  const { data: allServices, isLoading: isLoadingServices } = useQuery(
    ["services", organizationId],
    async () => {
      let orgId = organizationId;
      if (!orgId) {
        const { data: memberData, error: memberError } = await supabase
          .from("members")
          .select("organization_id")
          .eq("id", memberId)
          .single();
        if (memberError) throw new Error(memberError.message);
        orgId = memberData.organization_id;
      }

      const { data, error } = await supabase
        .from("services")
        .select("*")
        .eq("organization_id", orgId);
      if (error) throw new Error(error.message);
      return data as Service[];
    },
    {
      enabled: !!organizationId || !!memberId,
    }
  );

  const { data: memberServices, isLoading: isLoadingMemberServices } = useQuery(
    ["memberServices", memberId],
    async () => {
      const { data, error } = await supabase
        .from("member_services")
        .select("id, service_id")
        .eq("member_id", memberId);
      if (error) throw new Error(error.message);
      return new Set(data.map((ms) => ms.service_id));
    },
    { enabled: !!memberId }
  );

  const createServiceMutation = useMutation(
    async ({ name, duration }: { name: string; duration: number }) => {
      if (!organizationId) throw new Error("Apenas admins podem criar serviços.");

      const { data, error } = await supabase
        .from("services")
        .insert({ name, duration, organization_id: organizationId })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["services", organizationId]);
        setName("");
        setDuration(30);
      },
    }
  );

  const toggleServiceMutation = useMutation(
    async ({
      serviceId,
      isAssigned,
    }: {
      serviceId: string;
      isAssigned: boolean;
    }) => {
      if (isAssigned) {
        const { error } = await supabase
          .from("member_services")
          .delete()
          .match({ member_id: memberId, service_id: serviceId });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase
          .from("member_services")
          .insert({ member_id: memberId, service_id: serviceId });
        if (error) throw new Error(error.message);
      }
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["memberServices", memberId]);
      },
    }
  );

  const handleCreateService = (e: React.FormEvent) => {
    e.preventDefault();
    createServiceMutation.mutate({ name, duration });
  };

  const handleToggleService = (serviceId: string, isAssigned: boolean) => {
    toggleServiceMutation.mutate({ serviceId, isAssigned });
  };

  const isLoading = isLoadingServices || isLoadingMemberServices;

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Gerenciar Serviços</h2>

      {organizationId && (
        <form
          onSubmit={handleCreateService}
          className="p-4 border rounded-md bg-gray-50 mb-6"
        >
          <h3 className="font-medium mb-2">Criar Novo Serviço para a Organização</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Nome do Serviço"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="p-2 border rounded-md"
            />
            <input
              type="number"
              placeholder="Duração (minutos)"
              required
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value))}
              className="p-2 border rounded-md"
            />
            <button
              type="submit"
              disabled={createServiceMutation.isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {createServiceMutation.isLoading ? "Criando..." : "Criar Serviço"}
            </button>
          </div>
          {createServiceMutation.isError && (
            <p className="text-red-600 mt-2">
              {(createServiceMutation.error as Error).message}
            </p>
          )}
        </form>
      )}

      <h3 className="font-medium mb-2">Atribuir Serviços</h3>
      <div className="space-y-2">
        {isLoading ? (
          <p>Carregando serviços...</p>
        ) : !allServices || allServices.length === 0 ? (
          <p>Nenhum serviço encontrado na organização. Crie um serviço primeiro.</p>
        ) : (
          allServices.map((service) => {
            const isAssigned = memberServices?.has(service.id) ?? false;
            return (
              <div
                key={service.id}
                className="flex items-center justify-between p-3 bg-white border rounded-md"
              >
                <span>
                  {service.name} ({service.duration} min)
                </span>
                <input
                  type="checkbox"
                  checked={isAssigned}
                  onChange={() => handleToggleService(service.id, isAssigned)}
                  className="h-5 w-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
              </div>
            );
          })
        )}
      </div>
       {toggleServiceMutation.isError && (
        <p className="text-red-600 mt-2">
          {(toggleServiceMutation.error as Error).message}
        </p>
      )}
    </div>
  );
}