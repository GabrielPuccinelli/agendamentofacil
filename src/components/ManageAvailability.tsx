import { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { useQuery, useMutation, useQueryClient } from "react-query";

type Availability = {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
};

type Props = {
  memberId: string;
};

const daysOfWeek = [
  { id: 0, name: "Domingo" },
  { id: 1, name: "Segunda-feira" },
  { id: 2, name: "Terça-feira" },
  { id: 3, name: "Quarta-feira" },
  { id: 4, name: "Quinta-feira" },
  { id: 5, name: "Sexta-feira" },
  { id: 6, name: "Sábado" },
];

export default function ManageAvailability({ memberId }: Props) {
  const queryClient = useQueryClient();
  const [day, setDay] = useState(1);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("18:00");

  const {
    data: availabilities,
    isLoading,
    error,
  } = useQuery(["availability", memberId], async () => {
    const { data, error } = await supabase
      .from("availability")
      .select("*")
      .eq("member_id", memberId)
      .order("day_of_week", { ascending: true });
    if (error) throw new Error(error.message);
    return data as Availability[];
  });

  const createAvailabilityMutation = useMutation(
    async ({ day, startTime, endTime }: { day: number, startTime: string, endTime: string }) => {
      const { data, error } = await supabase
        .from("availability")
        .insert({ day_of_week: day, start_time: startTime, end_time: endTime, member_id: memberId })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["availability", memberId]);
      },
    }
  );

  const deleteAvailabilityMutation = useMutation(
    async (id: string) => {
      const { error } = await supabase.from("availability").delete().eq("id", id);
      if (error) throw new Error(error.message);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(["availability", memberId]);
      },
    }
  );

  const handleCreateAvailability = (e: React.FormEvent) => {
    e.preventDefault();
    if (startTime >= endTime) {
      alert("O horário de início deve ser anterior ao horário de término.");
      return;
    }
    createAvailabilityMutation.mutate({ day, startTime, endTime });
  };

  const handleDeleteAvailability = (id: string) => {
    if (window.confirm("Tem certeza que quer excluir este horário?")) {
      deleteAvailabilityMutation.mutate(id);
    }
  };

  const formatTime = (time: string) => time.slice(0, 5).replace(":", "h");

  return (
    <div className="mt-6">
      <h2 className="text-xl font-semibold mb-4">Gerenciar Horários de Trabalho</h2>
      <form onSubmit={handleCreateAvailability} className="p-4 border rounded-md bg-gray-50 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium">Dia da Semana</label>
            <select value={day} onChange={(e) => setDay(parseInt(e.target.value))} className="mt-1 p-2 w-full border rounded-md">
              {daysOfWeek.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium">Início</label>
            <input type="time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} className="mt-1 p-2 w-full border rounded-md"/>
          </div>
          <div>
            <label className="block text-sm font-medium">Fim</label>
            <input type="time" required value={endTime} onChange={(e) => setEndTime(e.target.value)} className="mt-1 p-2 w-full border rounded-md"/>
          </div>
        </div>
        <div className="text-right mt-4">
          <button type="submit" disabled={createAvailabilityMutation.isLoading} className="px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300">
            {createAvailabilityMutation.isLoading ? "Adicionando..." : "Adicionar Horário"}
          </button>
        </div>
      </form>

      {createAvailabilityMutation.isError && <p className="text-red-600">{(createAvailabilityMutation.error as Error).message}</p>}
      {deleteAvailabilityMutation.isError && <p className="text-red-600">{(deleteAvailabilityMutation.error as Error).message}</p>}

      <div className="space-y-2">
        {isLoading ? (
          <p>Carregando horários...</p>
        ) : error ? (
          <p className="text-red-600">{(error as Error).message}</p>
        ) : availabilities?.length === 0 ? (
          <p>Nenhum horário de trabalho cadastrado.</p>
        ) : (
          availabilities?.map((avail) => (
            <div key={avail.id} className="flex justify-between items-center p-3 bg-white border rounded-md">
              <div>
                <p className="font-semibold">{daysOfWeek.find(d => d.id === avail.day_of_week)?.name}</p>
                <p className="text-sm text-gray-600">{formatTime(avail.start_time)} às {formatTime(avail.end_time)}</p>
              </div>
              <button onClick={() => handleDeleteAvailability(avail.id)} className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200">
                Excluir
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}