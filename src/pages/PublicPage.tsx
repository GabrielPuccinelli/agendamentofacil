import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { ptBR } from 'date-fns/locale';
import { format, addMinutes, setHours, setMinutes } from 'date-fns';

type Organization = { id: string; name: string; };
type Service = { id: string; name: string; duration: number; price: number; };
type Availability = { day_of_week: number; start_time: string; end_time: string; };

const Spinner = ({ label }: { label: string }) => (
  <div className="flex justify-center items-center min-h-screen bg-gray-50">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">{label}</p>
    </div>
  </div>
);

const StepHeader = ({ number, title, active }: { number: string; title: string; active: boolean }) => (
  <div className={`flex items-center gap-3 mb-5 transition-opacity duration-300 ${active ? 'opacity-100' : 'opacity-60'}`}>
    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-sm font-bold shrink-0 ${active ? 'gradient-brand text-white shadow-md shadow-indigo-500/20' : 'bg-gray-100 text-gray-500'}`}>
      {number}
    </div>
    <h2 className={`text-lg font-bold ${active ? 'text-gray-900' : 'text-gray-500'}`}>{title}</h2>
  </div>
);

export default function PublicPage() {
  const { organizationSlug, memberSlug } = useParams<{ organizationSlug: string; memberSlug: string }>();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // --- 1. Buscar dados iniciais ---
  useEffect(() => {
    if (!organizationSlug || !memberSlug) {
      setError('Link inválido.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('slug', organizationSlug)
          .single();

        if (orgError || !orgData) throw new Error('Organização não encontrada. Verifique o link.');

        const { data: membersData, error: memberError } = await supabase
          .from('members')
          .select('id, name, organization_id')
          .eq('slug', memberSlug)
          .eq('organization_id', orgData.id)
          .limit(1);

        if (memberError) throw new Error(`Erro ao buscar profissional: ${memberError.message}`);
        if (!membersData || membersData.length === 0) throw new Error('Profissional não encontrado para esta organização.');

        const member = membersData[0];

        setOrganization({ id: orgData.id, name: orgData.name });
        setMemberId(member.id);
        setMemberName(member.name);

        const { data: servicesData, error: servicesError } = await supabase
          .from('member_services')
          .select('*, services(*)')
          .eq('member_id', member.id);

        if (servicesError) throw new Error(`Erro ao buscar serviços: ${servicesError.message}`);

        const professionalServices = servicesData.map((item: any) => item.services).filter(Boolean) as Service[];
        setServices(professionalServices);

        const { data: availabilityData, error: availabilityError } = await supabase
          .from('availability')
          .select('day_of_week, start_time, end_time')
          .eq('member_id', member.id);
        if (availabilityError) throw new Error('Erro ao buscar horários.');
        setAvailability(availabilityData || []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [organizationSlug, memberSlug]);

  // --- 2. Calcular horários livres ---
  useEffect(() => {
    if (!selectedService || !selectedDate || !memberId) {
      setAvailableSlots([]);
      return;
    }
    const calculateSlots = async () => {
      const dayOfWeek = selectedDate.getDay();
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      const workHours = availability.find((a) => a.day_of_week === dayOfWeek);
      if (!workHours) {
        setAvailableSlots([]);
        return;
      }
      const { data: existingAppointments, error: appointmentsError } = await supabase
        .from('bookings')
        .select('start_time, end_time')
        .eq('member_id', memberId)
        .gte('start_time', `${dateStr}T00:00:00Z`)
        .lte('end_time', `${dateStr}T23:59:59Z`);

      if (appointmentsError) {
        setAvailableSlots([]);
        return;
      }
      const slots: string[] = [];
      const { start_time, end_time } = workHours;
      const duration = selectedService.duration;
      const [startH, startM] = start_time.split(':').map(Number);
      let currentSlotTime = setMinutes(setHours(selectedDate, startH), startM);
      const [endH, endM] = end_time.split(':').map(Number);
      const endTime = setMinutes(setHours(selectedDate, endH), endM);
      while (currentSlotTime < endTime) {
        const slotEnd = addMinutes(currentSlotTime, duration);
        if (slotEnd > endTime) break;
        const isOccupied = existingAppointments?.some((appt) => {
          const apptStart = new Date(appt.start_time);
          const apptEnd = new Date(appt.end_time);
          return currentSlotTime < apptEnd && slotEnd > apptStart;
        });
        if (!isOccupied) slots.push(format(currentSlotTime, 'HH:mm'));
        currentSlotTime = slotEnd;
      }
      setAvailableSlots(slots);
    };
    calculateSlots();
  }, [selectedService, selectedDate, memberId, availability]);

  // --- 3. Confirmar agendamento ---
  const handleBookAppointment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedDate || !selectedSlot || !memberId) {
      setError('Por favor, complete todos os campos.');
      return;
    }
    setBookingLoading(true);
    setError(null);
    try {
      const [startH, startM] = selectedSlot.split(':').map(Number);
      const startAt = setMinutes(setHours(selectedDate, startH), startM);
      const endAt = addMinutes(startAt, selectedService.duration);
      const { error: insertError } = await supabase.from('bookings').insert({
        member_id: memberId,
        service_id: selectedService.id,
        client_name: clientName,
        client_phone: clientPhone,
        start_time: startAt.toISOString(),
        end_time: endAt.toISOString(),
      });
      if (insertError) throw insertError;
      setBookingSuccess(true);
      toast.success('Agendamento confirmado!');
      setAvailableSlots((slots) => slots.filter((s) => s !== selectedSlot));
      setSelectedSlot(null);
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível concluir o agendamento. Tente novamente.');
      toast.error('Não foi possível concluir o agendamento.');
    } finally {
      setBookingLoading(false);
    }
  };

  // --- Renderização ---
  if (loading) return <Spinner label="Carregando agendamento..." />;

  if (error && !organization) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 gap-4 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-xl font-semibold text-gray-800">{error}</p>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <p className="text-xl text-gray-500">Página não encontrada.</p>
      </div>
    );
  }

  if (bookingSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Agendado!</h1>
          <p className="text-gray-500 leading-relaxed">
            Obrigado, <strong>{clientName}</strong>! Seu horário com{' '}
            <strong>{memberName}</strong> para{' '}
            <strong>{selectedService?.name}</strong> no dia{' '}
            <strong>{selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''}</strong> às{' '}
            <strong>{selectedSlot}</strong> está confirmado.
          </p>
          <button
            onClick={() => {
              setBookingSuccess(false);
              setClientName('');
              setClientPhone('');
              setSelectedService(null);
            }}
            className="mt-8 w-full gradient-brand text-white font-bold py-3 px-6 rounded-2xl hover:opacity-90 transition-all duration-200 hover:shadow-lg hover:shadow-indigo-500/30"
          >
            Agendar outro horário
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="gradient-brand py-12 px-4 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <p className="text-indigo-200 text-sm font-medium mb-1">{organization.name}</p>
          <h1 className="text-3xl font-extrabold text-white">
            Agendar com <span className="text-indigo-200">{memberName}</span>
          </h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Error inline */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-sm flex items-start gap-3">
            <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
          </div>
        )}

        {/* Step 1 - Service */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <StepHeader number="1" title="Escolha o Serviço" active={!selectedService || true} />
          {services.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">Nenhum serviço disponível.</p>
          ) : (
            <div className="space-y-3">
              {services.map((service) => (
                <button
                  key={service.id}
                  onClick={() => { setSelectedService(service); setSelectedSlot(null); }}
                  className={`w-full p-4 border-2 rounded-xl text-left transition-all duration-200 ${
                    selectedService?.id === service.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-100 bg-gray-50 hover:border-indigo-200 hover:bg-indigo-50/50'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900">{service.name}</p>
                      <p className="text-sm text-gray-400 mt-0.5">{service.duration} minutos</p>
                    </div>
                    <span className={`text-base font-bold shrink-0 ml-3 ${selectedService?.id === service.id ? 'text-indigo-600' : 'text-gray-700'}`}>
                      R$ {service.price.toFixed(2)}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 2 - Date & Time */}
        {selectedService && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <StepHeader number="2" title="Escolha a Data e Horário" active />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex justify-center">
                <DayPicker
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => { setSelectedDate(d); setSelectedSlot(null); }}
                  locale={ptBR}
                  fromDate={new Date()}
                  disabled={(day) => !availability.some((a) => a.day_of_week === day.getDay())}
                  className="border border-gray-100 rounded-xl p-2 shadow-sm"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3 text-center">
                  {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : 'Selecione um dia'}
                </p>
                {availableSlots.length === 0 ? (
                  <p className="text-center text-gray-400 text-sm py-6">
                    Nenhum horário disponível para este dia.
                  </p>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {availableSlots.map((slot) => (
                      <button
                        key={slot}
                        onClick={() => setSelectedSlot(slot)}
                        className={`p-2.5 border-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                          selectedSlot === slot
                            ? 'gradient-brand text-white border-indigo-500 shadow-md shadow-indigo-500/20'
                            : 'border-gray-100 text-gray-700 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 3 - Client data */}
        {selectedSlot && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6"
          >
            <StepHeader number="3" title="Seus Dados" active />
            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div>
                <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Seu Nome
                </label>
                <input
                  type="text"
                  id="clientName"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nome completo"
                  className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>
              <div>
                <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Seu WhatsApp
                </label>
                <input
                  type="tel"
                  id="clientPhone"
                  required
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(XX) XXXXX-XXXX"
                  className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>

              {/* Summary */}
              <div className="bg-indigo-50 rounded-xl p-4 text-sm space-y-1.5">
                <p className="font-semibold text-indigo-800 mb-2">Resumo do agendamento</p>
                <p className="text-indigo-700 flex justify-between"><span>Serviço</span> <strong>{selectedService?.name}</strong></p>
                <p className="text-indigo-700 flex justify-between"><span>Data</span> <strong>{selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''}</strong></p>
                <p className="text-indigo-700 flex justify-between"><span>Horário</span> <strong>{selectedSlot}</strong></p>
                <p className="text-indigo-700 flex justify-between"><span>Profissional</span> <strong>{memberName}</strong></p>
              </div>

              <Button
                type="submit"
                disabled={bookingLoading}
                className="w-full gradient-brand h-auto py-4 rounded-2xl text-base font-bold shadow-md shadow-indigo-500/20 hover:opacity-90 hover:shadow-lg hover:shadow-indigo-500/30"
              >
                {bookingLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Agendando...</>
                ) : (
                  'Confirmar Agendamento'
                )}
              </Button>
            </form>
          </motion.div>
        )}
      </div>
    </div>
  );
}
