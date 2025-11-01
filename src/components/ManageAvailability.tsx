// src/components/ManageAvailability.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// Define o "formato" da disponibilidade
type Availability = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  member_id: string;
};

// Precisamos saber quem é o usuário (admin) para atribuir o horário
type Props = {
  memberId: string; // ID do 'member' logado
};

// Helper para converter número em dia da semana
const daysOfWeek = [
  { id: 0, name: 'Domingo' },
  { id: 1, name: 'Segunda-feira' },
  { id: 2, name: 'Terça-feira' },
  { id: 3, name: 'Quarta-feira' },
  { id: 4, name: 'Quinta-feira' },
  { id: 5, name: 'Sexta-feira' },
  { id: 6, name: 'Sábado' },
];

export default function ManageAvailability({ memberId }: Props) {
  const [availabilities, setAvailabilities] = useState<Availability[]>([]);
  const [day, setDay] = useState(1); // Padrão: Segunda-feira
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // READ (Ler horários do banco ao carregar)
  useEffect(() => {
    const fetchAvailabilities = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('availability')
        .select('*')
        .eq('member_id', memberId) // Só pega os horários deste 'member'
        .order('day_of_week', { ascending: true }); // Ordena por dia

      if (error) {
        console.error('Erro ao buscar horários:', error);
        setError('Não foi possível carregar os horários.');
      } else {
        setAvailabilities(data || []);
      }
      setLoading(false);
    };

    if (memberId) {
      fetchAvailabilities();
    }
  }, [memberId]);

  // CREATE (Criar novo horário)
  const handleCreateAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { data, error } = await supabase
      .from('availability')
      .insert({
        day_of_week: day,
        start_time: startTime,
        end_time: endTime,
        member_id: memberId,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar horário:', error);
      setError('Erro ao criar horário. Verifique suas permissões (RLS).');
    } else if (data) {
      // Adiciona o novo horário à lista e reordena
      const updatedList = [...availabilities, data].sort(
        (a, b) => a.day_of_week - b.day_of_week
      );
      setAvailabilities(updatedList);
    }
  };

  // DELETE (Excluir horário)
  const handleDeleteAvailability = async (id: string) => {
    if (!window.confirm('Tem certeza que quer excluir este horário?')) {
      return;
    }

    const { error } = await supabase.from('availability').delete().eq('id', id);

    if (error) {
      console.error('Erro ao excluir:', error);
      setError('Não foi possível excluir o horário.');
    } else {
      setAvailabilities(availabilities.filter((a) => a.id !== id));
    }
  };

  if (loading) return <p>Carregando horários...</p>;

  // Helper para formatar a hora (ex: 09:00 -> 09h00)
  const formatTime = (time: string) => time.replace(':', 'h');

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold">Gerenciar Horários de Trabalho</h2>
      
      {/* Formulário de Criação (CREATE) */}
      <form onSubmit={handleCreateAvailability} className="mt-4 p-4 border rounded-md bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-x-6 gap-y-4">
          
          {/* Campo Dia da Semana */}
          <div className="md:col-span-2">
            <label htmlFor="dayOfWeek" className="block text-sm font-medium text-gray-700">
              Dia da Semana
            </label>
            <select
              id="dayOfWeek"
              value={day}
              onChange={(e) => setDay(parseInt(e.target.value))}
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm"
            >
              {daysOfWeek.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          {/* Campo Hora Início */}
          <div>
            <label htmlFor="startTime" className="block text-sm font-medium text-gray-700">
              Início
            </label>
            <input
              type="time"
              id="startTime"
              required
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm"
            />
          </div>

          {/* Campo Hora Fim */}
          <div>
            <label htmlFor="endTime" className="block text-sm font-medium text-gray-700">
              Fim
            </label>
            <input
              type="time"
              id="endTime"
              required
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm"
            />
          </div>
        </div>
        
        <div className="mt-5 text-right">
          <button type="submit" className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Adicionar Horário
          </button>
        </div>
      </form>
      {error && <p className="text-red-600 mt-2">{error}</p>}

      {/* Lista de Horários (READ / DELETE) */}
      <div className="mt-6 space-y-3">
        {availabilities.length === 0 && !loading && <p>Nenhum horário de trabalho cadastrado.</p>}
        
        {availabilities.map((avail) => (
          <div key={avail.id} className="flex justify-between items-center p-3 border rounded-md shadow-sm bg-white">
            <div>
              <p className="font-semibold">{daysOfWeek.find(d => d.id === avail.day_of_week)?.name}</p>
              <p className="text-sm text-gray-600">
                {formatTime(avail.start_time)} às {formatTime(avail.end_time)}
              </p>
            </div>
            <button
              onClick={() => handleDeleteAvailability(avail.id)}
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