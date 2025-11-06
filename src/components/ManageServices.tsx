// src/components/ManageServices.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// Define o "formato" de um serviço
type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  organization_id: string;
};

// Props para o componente
type Props = {
  organizationId: string;
  memberId?: string; // O ID do membro é opcional. Se for o dashboard do admin, não haverá um.
};

export default function ManageServices({ organizationId, memberId }: Props) {
  const [services, setServices] = useState<Service[]>([]); // Todos os serviços da empresa
  const [assignedServiceIds, setAssignedServiceIds] = useState<Set<string>>(new Set()); // IDs dos serviços do membro
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(30);
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // READ (Carrega os dados ao iniciar)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);

      // 1. Busca TODOS os serviços da organização
      const { data: orgServices, error: servicesError } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', organizationId);

      if (servicesError) {
        console.error('Erro ao buscar serviços:', servicesError);
        setError('Não foi possível carregar os serviços.');
        setLoading(false);
        return;
      }
      setServices(orgServices || []);

      // 2. Se estivermos no dashboard de um membro, busca os serviços VINCULADOS a ele
      if (memberId) {
        const { data: memberServices, error: memberServicesError } = await supabase
          .from('member_services')
          .select('service_id')
          .eq('member_id', memberId);

        if (memberServicesError) {
          console.error('Erro ao buscar serviços do membro:', memberServicesError);
          setError('Não foi possível carregar os serviços do membro.');
        } else {
          // Cria um Set (conjunto) com os IDs dos serviços para checagem rápida
          setAssignedServiceIds(new Set(memberServices.map(s => s.service_id)));
        }
      }
      setLoading(false);
    };

    fetchData();
  }, [organizationId, memberId]);

  // CREATE (Criar novo serviço)
  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { data, error } = await supabase
      .from('services')
      .insert({
        name,
        duration_minutes: duration,
        price,
        organization_id: organizationId, // Associa à organização do admin
      })
      .select() // Pede ao Supabase para retornar o objeto criado
      .single(); // Esperamos apenas um

    if (error) {
      console.error('Erro ao criar serviço:', error);
      setError('Erro ao criar serviço. Verifique suas permissões (RLS).');
    } else if (data) {
      // Adiciona o novo serviço à lista na tela, sem precisar recarregar
      setServices([...services, data]);
      // Limpa o formulário
      setName('');
      setDuration(30);
      setPrice(0);
    }
  };

  // DELETE (Excluir serviço)
  const handleDeleteService = async (serviceId: string) => {
    // Confirmação
    if (!window.confirm('Tem certeza que quer excluir este serviço?')) {
      return;
    }

    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', serviceId);

    if (error) {
      console.error('Erro ao excluir:', error);
      setError('Não foi possível excluir o serviço.');
    } else {
      // Remove o serviço da lista na tela
      setServices(services.filter((s) => s.id !== serviceId));
    }
  };
  
  // (O 'UPDATE' (editar) é um pouco mais complexo, vamos focar no C, R, D primeiro)

  const handleToggleService = async (serviceId: string, isAssigned: boolean) => {
    if (!memberId) return;

    if (isAssigned) {
      // Remove o vínculo
      const { error } = await supabase
        .from('member_services')
        .delete()
        .eq('member_id', memberId)
        .eq('service_id', serviceId);

      if (error) {
        setError('Erro ao desatribuir o serviço.');
      } else {
        const newAssignedIds = new Set(assignedServiceIds);
        newAssignedIds.delete(serviceId);
        setAssignedServiceIds(newAssignedIds);
      }
    } else {
      // Adiciona o vínculo
      const { error } = await supabase
        .from('member_services')
        .insert({ member_id: memberId, service_id: serviceId });

      if (error) {
        setError('Erro ao atribuir o serviço.');
      } else {
        const newAssignedIds = new Set(assignedServiceIds);
        newAssignedIds.add(serviceId);
        setAssignedServiceIds(newAssignedIds);
      }
    }
  };

  if (loading) return <p>Carregando serviços...</p>;

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold">
        {memberId ? 'Gerenciar Serviços do Membro' : 'Gerenciar Serviços da Empresa'}
      </h2>
      
      {/* O formulário de criação de serviços só aparece para o admin em seu próprio dashboard */}
      {!memberId && (
        <form onSubmit={handleCreateService} className="mt-4 p-4 border rounded-md bg-gray-50">
          {/* ... (conteúdo do formulário permanece o mesmo) ... */}
        </form>
      )}

      {error && <p className="text-red-600 mt-2">{error}</p>}

      {/* Lista de Serviços */}
      <div className="mt-6 space-y-3">
        {services.length === 0 && !loading && <p>Nenhum serviço cadastrado para a empresa.</p>}
        
        {services.map((service) => {
          const isAssigned = assignedServiceIds.has(service.id);
          return (
            <div key={service.id} className="flex justify-between items-center p-3 border rounded-md shadow-sm bg-white">
              <div>
                <p className="font-semibold">{service.name}</p>
                <p className="text-sm text-gray-600">
                  {service.duration_minutes} min - R$ {service.price.toFixed(2)}
                </p>
              </div>

              {/* Se estamos no dashboard de um membro, mostramos o checkbox */}
              {memberId && (
                <div className="flex items-center">
                  <label htmlFor={`service-${service.id}`} className="mr-2 text-sm text-gray-600">
                    {isAssigned ? 'Atribuído' : 'Não atribuído'}
                  </label>
                  <input
                    type="checkbox"
                    id={`service-${service.id}`}
                    className="h-6 w-6 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={isAssigned}
                    onChange={() => handleToggleService(service.id, isAssigned)}
                  />
                </div>
              )}

              {/* Se estamos no dashboard do admin, mostramos o botão de excluir */}
              {!memberId && (
                <button
                  onClick={() => handleDeleteService(service.id)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
                >
                  Excluir
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}