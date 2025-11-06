// src/components/AgendaCalendar.tsx
import { useState, useEffect, useRef } from 'react'; // <-- 1. Importar o 'useRef'
import { supabase } from '../lib/supabaseClient';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction'; // Importa o plugin (código)
import { type DateClickArg } from '@fullcalendar/interaction'; // Importa o TIPO

// Define o "formato" do evento que o FullCalendar espera
type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
};

type Props = {
  organizationId: string;
  memberId?: string; // memberId is optional
};

export default function AgendaCalendar({ organizationId, memberId }: Props) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // 3. Criar uma 'ref' para podermos controlar o calendário
  const calendarRef = useRef<FullCalendar>(null);

  // READ (Ler agendamentos do banco ao carregar)
  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      
      let query = supabase
        .from('appointments')
        .select(`
          id,
          start_at,
          end_at,
          client_name,
          services ( name )
        `)
        .eq('organization_id', organizationId);

      if (memberId) {
        query = query.eq('member_id', memberId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar agendamentos:', error);
        setError('Não foi possível carregar a agenda.');
      } else {
        const formattedEvents = data.map((appt: any) => ({
          id: appt.id,
          title: `${appt.services.name} - ${appt.client_name}`,
          start: appt.start_at,
          end: appt.end_at,
          allDay: false,
        }));
        setEvents(formattedEvents);
      }
      setLoading(false);
    };

    fetchAppointments();
  }, [organizationId, memberId]);

  // 4. Nova Função: O que fazer ao clicar em uma data
  const handleDateClick = (arg: DateClickArg) => {
    // Pega a API do calendário através da 'ref'
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      // Muda a visão para 'timeGridDay' (Visão de Dia)
      // e foca na data que o usuário clicou (arg.date)
      calendarApi.changeView('timeGridDay', arg.date);
    }
  };

  if (loading) return <p>Carregando agenda...</p>;
  if (error) return <p className="text-red-600">{error}</p>;

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold mb-4">Sua Agenda</h2>
      <div className="p-4 bg-white rounded-lg shadow-md">
        <FullCalendar
          ref={calendarRef} // <-- 5. Adicionar a ref ao componente
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth" // <-- 6. MUDANÇA: Visão inicial (Mês)
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          events={events}
          locale="pt-br"
          buttonText={{
            today: 'Hoje',
            month: 'Mês',
            week: 'Semana',
            day: 'Dia',
            list: 'Lista',
          }}
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          dateClick={handleDateClick} // <-- 7. Adicionar o handler de clique
        />
      </div>
    </div>
  );
}