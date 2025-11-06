import { useRef } from "react";
import { supabase } from "../lib/supabaseClient";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import { type DateClickArg } from "@fullcalendar/interaction";
import { useQuery } from "react-query";

type CalendarEvent = {
  id: string;
  title: string;
  start: string;
  end: string;
  allDay: boolean;
};

type Props = {
  organizationId?: string; // Optional: for fetching all bookings
  memberId?: string;       // Optional: for fetching member-specific bookings
};

// A component MUST receive either organizationId or memberId
export default function AgendaCalendar({ organizationId, memberId }: Props) {
  const calendarRef = useRef<FullCalendar>(null);

  const fetchKey = memberId ? ["bookings", memberId] : ["bookings", organizationId];

  const {
    data: events,
    isLoading,
    error,
  } = useQuery(
    fetchKey,
    async () => {
      if (!organizationId && !memberId) {
        return []; // Should not happen if component is used correctly
      }

      let query = supabase.from("bookings").select(`
        id,
        start_time,
        end_time,
        client_name,
        services ( name )
      `);

      if (memberId) {
        query = query.eq("member_id", memberId);
      } else if (organizationId) {
        // This requires a bit more work. Find all members of the org first.
        const { data: members, error: memberError } = await supabase
          .from("members")
          .select("id")
          .eq("organization_id", organizationId);

        if (memberError) throw new Error(memberError.message);
        const memberIds = members.map(m => m.id);
        query = query.in("member_id", memberIds);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message);
      }

      const formattedEvents = data.map((appt: any) => ({
        id: appt.id,
        title: `${appt.services?.name || "Serviço"} - ${appt.client_name}`,
        start: appt.start_time,
        end: appt.end_time,
        allDay: false,
      }));
      return formattedEvents as CalendarEvent[];
    },
    {
      enabled: !!organizationId || !!memberId,
    }
  );

  const handleDateClick = (arg: DateClickArg) => {
    const calendarApi = calendarRef.current?.getApi();
    if (calendarApi) {
      calendarApi.changeView("timeGridDay", arg.date);
    }
  };

  if (isLoading) return <p>Carregando agenda...</p>;
  if (error) return <p className="text-red-600">{(error as Error).message}</p>;

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold mb-4">Agenda</h2>
      <div className="p-4 bg-white rounded-lg shadow-md">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          headerToolbar={{
            left: "prev,next today",
            center: "title",
            right: "dayGridMonth,timeGridWeek,timeGridDay,listWeek",
          }}
          events={events}
          locale="pt-br"
          buttonText={{
            today: "Hoje",
            month: "Mês",
            week: "Semana",
            day: "Dia",
            list: "Lista",
          }}
          height="auto"
          slotMinTime="06:00:00"
          slotMaxTime="22:00:00"
          allDaySlot={false}
          dateClick={handleDateClick}
        />
      </div>
    </div>
  );
}
