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

// Precisamos saber qual a organização do usuário logado
type Props = {
  organizationId: string;
};

export default function ManageServices({ organizationId }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(30);
  const [price, setPrice] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // READ (Ler serviços do banco ao carregar)
  useEffect(() => {
    const fetchServices = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', organizationId); // Só pega os serviços desta organização

      if (error) {
        console.error('Erro ao buscar serviços:', error);
        setError('Não foi possível carregar os serviços.');
      } else {
        setServices(data || []);
      }
      setLoading(false);
    };

    fetchServices();
  }, [organizationId]);

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

  if (loading) return <p>Carregando serviços...</p>;

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold">Gerenciar Serviços</h2>
      
      {/* Formulário de Criação (CREATE) */}
      <form onSubmit={handleCreateService} className="mt-4 p-4 border rounded-md bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
          
          {/* Campo Nome */}
          <div className="md:col-span-2">
            <label htmlFor="serviceName" className="block text-sm font-medium text-gray-700">
              Nome do Serviço
            </label>
            <input
              type="text"
              id="serviceName"
              placeholder="Ex: Corte Masculino"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm"
            />
          </div>

          {/* Campo Duração */}
          <div>
            <label htmlFor="serviceDuration" className="block text-sm font-medium text-gray-700">
              Duração (minutos)
            </label>
            <input
              type="number"
              id="serviceDuration"
              placeholder="Ex: 30"
              required
              value={duration}
              onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm"
            />
          </div>

          {/* Campo Preço */}
          <div>
            <label htmlFor="servicePrice" className="block text-sm font-medium text-gray-700">
              Preço (R$)
            </label>
            <input
              type="number"
              id="servicePrice"
              step="0.01"
              placeholder="Ex: 50.00"
              required
              value={price}
              onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm"
            />
          </div>
        </div>
        
        {/* Botão de Adicionar */}
        <div className="mt-5 text-right">
          <button 
            type="submit" 
            className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Adicionar Serviço
          </button>
        </div>
      </form>

      {error && <p className="text-red-600 mt-2">{error}</p>}

      {/* Lista de Serviços (READ / DELETE) */}
      <div className="mt-6 space-y-3">
        {services.length === 0 && !loading && <p>Nenhum serviço cadastrado.</p>}
        
        {services.map((service) => (
          <div key={service.id} className="flex justify-between items-center p-3 border rounded-md shadow-sm bg-white">
            <div>
              <p className="font-semibold">{service.name}</p>
              <p className="text-sm text-gray-600">
                {service.duration_minutes} min - R$ {service.price.toFixed(2)}
              </p>
            </div>
            <button
              onClick={() => handleDeleteService(service.id)}
              className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200"
            >
              Excluir
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}