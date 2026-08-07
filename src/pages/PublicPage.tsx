import { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Loader2, Star, X } from 'lucide-react';
import confetti from 'canvas-confetti';
import { PublicLoading } from '../components/LoadingScreen';
import BackButton from '../components/BackButton';
import { useDocumentMeta } from '../lib/useDocumentMeta';

import { DayPicker } from 'react-day-picker';
import 'react-day-picker/dist/style.css';
import { ptBR } from 'date-fns/locale';
import { format, addMinutes, setHours, setMinutes, addDays } from 'date-fns';

type Organization = { id: string; name: string; require_confirmation?: boolean; buffer_minutes?: number; min_notice_hours?: number; booking_window_days?: number; max_per_day?: number | null; };
type Service = { id: string; name: string; duration: number; price: number; is_combo?: boolean; is_online?: boolean; online_url?: string | null; };
type Availability = { day_of_week: number; start_time: string; end_time: string; };
type Review = { rating: number; comment: string | null; client_name: string | null; created_at: string };
type PortfolioItem = { id: string; image_url: string; caption: string | null };

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
  const embed = new URLSearchParams(window.location.search).get('embed') === '1';

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [availability, setAvailability] = useState<Availability[]>([]);
  const [memberId, setMemberId] = useState<string | null>(null);
  const [memberName, setMemberName] = useState<string>('');
  const [memberAvatar, setMemberAvatar] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [comboItems, setComboItems] = useState<Record<string, string[]>>({});
  const [questions, setQuestions] = useState<{ id: string; label: string; required: boolean }[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const formOpenedAt = useRef<number>(Date.now());
  const [waitName, setWaitName] = useState('');
  const [waitPhone, setWaitPhone] = useState('');
  const [waitSaving, setWaitSaving] = useState(false);
  const [waitlistDone, setWaitlistDone] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [manageToken, setManageToken] = useState<string | null>(null);
  const [pendingBooking, setPendingBooking] = useState(false);
  const [manageLinkCopied, setManageLinkCopied] = useState(false);

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
          .select('id, name, require_confirmation, buffer_minutes, min_notice_hours, booking_window_days, max_per_day')
          .eq('slug', organizationSlug)
          .single();

        if (orgError || !orgData) throw new Error('Organização não encontrada. Verifique o link.');

        supabase.from('booking_questions').select('id, label, required').eq('organization_id', orgData.id).order('sort')
          .then(({ data }) => setQuestions((data || []) as any));

        const { data: membersData, error: memberError } = await supabase
          .from('members')
          .select('id, name, organization_id, avatar_url')
          .eq('slug', memberSlug)
          .eq('organization_id', orgData.id)
          .limit(1);

        if (memberError) throw new Error(`Erro ao buscar profissional: ${memberError.message}`);
        if (!membersData || membersData.length === 0) throw new Error('Profissional não encontrado para esta organização.');

        const member = membersData[0];

        setOrganization({ id: orgData.id, name: orgData.name, require_confirmation: orgData.require_confirmation, buffer_minutes: orgData.buffer_minutes, min_notice_hours: orgData.min_notice_hours, booking_window_days: orgData.booking_window_days, max_per_day: orgData.max_per_day });
        setMemberId(member.id);
        setMemberName(member.name);
        setMemberAvatar(member.avatar_url || null);

        // Avaliações do profissional
        supabase
          .from('reviews')
          .select('rating, comment, client_name, created_at')
          .eq('member_id', member.id)
          .order('created_at', { ascending: false })
          .then(({ data }) => setReviews(data || []));

        // Portfólio do profissional
        supabase
          .from('portfolio_items')
          .select('id, image_url, caption')
          .eq('member_id', member.id)
          .order('created_at', { ascending: false })
          .then(({ data }) => setPortfolio(data || []));

        const { data: servicesData, error: servicesError } = await supabase
          .from('member_services')
          .select('*, services(*)')
          .eq('member_id', member.id);

        if (servicesError) throw new Error(`Erro ao buscar serviços: ${servicesError.message}`);

        // Só serviços agendáveis: com duração e que não sejam produtos
        const professionalServices = servicesData
          .map((item: any) => item.services)
          .filter((s: any) => s && s.duration > 0 && !s.is_product) as Service[];
        setServices(professionalServices);

        // Itens dos combos (para exibir "inclui: ...")
        const comboIds = professionalServices.filter((s) => s.is_combo).map((s) => s.id);
        if (comboIds.length > 0) {
          supabase.from('combo_items').select('combo_id, services:item_service_id(name)').in('combo_id', comboIds)
            .then(({ data }) => {
              const map: Record<string, string[]> = {};
              (data || []).forEach((r: any) => { if (r.services?.name) (map[r.combo_id] = map[r.combo_id] || []).push(r.services.name); });
              setComboItems(map);
            });
        }

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
      const { data: busyData, error: busyError } = await supabase.rpc('get_busy_times', {
        p_member_id: memberId,
        p_from: `${dateStr}T00:00:00Z`,
        p_to: `${dateStr}T23:59:59Z`,
      });

      if (busyError) {
        setAvailableSlots([]);
        return;
      }
      // Limite de agendamentos por dia (cal.com "booking limits")
      const maxPerDay = organization?.max_per_day;
      if (maxPerDay != null && maxPerDay > 0) {
        const { data: dayCount } = await supabase.rpc('count_day_bookings', {
          p_member_id: memberId,
          p_from: `${dateStr}T00:00:00Z`,
          p_to: `${dateStr}T23:59:59Z`,
        });
        if ((dayCount ?? 0) >= maxPerDay) { setAvailableSlots([]); return; }
      }

      const busy = busyData || [];
      const now = new Date();
      // Antecedência mínima (cal.com "minimum notice")
      const minNotice = new Date(now.getTime() + (organization?.min_notice_hours || 0) * 3600000);
      const bufferMs = (organization?.buffer_minutes || 0) * 60000;
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
        const isOccupied = busy.some((appt: any) => {
          // Estende a faixa ocupada pelo buffer nos dois lados (intervalo entre atendimentos)
          const apptStart = new Date(new Date(appt.start_time).getTime() - bufferMs);
          const apptEnd = new Date(new Date(appt.end_time).getTime() + bufferMs);
          return currentSlotTime < apptEnd && slotEnd > apptStart;
        });
        const tooSoon = currentSlotTime <= minNotice;
        if (!isOccupied && !tooSoon) slots.push(format(currentSlotTime, 'HH:mm'));
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
    // Anti-spam: honeypot preenchido (bot) ou envio suspeito em <2s
    if (honeypot || Date.now() - formOpenedAt.current < 2000) {
      setBookingSuccess(true); // finge sucesso sem inserir
      return;
    }
    setBookingLoading(true);
    setError(null);
    try {
      const [startH, startM] = selectedSlot.split(':').map(Number);
      const startAt = setMinutes(setHours(selectedDate, startH), startM);
      const endAt = addMinutes(startAt, selectedService.duration);
      const status = organization?.require_confirmation ? 'pending' : 'confirmed';
      const answersByLabel = questions.reduce<Record<string, string>>((acc, q) => {
        const v = (answers[q.id] || '').trim();
        if (v) acc[q.label] = v;
        return acc;
      }, {});
      const { data: created, error: insertError } = await supabase.from('bookings').insert({
        member_id: memberId,
        service_id: selectedService.id,
        client_name: clientName,
        client_phone: clientPhone,
        client_email: clientEmail.trim() || null,
        start_time: startAt.toISOString(),
        end_time: endAt.toISOString(),
        status,
        custom_answers: Object.keys(answersByLabel).length ? answersByLabel : null,
      }).select('manage_token').single();
      if (insertError) {
        // Constraint de sobreposição → alguém pegou o horário primeiro
        if (insertError.code === '23P01' || insertError.message?.includes('bookings_no_overlap')) {
          setError('Esse horário acabou de ser reservado por outra pessoa. Escolha outro, por favor.');
          toast.error('Horário indisponível — escolha outro.');
          setAvailableSlots((slots) => slots.filter((s) => s !== selectedSlot));
          setSelectedSlot(null);
          return;
        }
        throw insertError;
      }
      setManageToken(created?.manage_token || null);
      setPendingBooking(status === 'pending');
      setBookingSuccess(true);
      if (!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
        confetti({ particleCount: 90, spread: 70, origin: { y: 0.6 }, colors: ['#6366f1', '#7c3aed', '#a78bfa'] });
      }
      toast.success(status === 'pending' ? 'Pedido de agendamento enviado!' : 'Agendamento confirmado!');
      setAvailableSlots((slots) => slots.filter((s) => s !== selectedSlot));
    } catch (err: any) {
      console.error(err);
      setError('Não foi possível concluir o agendamento. Tente novamente.');
      toast.error('Não foi possível concluir o agendamento.');
    } finally {
      setBookingLoading(false);
    }
  };

  const handleJoinWaitlist = async () => {
    if (waitName.trim().length < 2 || waitPhone.replace(/\D/g, '').length < 8) {
      toast.error('Informe nome e WhatsApp válidos.');
      return;
    }
    if (!memberId) return;
    setWaitSaving(true);
    const { error } = await supabase.from('waitlist').insert({
      member_id: memberId,
      service_id: selectedService?.id || null,
      client_name: waitName.trim(),
      client_phone: waitPhone.trim(),
    });
    setWaitSaving(false);
    if (error) { toast.error('Não foi possível entrar na lista.'); return; }
    setWaitlistDone(true);
    toast.success('Você entrou na lista de espera!');
  };

  // --- Renderização ---
  useDocumentMeta({
    title: memberName ? `${memberName}${organization ? ` — ${organization.name}` : ''}` : undefined,
    description: `Agende um horário com ${memberName}. Escolha o serviço e o melhor horário.`,
    image: memberAvatar,
  });

  if (loading) return <PublicLoading />;

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
    const closeSuccess = () => {
      setBookingSuccess(false);
      setClientName(''); setClientPhone(''); setClientEmail('');
      setSelectedService(null); setSelectedSlot(null);
      setManageToken(null); setPendingBooking(false);
    };
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-10 max-w-md w-full text-center relative">
          <button
            onClick={closeSuccess}
            aria-label="Fechar"
            className="absolute top-4 right-4 w-9 h-9 flex items-center justify-center rounded-full text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">{pendingBooking ? 'Pedido enviado!' : 'Agendado!'}</h1>
          <p className="text-gray-500 leading-relaxed">
            Obrigado, <strong>{clientName}</strong>! Seu horário com{' '}
            <strong>{memberName}</strong> para{' '}
            <strong>{selectedService?.name}</strong> no dia{' '}
            <strong>{selectedDate ? format(selectedDate, 'dd/MM/yyyy') : ''}</strong> às{' '}
            <strong>{selectedSlot}</strong>{' '}
            {pendingBooking
              ? 'foi solicitado. Você receberá a confirmação do profissional em breve.'
              : 'está confirmado.'}
          </p>
          {selectedService?.is_online && (
            <div className="mt-6 bg-sky-50 border border-sky-100 rounded-2xl p-4 text-left">
              <p className="text-xs font-semibold text-sky-800 mb-1">Atendimento online 💻</p>
              {selectedService.online_url ? (
                <a href={selectedService.online_url} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-600 hover:text-sky-800 break-all underline">{selectedService.online_url}</a>
              ) : (
                <p className="text-xs text-sky-500">O profissional enviará o link da chamada.</p>
              )}
            </div>
          )}
          {manageToken && (
            <div className="mt-4 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 text-left">
              <p className="text-xs font-semibold text-indigo-800 mb-1">Precisa cancelar ou remarcar?</p>
              <p className="text-xs text-indigo-500 mb-3">Guarde este link — é a sua chave para gerenciar o agendamento.</p>
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${window.location.origin}/agendamento/${manageToken}`);
                    setManageLinkCopied(true);
                    toast.success('Link copiado!');
                    setTimeout(() => setManageLinkCopied(false), 2000);
                  } catch { toast.error('Não foi possível copiar.'); }
                }}
                className="w-full bg-white border border-indigo-200 text-indigo-600 text-xs font-semibold py-2.5 px-3 rounded-xl hover:bg-indigo-100 transition-all truncate"
              >
                {manageLinkCopied ? '✓ Copiado!' : 'Copiar link de gerenciamento'}
              </button>
              <a
                href={`/agendamento/${manageToken}`}
                className="block text-center text-xs text-indigo-400 hover:text-indigo-600 mt-2 transition-colors"
              >
                Abrir agora →
              </a>
            </div>
          )}
          <button
            onClick={() => {
              setBookingSuccess(false);
              setClientName('');
              setClientPhone('');
              setClientEmail('');
              setSelectedService(null);
              setSelectedSlot(null);
              setManageToken(null);
              setPendingBooking(false);
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
          {!embed && (
            <div className="flex justify-center mb-4">
              <BackButton to={`/${organizationSlug}`} label={organization.name} variant="light" />
            </div>
          )}
          {memberAvatar ? (
            <img
              src={memberAvatar}
              alt={memberName}
              className="w-20 h-20 rounded-2xl object-cover mx-auto mb-3 border-2 border-white/30 shadow-xl"
            />
          ) : (
            <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-white">
              {memberName.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('')}
            </div>
          )}
          <h1 className="text-3xl font-extrabold text-white">{memberName}</h1>
          {reviews.length > 0 ? (
            <div className="flex items-center justify-center gap-1.5 mt-2">
              <Star className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span className="text-white font-semibold text-sm">
                {(reviews.reduce((a, r) => a + r.rating, 0) / reviews.length).toFixed(1)}
              </span>
              <span className="text-indigo-200 text-sm">· {reviews.length} avaliação{reviews.length > 1 ? 'ões' : ''}</span>
            </div>
          ) : (
            <p className="text-indigo-200 text-sm mt-1">Escolha o serviço e o melhor horário para você</p>
          )}
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
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-gray-900">{service.name}</p>
                        {service.is_combo && (
                          <span className="text-[10px] bg-violet-600 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Combo</span>
                        )}
                        {service.is_online && (
                          <span className="text-[10px] bg-sky-500 text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">Online</span>
                        )}
                      </div>
                      {service.is_combo && comboItems[service.id] && (
                        <p className="text-xs text-violet-500 mt-0.5">Inclui: {comboItems[service.id].join(' + ')}</p>
                      )}
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
                  toDate={addDays(new Date(), organization?.booking_window_days || 60)}
                  disabled={(day) => !availability.some((a) => a.day_of_week === day.getDay())}
                  className="border border-gray-100 rounded-xl p-2 shadow-sm"
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3 text-center">
                  {selectedDate ? format(selectedDate, 'PPP', { locale: ptBR }) : 'Selecione um dia'}
                </p>
                {availableSlots.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-gray-400 text-sm mb-3">Nenhum horário disponível para este dia.</p>
                    {!waitlistDone ? (
                      <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 text-left">
                        <p className="text-xs font-semibold text-indigo-800 mb-1">Entrar na lista de espera</p>
                        <p className="text-[11px] text-indigo-500 mb-3">Avisamos {memberName} do seu interesse. Ele entra em contato quando abrir horário.</p>
                        <div className="space-y-2">
                          <input type="text" placeholder="Seu nome" value={waitName} onChange={(e) => setWaitName(e.target.value)} className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <input type="tel" placeholder="Seu WhatsApp" value={waitPhone} onChange={(e) => setWaitPhone(e.target.value)} className="block w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                          <Button onClick={handleJoinWaitlist} disabled={waitSaving} className="w-full gradient-brand">
                            {waitSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Avisar meu interesse'}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-sm text-emerald-700 font-medium">
                        ✓ Você está na lista de espera!
                      </div>
                    )}
                  </div>
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
              {/* Honeypot anti-bot: invisível para humanos */}
              <input
                type="text"
                tabIndex={-1}
                autoComplete="off"
                value={honeypot}
                onChange={(e) => setHoneypot(e.target.value)}
                className="hidden"
                aria-hidden="true"
              />
              <div>
                <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Seu Nome
                </label>
                <input
                  type="text"
                  id="clientName"
                  required
                  minLength={2}
                  maxLength={120}
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
                  minLength={8}
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(XX) XXXXX-XXXX"
                  className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>
              <div>
                <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Seu E-mail <span className="text-gray-400 font-normal">(opcional — para receber lembrete)</span>
                </label>
                <input
                  type="email"
                  id="clientEmail"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="voce@email.com"
                  className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm"
                />
              </div>

              {/* Perguntas personalizadas da empresa */}
              {questions.map((q) => (
                <div key={q.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    {q.label} {q.required && <span className="text-rose-400">*</span>}
                  </label>
                  <input
                    type="text"
                    required={q.required}
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    className="block w-full px-4 py-3 border border-gray-200 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 text-sm"
                  />
                </div>
              ))}

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

        {/* Portfólio */}
        {portfolio.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Trabalhos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {portfolio.map((p) => (
                <a
                  key={p.id}
                  href={p.image_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="aspect-square rounded-xl overflow-hidden border border-gray-100 group"
                >
                  <img src={p.image_url} alt={p.caption || 'Trabalho'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Avaliações */}
        {reviews.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">O que dizem os clientes</h2>
            <div className="space-y-4">
              {reviews.slice(0, 5).map((r, i) => (
                <div key={i} className="border-b border-gray-50 last:border-0 pb-4 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star key={n} className={`w-4 h-4 ${r.rating >= n ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                      ))}
                    </div>
                    {r.client_name && <span className="text-xs text-gray-400 font-medium">{r.client_name}</span>}
                  </div>
                  {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
