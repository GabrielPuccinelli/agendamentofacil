import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import Sidebar from '../components/Sidebar';
import type { SidebarProps } from '../components/Sidebar';

type Booking = {
  id: string;
  start_time: string;
  end_time: string;
  client_name: string;
  member_id: string;
  services: { name: string; price: number } | null;
};

type MemberStat = {
  id: string;
  name: string;
  bookings: number;
  revenue: number;
};

const StatCard = ({ label, value, sub, color }: { label: string; value: string; sub?: string; color: string }) => (
  <div className={`bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative overflow-hidden`}>
    <div className={`absolute top-0 left-0 w-1 h-full ${color} rounded-l-2xl`} />
    <p className="text-sm text-gray-500 font-medium">{label}</p>
    <p className="text-3xl font-extrabold text-gray-900 mt-1">{value}</p>
    {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
  </div>
);

const BarRow = ({ name, value, max, revenue }: { name: string; value: number; max: number; revenue: number }) => (
  <div className="flex items-center gap-3">
    <div className="w-28 text-sm text-gray-600 truncate shrink-0">{name}</div>
    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
      <div
        className="h-full gradient-brand rounded-full transition-all duration-700"
        style={{ width: max > 0 ? `${(value / max) * 100}%` : '0%' }}
      />
    </div>
    <div className="text-sm text-gray-700 font-semibold w-8 text-right">{value}</div>
    <div className="text-xs text-gray-400 w-24 text-right">R$ {revenue.toFixed(2)}</div>
  </div>
);

export default function CompanyDashboardPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [sidebarProps, setSidebarProps] = useState<Omit<SidebarProps, 'onLogout'> | null>(null);

  const [orgName, setOrgName] = useState('');
  const [totalBookings, setTotalBookings] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [monthBookings, setMonthBookings] = useState(0);
  const [monthRevenue, setMonthRevenue] = useState(0);
  const [memberStats, setMemberStats] = useState<MemberStat[]>([]);
  const [recentBookings, setRecentBookings] = useState<Booking[]>([]);
  const [membersMap, setMembersMap] = useState<Record<string, string>>({});

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

      // Buscar todos os agendamentos da organização
      const memberIds = allMembers?.map((m) => m.id) || [];

      const { data: bookings } = await supabase
        .from('bookings')
        .select('id, start_time, end_time, client_name, member_id, services(name, price)')
        .in('member_id', memberIds)
        .order('start_time', { ascending: false });

      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      let tBookings = 0, tRevenue = 0, mBookings = 0, mRevenue = 0;
      const statMap: Record<string, MemberStat> = {};

      allMembers?.forEach((m) => {
        statMap[m.id] = { id: m.id, name: m.name, bookings: 0, revenue: 0 };
      });

      (bookings || []).forEach((b: any) => {
        const price = b.services?.price || 0;
        tBookings++;
        tRevenue += price;
        if (b.start_time >= startOfMonth) { mBookings++; mRevenue += price; }
        if (statMap[b.member_id]) {
          statMap[b.member_id].bookings++;
          statMap[b.member_id].revenue += price;
        }
      });

      setTotalBookings(tBookings);
      setTotalRevenue(tRevenue);
      setMonthBookings(mBookings);
      setMonthRevenue(mRevenue);
      setMemberStats(Object.values(statMap).sort((a, b) => b.bookings - a.bookings));
      setRecentBookings((bookings || []).slice(0, 10) as Booking[]);
      setOrgName(org?.name || '');

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

  const maxBookings = Math.max(...memberStats.map((m) => m.bookings), 1);

  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar {...sidebarProps} onLogout={handleLogout} />

      <main className="flex-1 p-6 md:p-8 overflow-auto min-w-0">
        {/* Header */}
        <div className="gradient-brand rounded-2xl p-6 mb-8 text-white shadow-lg shadow-indigo-500/20 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
          <div className="relative z-10 flex items-start justify-between gap-4">
            <div>
              <p className="text-indigo-200 text-sm font-medium">Painel da Empresa</p>
              <h1 className="text-2xl md:text-3xl font-bold mt-0.5">{orgName}</h1>
              <p className="text-indigo-200 text-sm mt-1">Visão geral de agendamentos e faturamento</p>
            </div>
            <Link
              to="/dashboard"
              className="shrink-0 flex items-center gap-2 bg-white/15 hover:bg-white/25 border border-white/20 text-white text-sm font-medium px-4 py-2 rounded-xl transition-all"
            >
              ← Meu Dashboard
            </Link>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard label="Agendamentos este mês" value={String(monthBookings)} sub="mês corrente" color="bg-indigo-500" />
          <StatCard label="Faturamento este mês" value={`R$ ${monthRevenue.toFixed(2)}`} sub="mês corrente" color="bg-violet-500" />
          <StatCard label="Total de agendamentos" value={String(totalBookings)} sub="histórico completo" color="bg-cyan-500" />
          <StatCard label="Faturamento total" value={`R$ ${totalRevenue.toFixed(2)}`} sub="histórico completo" color="bg-emerald-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Por profissional */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Agendamentos por Profissional
            </h2>
            {memberStats.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Nenhum dado ainda.</p>
            ) : (
              <div className="space-y-4">
                {memberStats.map((m) => (
                  <BarRow key={m.id} name={m.name} value={m.bookings} max={maxBookings} revenue={m.revenue} />
                ))}
              </div>
            )}
          </div>

          {/* Agendamentos recentes */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-5 flex items-center gap-2">
              <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Agendamentos Recentes
            </h2>
            {recentBookings.length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Nenhum agendamento ainda.</p>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((b) => (
                  <div key={b.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                    <div className="w-9 h-9 rounded-xl gradient-brand flex items-center justify-center text-white text-sm font-bold shrink-0">
                      {b.client_name.charAt(0).toUpperCase()}
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
                      <p className="text-xs text-emerald-600 font-medium">
                        R$ {(b.services?.price || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
