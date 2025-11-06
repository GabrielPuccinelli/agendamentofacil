// src/pages/PublicPage.tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

// Importações (DayPicker, date-fns, etc.)
import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { ptBR } from 'date-fns/locale';
import { format, addMinutes, setHours, setMinutes } from 'date-fns';

// --- Tipos de Dados ---
type Organization = { id: string; name: string; };
type Service = { id: string; name: string; duration_minutes: number; price: number; };
type Availability = { day_of_week: number; start_time: string; end_time: string; };

// --- Helpers de Data/Hora ---
const daysOfWeek = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
const formatTime = (time: string) => time.substring(0, 5).replace(':', 'h');


export default function PublicPage() {
  const { slug } = useParams<{ slug: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ... (Todos os outros 'useState' permanecem iguais) ...
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState<string>('');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);


  // --- 1. Efeito para Buscar Dados (CORRIGIDO) ---
  useEffect(() => {
    if (!slug) {
      setError('Nenhum profissional encontrado.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select(`
            id,
            name,
            organization_id,
            organizations ( name ) 
          `)
          .eq('slug', slug)
          .single();

        if (memberError) throw new Error('Profissional não encontrado. (Verifique o slug)');
        if (!memberData) throw new Error('Profissional não encontrado.');

        // --- A CORREÇÃO (É UM OBJETO, NÃO UM ARRAY) ---
        // O Supabase retorna 'organizations' como um OBJETO (ou null se o join falhar)
        const org = memberData.organizations as unknown as { name: string } | null;
        
        // Verificamos se o 'join' falhou (ex: RLS em falta)
        if (!org) { 
          console.error("Erro: O 'join' com a organização falhou. O objeto 'organizations' é nulo.");
          throw new Error("A organização deste profissional não foi encontrada ou está indisponível.");
        }
        // --- FIM DA CORREÇÃO ---

        // Agora 'org.name' é seguro de aceder
        setOrganization({ id: memberData.organization_id, name: org.name });
        setMemberId(memberData.id);
        setMemberName(memberData.name);

        // --- CORREÇÃO: Busca serviços através da tabela de junção ---
        const { data: servicesData, error: servicesError } = await supabase
          .from('member_services')
          .select(`
            services (id, name, duration_minutes, price)
          `)
          .eq('member_id', memberData.id);

        if (servicesError) throw new Error('Erro ao buscar os serviços do profissional.');

        // O resultado é um array de { services: { ... } }, então precisamos mapeá-lo
        const professionalServices = servicesData.map(item => item.services);
        setServices(professionalServices || []);
        // --- FIM DA CORREÇÃO ---

        const { data: availabilityData, error: availabilityError } = await supabase
          .from('availability')
          .select('day_of_week, start_time, end_time')
          .eq('member_id', memberData.id);
        if (availabilityError) throw new Error('Erro ao buscar horários.');
        setAvailability(availabilityData || []);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [slug]);


  // --- 2. Efeito para Calcular Horários Livres ---
  // (Este bloco permanece igual)
  useEffect(() => {
    if (!selectedService || !selectedDate || !memberId) {
      setAvailableSlots([]);
      return;
    }
    const calculateSlots = async () => {
      // (a lógica interna está correta)
      const dayOfWeek = selectedDate.getDay();
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const workHours = availability.find(a => a.day_of_week === dayOfWeek);
      if (!workHours) {
        setAvailableSlots([]);
        return;
      }
      const { data: existingAppointments, error: appointmentsError } = await supabase
        .from('appointments')
        .select('start_at, end_at')
        .eq('member_id', memberId)
        .gte('start_at', `${dateStr}T00:00:00`)
        .lte('end_at', `${dateStr}T23:59:59`);
      if (appointmentsError) {
        setAvailableSlots([]);
        return;
      }
      const slots: string[] = [];
      const { start_time, end_time } = workHours;
      const duration = selectedService.duration_minutes;
      let [startH, startM] = start_time.split(':').map(Number);
      let currentSlotTime = setMinutes(setHours(selectedDate, startH), startM);
      let [endH, endM] = end_time.split(':').map(Number);
      const endTime = setMinutes(setHours(selectedDate, endH), endM);
      while (currentSlotTime < endTime) {
        const slotEnd = addMinutes(currentSlotTime, duration);
        if (slotEnd > endTime) break;
        const isOccupied = existingAppointments?.some(appt => {
          const apptStart = new Date(appt.start_at);
          const apptEnd = new Date(appt.end_at);
          return (currentSlotTime < apptEnd && slotEnd > apptStart);
        });
        if (!isOccupied) {
          slots.push(format(currentSlotTime, 'HH:mm'));
        }
        currentSlotTime = slotEnd;
      }
      setAvailableSlots(slots);
    };
    calculateSlots();
  }, [selectedService, selectedDate, memberId, availability]);
  

  // --- 3. Função para Salvar o Agendamento (CREATE) ---
  // (Este bloco permanece igual)
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedSlot || !memberId || !organization) {
      setError('Por favor, complete todos os campos.');
      return;
    }
    setBookingLoading(true);
    setError(null);
    try {
      const [startH, startM] = selectedSlot.split(':').map(Number);
      const startAt = setMinutes(setHours(selectedDate, startH), startM);
      const endAt = addMinutes(startAt, selectedService.duration_minutes);
      const { error: insertError } = await supabase
        .from('appointments')
        .insert({
          organization_id: organization.id,
          member_id: memberId,
          service_id: selectedService.id,
          client_name: clientName,
          client_phone: clientPhone,
          start_at: startAt.toISOString(),
          end_at: endAt.toISOString(),
          status: 'confirmed',
          payment_status: 'pending',
        });
      if (insertError) throw insertError;
      setBookingSuccess(true);
      setAvailableSlots(slots => slots.filter(s => s !== selectedSlot));
      setSelectedSlot(null);
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível concluir o agendamento. Tente novamente.');
    } finally {
      setBookingLoading(false);
    }
  };

  // --- Renderização da Página ---
  
  if (loading) { 
    return <div className="flex justify-center items-center min-h-screen"><h1 className="text-2xl">Carregando agendamento...</h1></div>;
  }
  
  if (error) {
    return <div className="flex justify-center items-center min-h-screen"><h1 className="text-2xl text-red-600">{error}</h1></div>;
  }
  
  if (!organization) {
     return <div className="flex justify-center items-center min-h-screen"><h1 className="text-2xl text-gray-500">Página não encontrada.</h1></div>;
  }

  // Página de Sucesso
  if (bookingSuccess) {
    return (
      <div className="max-w-md mx-auto p-8 text-center">
        <h1 className="text-3xl font-bold text-green-600 mb-4">Agendamento Confirmado!</h1>
        <p className="text-lg text-gray-700">
          Obrigado, {clientName}. Seu horário com {memberName} para {selectedService?.name} no dia {selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''} às {selectedSlot} está confirmado.
        </p>
        <button
          onClick={() => {
            setBookingSuccess(false);
            setClientName('');
            setClientPhone('');
            setSelectedService(null);
          }}
          className="mt-6 px-4 py-2 bg-blue-600 text-white rounded-md"
        >
          Agendar outro horário
        </button>
      </div>
    );
  }

  // Página Principal de Agendamento
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold">{organization.name}</h1>
        <p className="text-2xl text-gray-700 mt-2">
          Agendando com: <span className="font-bold">{memberName}</span>
        </p>
      </div>

      {/* --- ETAPA 1: Selecionar Serviço --- */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold mb-4">1. Escolha o Serviço</h2>
        <div className="space-y-3">
          {services.map(service => (
            <button
              key={service.id}
              onClick={() => setSelectedService(service)}
              className={`w-full p-4 border rounded-lg text-left ${selectedService?.id === service.id ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500' : 'bg-white hover:bg-gray-50'}`}
            >
              <div className="flex justify-between">
                <span className="font-bold">{service.name}</span>
                <span className="font-semibold">R$ {service.price.toFixed(2)}</span>
              </div>
              <p className="text-sm text-gray-500">{service.duration_minutes} minutos</p>
            </button>
          ))}
        </div>
      </div>

      {/* --- ETAPA 2: Selecionar Data e Hora --- */}
      {selectedService && (
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-4">2. Escolha a Data e Horário</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex justify-center">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                fromDate={new Date()}
                disabled={day => !availability.some(a => a.day_of_week === day.getDay())}
                className="border rounded-lg p-2"
              />
            </div>
            <div>
              <p className="text-center font-medium mb-3">
                {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : 'Selecione um dia'}
              </p>
              {availableSlots.length === 0 && (
                <p className="text-center text-gray-500">Nenhum horário disponível para este dia.</p>
              )}
              <div className="grid grid-cols-3 gap-2">
                {availableSlots.map(slot => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`p-2 border rounded-md text-sm ${selectedSlot === slot ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100'}`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- ETAPA 3: Confirmar Dados --- */}
      {selectedSlot && (
        <div>
          <h2 className="text-2xl font-semibold mb-4">3. Seus Dados</h2>
          <form onSubmit={handleBookAppointment} className="p-4 bg-gray-50 border rounded-lg space-y-4">
            <div>
              <label htmlFor="clientName" className="block text-sm font-medium text-gray-700">Seu Nome</label>
              <input
                type="text" id="clientName" required
                value={clientName} onChange={e => setClientName(e.target.value)}
                className="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div>
              <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700">Seu WhatsApp</label>
              <input
                type="tel" id="clientPhone" required
                value={clientPhone} onChange={e => setClientPhone(e.target.value)}
                placeholder="(XX) XXXXX-XXXX"
                className="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm"
              />
            </div>
            <div className="pt-2 text-right">
              <button
                type="submit"
                disabled={bookingLoading}
                className="w-full md:w-auto px-6 py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {bookingLoading ? 'Agendando...' : 'Confirmar Agendamento'}
              </button>
            </div>
          </form>
        </div>
      )}
      
    </div>
  );
}