// src/components/ManageServices.tsx - VERSÃO FINAL COM LEGENDAS
import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "react-query";

type Service = {
  id: string;
  name: string;
  duration: number;
  price: number;
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
  const [price, setPrice] = useState(0);

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
      const { data, error } = await supabase.from("services").select("*").eq("organization_id", orgId);
      if (error) throw new Error(error.message);
      return data as Service[];
    },
    { enabled: !!organizationId || !!memberId }
  );

  const { data: memberServices, isLoading: isLoadingMemberServices } = useQuery(
    ["memberServices", memberId],
    async () => {
      const { data, error } = await supabase.from("member_services").select("id, service_id").eq("member_id", memberId);
      if (error) throw new Error(error.message);
      return new Set(data.map((ms) => ms.service_id));
    },
    { enabled: !!memberId }
  );

  const createServiceMutation = useMutation(
    async ({ name, duration, price }: { name: string; duration: number; price: number }) => {
      if (!organizationId) throw new Error("Apenas admins podem criar serviços.");
      const { data, error } = await supabase.from("services").insert({ name, duration, price, organization_id: organizationId }).select().single();
      if (error) throw new Error(error.message);
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["services", organizationId]);
        setName("");
        setDuration(30);
        setPrice(0);
      },
    }
  );

  const toggleServiceMutation = useMutation(
    async ({ serviceId, isAssigned }: { serviceId: string; isAssigned: boolean; }) => {
      if (isAssigned) {
        const { error } = await supabase.from("member_services").delete().match({ member_id: memberId, service_id: serviceId });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("member_services").insert({ member_id: memberId, service_id: serviceId });
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
    createServiceMutation.mutate({ name, duration, price });
  };

  const handleToggleService = (serviceId: string, isAssigned: boolean) => {
    toggleServiceMutation.mutate({ serviceId, isAssigned });
  };

  const isLoading = isLoadingServices || isLoadingMemberServices;

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Gerenciar Serviços</h2>

      {organizationId && (
        <form onSubmit={handleCreateService} className="p-4 border rounded-md bg-gray-50 mb-6">
          <h3 className="font-medium mb-2">Criar Novo Serviço para a Organização</h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-x-6 gap-y-4">
            <div className="md:col-span-2">
              <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700">
                Nome do Serviço
              </label>
              <input
                type="text" id="serviceName" placeholder="Ex: Corte Masculino" required
                value={name} onChange={(e) => setName(e.target.value)}
                className="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="serviceDuration" className="block text-sm font-medium text-gray-700">
                Duração (min)
              </label>
              <input
                type="number" id="serviceDuration" placeholder="Ex: 30" required
                value={duration} onChange={(e) => setDuration(parseInt(e.target.value))}
                className="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="servicePrice" className="block text-sm font-medium text-gray-700">
                Preço (R$)
              </label>
              <input
                type="number" id="servicePrice" step="0.01" placeholder="Ex: 50.00" required
                value={price} onChange={(e) => setPrice(parseFloat(e.target.value))}
                className="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div className="self-end">
              <button
                type="submit"
                disabled={createServiceMutation.isLoading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              >
                {createServiceMutation.isLoading ? "Criando..." : "Criar"}
              </button>
            </div>
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
          <p>Nenhum serviço encontrado. Crie um serviço acima para começar.</p>
        ) : (
          allServices.map((service) => {
            const isAssigned = memberServices?.has(service.id) ?? false;
            return (
              <div
                key={service.id}
                className="flex items-center justify-between p-3 bg-white border rounded-md"
              >
                <p>
                  {service.name} ({service.duration} min) - <span className="font-semibold">R$ {service.price.toFixed(2)}</span>
                </p>
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