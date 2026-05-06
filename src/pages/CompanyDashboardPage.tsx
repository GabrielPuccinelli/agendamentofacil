import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/Sidebar';
import type { SidebarProps } from '../components/Sidebar';
import ManageServices from '../components/ManageServices';
import ManageMembers from '../components/ManageMembers';
import { QueryClient, QueryClientProvider } from 'react-query';

const queryClient = new QueryClient();

type Booking = {
  id: string;
  start_time: string;
  end_time: string;
  client_name: string;
  member_id: string;
  status: string;
  services: { name: string; price: number; category?: string } | null;
};

type MemberStat = { id: string; name: string; bookings: number; revenue: number; cancelled: number };
type ServiceStat = { name: string; category: string; count: number; revenue: number };
type MonthData = { label: string; key: string; bookings: number; revenue: number };

// ── Stat card ─────────────────────────────────────────────────────────────────
const KpiCard = ({
  label, value, sub, icon, color, trend,
}: {
  label: string; value: string; sub?: string;
  icon: React.ReactNode; color: string; trend?: { value: string; up: boolean };
}) => (
  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex gap-4 items-start">
    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
      {icon}
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-xs text-gray-500 font-medium truncate">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900 leading-tight mt-0.5">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      {trend && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${trend.up ? 'text-emerald-500' : 'text-red-400'}`}>
          <svg className={`w-3 h-3 ${trend.up ? '' : 'rotate-180'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 10l7-7m0 0l7 7m-7-7v18" />
          </svg>
          {trend.value} vs mês anterior
        </div>
      )}
    </div>
  </div>
);

// ── Bar row ────────────────────────────────────────────────────────────────────
const BarRow = ({ name, value, max, sub, color = 'gradient-brand' }: {
  name: string; value: number; max: number; sub: string; color?: string;
}) => (
  <div className="flex items-center gap-3">
    <div className="w-28 text-sm text-gray-600 truncate shrink-0 font-medium">{name}</div>
    <div className="flex-1 bg-gray-100 rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-full ${color} rounded-full transition-all duration-700`}
        style={{ width: max > 0 ? `${(value / max) * 100}%` : '0%' }}
      />
    </div>
    <div className="text-sm font-bold text-gray-800 w-8 text-right shrink-0">{value}</div>
    <div className="text-xs text-gray-400 w-24 text-right shrink-0">{sub}</div>
  </div>
);

// ── Month bar ──────────────────────────────────────────────────────────────────
const MonthBar = ({ label, value, max, revenue }: { label: string; value: number; max: number; revenue: number }) => (
  <div className="flex flex-col items-center gap-1">
    <div className="text-xs text-emerald-600 font-semibold">
      {revenue > 0 ? `R$${(revenue / 1000).toFixed(1)}k` : ''}
    </div>
    <div className="relative w-10 bg-gray-100 rounded-t-lg overflow-hidden" style={{ height: '80px' }}>
      <div
        className="absolute bottom-0 left-0 right-0 gradient-brand rounded-t-lg transition-all duration-700"
        style={{ height: max > 0 ? `${(value / max) * 100}%` : '0%' }}
      />
    </div>
    <div className="text-xs text-gray-700 font-semibold">{value}</div>
    <div className="text-xs text-gray-400">{label}</div>
  </div>
);

export default function CompanyDashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [sidebarProps, setSidebarProps] = useState<Omit<SidebarProps, 'onLogout'> | null>(null);
  const [orgId, setOrgId] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [memberStats, setMemberStats] = useState<MemberStat[]>([]);
  const [serviceStats, setServiceStats] = useState<ServiceStat[]>([]);
  const [monthData, setMonthData] = useState<MonthData[]>([]);
  const [membersMap, setMembersMap] = useState<Record<string, string>>({});

  const initialTab = location.pathname.endsWith('/services')
    ? 'services'
    : location.pathname.endsWith('/team')
    ? 'team'
    : 'overview';
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'services'>(initialTab);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/login'); return; }

      const { data: member } = await supabase
        .from('members')
        .select('id, name, role, organization_id, phone, avatar_url')
        .eq('user_id', session.user.id)
        .single();

      if (!member || member.role !== 'admin') { navigate('/dashboard'); return; }

      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('id', member.organization_id)
        .single();

      const { data: allMembers } = await supabase
        .from('members')
        .select('id, name, slug')
        .eq('organization_id', member.organization_id);

      const memberMap: Record<string, string> = {};
      allMembers?.forEach((m) => { memberMap[m.id] = m.name; });
      setMembersMap(memberMap);

      const memberIds = allMembers?.map((m) => m.id) || [];

      const { data: rawBookings } = await supabase
        .from('bookings')
        .select('id, start_time, end_time, client_name, member_id, status, services(name, price, category)')
        .in('member_id', memberIds)
        .order('start_time', { ascending: false });

      const bks = (rawBookings || []) as Booking[];
      setBookings(bks);

      // Compute stats
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const statMap: Record<string, MemberStat> = {};
      allMembers?.forEach((m) => { statMap[m.id] = { id: m.id, name: m.name, bookings: 0, revenue: 0, cancelled: 0 }; });

      const svcMap: Record<string, ServiceStat> = {};
      const months: MonthData[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          label: d.toLocaleString('pt-BR', { month: 'short' }),
          key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
          bookings: 0,
          revenue: 0,
        });
      }

      bks.forEach((b: any) => {
        const price = b.services?.price || 0;
        const isCancelled = b.status === 'cancelled';
        const monthKey = b.start_time.slice(0, 7);

        if (statMap[b.member_id]) {
          statMap[b.member_id].bookings++;
          if (!isCancelled) statMap[b.member_id].revenue += price;
          if (isCancelled) statMap[b.member_id].cancelled++;
        }

        if (b.services?.name) {
          const svcKey = b.services.name;
          if (!svcMap[svcKey]) svcMap[svcKey] = { name: svcKey, category: b.services.category || '', count: 0, revenue: 0 };
          svcMap[svcKey].count++;
          if (!isCancelled) svcMap[svcKey].revenue += price;
        }

        const month = months.find((m) => m.key === monthKey);
        if (month && !isCancelled) { month.bookings++; month.revenue += price; }
      });

      setMemberStats(Object.values(statMap).sort((a, b) => b.bookings - a.bookings));
      setServiceStats(Object.values(svcMap).sort((a, b) => b.revenue - a.revenue).slice(0, 8));
      setMonthData(months);
      setOrgId(org?.id || '');
      setOrgName(org?.name || '');
      setOrgSlug(org?.slug || '');

      setSidebarProps({
        userProfile: { name: member.name, phone: member.phone, avatarUrl: member.avatar_url || '' },
        isAdmin: true,
        members: allMembers || [],
        organizationSlug: org?.slug || null,
        organizationName: org?.name || null,
      });
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleLogout = async () => { await supabase.auth.signOut(); };

  if (loading || !sidebarProps) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-indigo-400 text-sm">Carregando analytics...</p>
        </div>
      </div>
    );
  }

  // Derived metrics
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  let totalBookings = 0, totalRevenue = 0, monthBookings = 0, monthRevenue = 0;
  let cancelledTotal = 0, prevMonthBookings = 0, prevMonthRevenue = 0;

  bookings.forEach((b: any) => {
    const price = b.services?.price || 0;
    const isCancelled = b.status === 'cancelled';
    if (isCancelled) { cancelledTotal++; return; }
    totalBookings++; totalRevenue += price;
    if (b.start_time >= startOfMonth) { monthBookings++; monthRevenue += price; }
    if (b.start_time >= prevMonthStart && b.start_time <= prevMonthEnd) { prevMonthBookings++; prevMonthRevenue += price; }
  });

  const avgTicket = totalBookings > 0 ? totalRevenue / totalBookings : 0;
  const cancellationRate = bookings.length > 0 ? ((cancelledTotal / bookings.length) * 100).toFixed(0) : '0';

  const maxMonthBookings = Math.max(...monthData.map((m) => m.bookings), 1);
  const maxMemberBookings = Math.max(...memberStats.map((m) => m.bookings), 1);
  const maxSvcRevenue = Math.max(...serviceStats.map((s) => s.revenue), 1);

  const recentBookings = bookings.slice(0, 8);

  const today = now.toISOString().slice(0, 10);
  const todayBookings = bookings.filter((b) => b.start_time.startsWith(today) && b.status !== 'cancelled');

  // Busiest day of week
  const dayCount = [0, 0, 0, 0, 0, 0, 0];
  bookings.forEach((b) => { if (b.status !== 'cancelled') dayCount[new Date(b.start_time).getDay()]++; });
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const maxDay = Math.max(...dayCount, 1);

  const bookingTrend = prevMonthBookings > 0
    ? `${monthBookings > prevMonthBookings ? '+' : ''}${(((monthBookings - prevMonthBookings) / prevMonthBookings) * 100).toFixed(0)}%`
    : null;

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar {...sidebarProps} onLogout={handleLogout} />

      <main className="flex-1 p-6 md:p-8 overflow-auto min-w-0">
        {/* Header */}
        <div className="gradient-brand rounded-2xl p-6 mb-8 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
          <div className="absolute -bottom-8 left-20 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs bg-white/20 text-white px-2 py-0.5 rounded-full font-medium">Analytics</span>
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-indigo-200">Dados em tempo real</span>
              </div>
              <h1 className="text-2xl md:text-3xl font-bold">{orgName}</h1>
              <p className="text-indigo-200 text-sm mt-1">Painel executivo · {now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</p>
            </div>
            <div className="flex items-center gap-2">
              {orgSlug && (
                <a
                  href={`/e/${orgSlug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-medium px-3 py-2 rounded-xl transition-all"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Página pública
                </a>
              )}
              <Link
                to="/dashboard"
                className="flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-medium px-3 py-2 rounded-xl transition-all"
              >
                ← Meu Dashboard
              </Link>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {(['overview', 'team', 'services'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'gradient-brand text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {tab === 'overview' ? '📊 Visão Geral' : tab === 'team' ? '👥 Equipe' : '✂️ Serviços'}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiCard
                label="Agendamentos (mês)"
                value={String(monthBookings)}
                sub="confirmados"
                color="bg-indigo-50"
                trend={bookingTrend ? { value: bookingTrend, up: monthBookings >= prevMonthBookings } : undefined}
                icon={
                  <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
              <KpiCard
                label="Faturamento (mês)"
                value={`R$ ${monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                sub="líquido confirmado"
                color="bg-emerald-50"
                icon={
                  <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <KpiCard
                label="Ticket Médio"
                value={`R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`}
                sub="por atendimento"
                color="bg-violet-50"
                icon={
                  <svg className="w-6 h-6 text-violet-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
              />
              <KpiCard
                label="Taxa de Cancelamento"
                value={`${cancellationRate}%`}
                sub={`${cancelledTotal} cancelado(s)`}
                color="bg-rose-50"
                icon={
                  <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Monthly trend */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Tendência Mensal</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Agendamentos confirmados por mês</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-gray-400">
                      <div className="w-3 h-3 rounded gradient-brand" />
                      Agendamentos
                    </span>
                  </div>
                </div>
                {monthData.every((m) => m.bookings === 0) ? (
                  <div className="flex items-center justify-center h-24 text-gray-300 text-sm">Nenhum dado ainda</div>
                ) : (
                  <div className="flex items-end justify-around gap-2">
                    {monthData.map((m) => (
                      <MonthBar key={m.key} label={m.label} value={m.bookings} max={maxMonthBookings} revenue={m.revenue} />
                    ))}
                  </div>
                )}
              </div>

              {/* Today */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                  <h2 className="text-lg font-bold text-gray-900">Hoje</h2>
                </div>
                <p className="text-3xl font-extrabold text-gray-900 mb-1">{todayBookings.length}</p>
                <p className="text-xs text-gray-400 mb-4">atendimento(s) confirmado(s)</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {todayBookings.length === 0 ? (
                    <p className="text-sm text-gray-300 text-center py-4">Nenhum agendamento hoje</p>
                  ) : todayBookings.slice(0, 5).map((b) => (
                    <div key={b.id} className="flex items-center gap-2 py-1.5 border-b border-gray-50 last:border-0">
                      <div className="w-7 h-7 rounded-lg gradient-brand flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {b.client_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-gray-800 truncate">{b.client_name}</p>
                        <p className="text-xs text-gray-400">{new Date(b.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Day of week + Recent bookings */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Busiest days */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Dias Mais Movimentados</h2>
                <p className="text-xs text-gray-400 mb-5">Distribuição histórica por dia da semana</p>
                <div className="space-y-3">
                  {dayLabels.map((d, i) => (
                    <BarRow
                      key={d}
                      name={d}
                      value={dayCount[i]}
                      max={maxDay}
                      sub={`${dayCount[i]} atend.`}
                      color={dayCount[i] === maxDay ? 'gradient-brand' : 'bg-indigo-200'}
                    />
                  ))}
                </div>
              </div>

              {/* Recent */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-5">Agendamentos Recentes</h2>
                {recentBookings.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-8">Nenhum agendamento ainda.</p>
                ) : (
                  <div className="space-y-3">
                    {recentBookings.map((b) => (
                      <div key={b.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white text-sm font-bold shrink-0 ${
                          b.status === 'cancelled' ? 'bg-gray-300' : 'gradient-brand'
                        }`}>
                          {b.client_name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-gray-800 truncate">{b.client_name}</p>
                          <p className="text-xs text-gray-400 truncate">
                            {membersMap[b.member_id] || '—'} · {b.services?.name || '—'}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-semibold text-gray-700">
                            {new Date(b.start_time).toLocaleDateString('pt-BR')}
                          </p>
                          {b.status === 'cancelled' ? (
                            <span className="text-xs text-red-400 font-medium">Cancelado</span>
                          ) : (
                            <p className="text-xs text-emerald-600 font-medium">
                              R$ {(b.services?.price || 0).toFixed(2)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* ── Services Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'services' && orgId && (
          <div className="space-y-6">
            {/* Service CRUD */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <QueryClientProvider client={queryClient}>
                <ManageServices
                  memberId=""
                  organizationId={orgId}
                  canEditPrice={true}
                />
              </QueryClientProvider>
            </div>

            {/* Analytics — top services from bookings */}
            {serviceStats.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Desempenho por Serviço</h2>
                <p className="text-xs text-gray-400 mb-6">Baseado em agendamentos registrados</p>
                <div className="space-y-4">
                  {serviceStats.map((s, i) => (
                    <div key={s.name} className="flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                        i === 0 ? 'gradient-brand' : i === 1 ? 'bg-violet-400' : 'bg-gray-300'
                      }`}>
                        {i + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-gray-800 truncate">{s.name}</p>
                          {s.category && (
                            <span className="text-xs bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full shrink-0">{s.category}</span>
                          )}
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${i === 0 ? 'gradient-brand' : 'bg-indigo-300'}`}
                            style={{ width: `${(s.revenue / maxSvcRevenue) * 100}%` }}
                          />
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-bold text-gray-800">R$ {s.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                        <p className="text-xs text-gray-400">{s.count}x realizado</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Team Tab ─── manage members ──────────────────────────────────── */}
        {activeTab === 'team' && orgId && orgSlug && (
          <>
            {/* Stats summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
                <p className="text-3xl font-extrabold gradient-text">{memberStats.length}</p>
                <p className="text-sm text-gray-500 mt-1">Profissionais ativos</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
                <p className="text-3xl font-extrabold gradient-text">{totalBookings}</p>
                <p className="text-sm text-gray-500 mt-1">Atendimentos totais</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
                <p className="text-3xl font-extrabold gradient-text">
                  R$ {totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-500 mt-1">Faturamento total</p>
              </div>
            </div>

            {/* Performance cards */}
            {memberStats.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-6">Desempenho por Profissional</h2>
                <div className="space-y-6">
                  {memberStats.map((m, i) => (
                    <div key={m.id} className="border border-gray-100 rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0 ${
                          i === 0 ? 'gradient-brand' : 'bg-gradient-to-br from-slate-500 to-slate-600'
                        }`}>
                          {m.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">{m.name}</p>
                          {i === 0 && <span className="text-xs text-amber-500 font-medium">🏆 Top performance</span>}
                        </div>
                        {m.cancelled > 0 && (
                          <span className="text-xs bg-red-50 text-red-400 px-2 py-0.5 rounded-full font-medium">
                            {m.cancelled} cancel.
                          </span>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="bg-indigo-50 rounded-xl p-3 text-center">
                          <p className="text-lg font-extrabold text-indigo-700">{m.bookings}</p>
                          <p className="text-xs text-indigo-400">atendimentos</p>
                        </div>
                        <div className="bg-emerald-50 rounded-xl p-3 text-center">
                          <p className="text-sm font-extrabold text-emerald-700">R$ {m.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p>
                          <p className="text-xs text-emerald-400">faturamento</p>
                        </div>
                        <div className="bg-violet-50 rounded-xl p-3 text-center">
                          <p className="text-sm font-extrabold text-violet-700">
                            R$ {m.bookings > 0 ? (m.revenue / m.bookings).toFixed(0) : '0'}
                          </p>
                          <p className="text-xs text-violet-400">ticket médio</p>
                        </div>
                      </div>
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Participação no faturamento</span>
                          <span>{totalRevenue > 0 ? ((m.revenue / totalRevenue) * 100).toFixed(0) : 0}%</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full gradient-brand rounded-full"
                            style={{ width: `${totalRevenue > 0 ? (m.revenue / totalRevenue) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Member management */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <ManageMembers organizationId={orgId} organizationSlug={orgSlug} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
