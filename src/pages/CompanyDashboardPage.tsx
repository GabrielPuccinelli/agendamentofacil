import { useEffect, useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import AppShell from '../components/AppShell';
import type { SidebarProps } from '../components/Sidebar';
import ManageServices from '../components/ManageServices';
import ManageMembers from '../components/ManageMembers';
import { AppLoading } from '../components/LoadingScreen';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from 'recharts';

const METHOD_COLORS: Record<string, string> = { Pix: '#6366f1', Dinheiro: '#10b981', 'Débito': '#f59e0b', 'Crédito': '#7c3aed', Outro: '#94a3b8' };
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ConfirmButton } from '../components/ConfirmButton';
import { StickyNote, Loader2, UserPlus, FileText, FileSpreadsheet, Eye, EyeOff, AlertTriangle, Pencil } from 'lucide-react';
import { exportReportCsv, exportReportPdf, downloadCsv, type FinancialReport, type ReportRow } from '../lib/exportReport';

const statusPt = (s: string) => s === 'cancelled' ? 'Cancelado' : s === 'completed' ? 'Realizado' : s === 'pending' ? 'Pendente' : 'Confirmado';

type Booking = {
  id: string;
  start_time: string;
  end_time: string;
  client_name: string;
  client_phone: string | null;
  member_id: string;
  service_id: string | null;
  status: string;
  paid: boolean;
  payment_method: string | null;
  amount: number | null;
  quantity: number;
  services: { name: string; price: number; category?: string; is_product?: boolean } | null;
};

const PAYMENT_METHODS = ['Pix', 'Dinheiro', 'Débito', 'Crédito'];

type ClientStat = {
  name: string;
  phone: string;
  visits: number;
  lastVisit: string;
  revenue: number;
  favoriteMember: string;
};

type MemberStat = { id: string; name: string; bookings: number; revenue: number; cancelled: number; commissionPercent: number };
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
    : location.pathname.endsWith('/clients')
    ? 'clients'
    : location.pathname.endsWith('/bookings')
    ? 'bookings'
    : location.pathname.endsWith('/sales')
    ? 'sales'
    : 'overview';
  const [activeTab, setActiveTab] = useState<'overview' | 'team' | 'services' | 'clients' | 'bookings' | 'sales'>(initialTab);
  const [clientSearch, setClientSearch] = useState('');
  const [period, setPeriod] = useState<'today' | 'week' | 'month' | 'all'>('month');
  const [hideMoney, setHideMoney] = useState(() => localStorage.getItem('hide_money') === '1');
  const mask = (v: string) => (hideMoney ? '••••' : v);
  const toggleMoney = () => setHideMoney((h) => { localStorage.setItem('hide_money', !h ? '1' : '0'); return !h; });
  const [noteClient, setNoteClient] = useState<{ name: string; phone: string } | null>(null);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [notedPhones, setNotedPhones] = useState<Set<string>>(new Set());
  // Cadastro de clientes (tabela clients)
  const [registeredClients, setRegisteredClients] = useState<{ name: string; phone: string; email: string | null; notes: string | null }[]>([]);
  const [saleEdit, setSaleEdit] = useState<{ id: string; serviceId: string | null; name: string; unit: number; qty: number; oldQty: number; method: string } | null>(null);
  const [saleSaving, setSaleSaving] = useState(false);
  const [products, setProducts] = useState<{ id: string; name: string; stock: number | null; low_stock_threshold: number }[]>([]);
  const [expenses, setExpenses] = useState<{ id: string; description: string; category: string | null; amount: number; spent_at: string }[]>([]);
  const [expDesc, setExpDesc] = useState('');
  const [expAmount, setExpAmount] = useState('');
  const [expCategory, setExpCategory] = useState('');
  const [expSaving, setExpSaving] = useState(false);
  // Filtros da aba Agendamentos
  const [bkSearch, setBkSearch] = useState('');
  const [bkStatus, setBkStatus] = useState('all');
  const [bkMember, setBkMember] = useState('all');
  const [bkEdit, setBkEdit] = useState<{ id: string; memberId: string; serviceId: string; date: string; time: string; services: { id: string; name: string; duration: number }[] } | null>(null);
  const [bkEditSaving, setBkEditSaving] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [detailClient, setDetailClient] = useState<ClientStat | null>(null);
  const [detailEdit, setDetailEdit] = useState({ name: '', phone: '', email: '' });
  const [detailSaving, setDetailSaving] = useState(false);
  const [newClientOpen, setNewClientOpen] = useState(false);
  const [ncName, setNcName] = useState('');
  const [ncPhone, setNcPhone] = useState('');
  const [ncEmail, setNcEmail] = useState('');
  const [ncSaving, setNcSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); return; }

      const { data: member } = await supabase
        .from('members')
        .select('id, name, role, organization_id, phone, avatar_url')
        .eq('user_id', session.user.id)
        .order('organization_id', { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (!member || member.role !== 'admin') { navigate('/dashboard'); return; }

      const { data: org } = await supabase
        .from('organizations')
        .select('id, name, slug')
        .eq('id', member.organization_id)
        .single();

      const { data: allMembers } = await supabase
        .from('members')
        .select('id, name, slug, commission_percent')
        .eq('organization_id', member.organization_id);

      const memberMap: Record<string, string> = {};
      allMembers?.forEach((m) => { memberMap[m.id] = m.name; });
      setMembersMap(memberMap);

      const memberIds = allMembers?.map((m) => m.id) || [];

      const { data: rawBookings } = await supabase
        .from('bookings')
        .select('id, start_time, end_time, client_name, client_phone, member_id, service_id, status, paid, payment_method, amount, quantity, services(name, price, category, is_product)')
        .in('member_id', memberIds)
        .order('start_time', { ascending: false });

      const bks = (rawBookings || []) as unknown as Booking[];
      setBookings(bks);

      // Compute stats
      const now = new Date();

      const statMap: Record<string, MemberStat> = {};
      allMembers?.forEach((m: any) => { statMap[m.id] = { id: m.id, name: m.name, bookings: 0, revenue: 0, cancelled: 0, commissionPercent: m.commission_percent || 0 }; });

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
        const price = b.amount ?? (b.services?.price || 0);
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

  const markBookingPaid = async (id: string, method: string) => {
    const { error } = await supabase
      .from('bookings')
      .update({ paid: true, payment_method: method, paid_at: new Date().toISOString(), status: 'completed' })
      .eq('id', id);
    if (error) { toast.error('Não foi possível registrar o pagamento.'); return; }
    setBookings((prev) => prev.map((b) => b.id === id ? { ...b, paid: true, payment_method: method, status: 'completed' } : b));
    toast.success(`Pagamento registrado (${method}).`);
  };

  const exportBookingsCsv = () => {
    const header = ['Data', 'Hora', 'Cliente', 'Telefone', 'Profissional', 'Serviço', 'Status', 'Pago', 'Forma', 'Valor'];
    const rows = filteredBookings.map((b: any) => [
      new Date(b.start_time).toLocaleDateString('pt-BR'),
      new Date(b.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      b.client_name, b.client_phone || '', membersMap[b.member_id] || '', b.services?.name || '',
      statusPt(b.status), b.paid ? 'Sim' : 'Não', b.payment_method || '',
      (b.amount ?? b.services?.price ?? 0).toFixed(2).replace('.', ','),
    ]);
    downloadCsv('agendamentos', header, rows);
  };

  const exportSalesCsv = () => {
    const header = ['Data', 'Produto', 'Quantidade', 'Vendedor', 'Forma', 'Total'];
    const rows = productSales.map((b: any) => [
      new Date(b.start_time).toLocaleDateString('pt-BR'),
      b.services?.name || '', String(b.quantity), membersMap[b.member_id] || '',
      b.payment_method || '', (b.amount ?? 0).toFixed(2).replace('.', ','),
    ]);
    downloadCsv('vendas-produtos', header, rows);
  };

  const openSaleEdit = (b: any) => {
    const unit = b.quantity > 0 ? (b.amount ?? (b.services?.price || 0)) / b.quantity : (b.services?.price || 0);
    setSaleEdit({ id: b.id, serviceId: b.service_id, name: b.services?.name || 'Produto', unit, qty: b.quantity || 1, oldQty: b.quantity || 1, method: b.payment_method || 'Dinheiro' });
  };

  const saveSaleEdit = async () => {
    if (!saleEdit) return;
    setSaleSaving(true);
    const newQty = Math.max(1, saleEdit.qty);
    const { error } = await supabase.from('bookings')
      .update({ quantity: newQty, amount: saleEdit.unit * newQty, payment_method: saleEdit.method, paid: true })
      .eq('id', saleEdit.id);
    if (error) { setSaleSaving(false); toast.error('Não foi possível salvar.'); return; }
    // Ajusta o estoque pela diferença (positivo reduz, negativo repõe)
    const delta = newQty - saleEdit.oldQty;
    if (delta !== 0 && saleEdit.serviceId) await supabase.rpc('decrement_stock', { p_service_id: saleEdit.serviceId, p_qty: delta });
    setBookings((prev) => prev.map((b) => b.id === saleEdit.id ? { ...b, quantity: newQty, amount: saleEdit.unit * newQty, payment_method: saleEdit.method, paid: true } : b));
    setSaleSaving(false); setSaleEdit(null);
    loadProducts();
    toast.success('Venda atualizada!');
  };

  const deleteSale = async (b: any) => {
    const { error } = await supabase.from('bookings').delete().eq('id', b.id);
    if (error) { toast.error('Não foi possível excluir a venda.'); return; }
    if (b.service_id) await supabase.rpc('decrement_stock', { p_service_id: b.service_id, p_qty: -(b.quantity || 1) });
    setBookings((prev) => prev.filter((x) => x.id !== b.id));
    setSaleEdit(null);
    loadProducts();
    toast.success('Venda excluída e estoque reposto.');
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    const { error } = await supabase.from('bookings').update({ status: 'cancelled', paid: false, payment_method: null, paid_at: null, cancel_reason: cancelReason.trim() || null }).eq('id', cancelTarget);
    if (error) { toast.error('Não foi possível cancelar.'); return; }
    setBookings((prev) => prev.map((b) => b.id === cancelTarget ? { ...b, status: 'cancelled', paid: false, payment_method: null } : b));
    setCancelTarget(null); setCancelReason('');
    toast.success('Agendamento cancelado.');
  };

  const openBkEdit = async (b: any) => {
    const { data } = await supabase.from('member_services').select('services(id, name, duration)').eq('member_id', b.member_id);
    const services = (data || []).map((r: any) => r.services).filter((s: any) => s && !s.is_product) as { id: string; name: string; duration: number }[];
    const d = new Date(b.start_time);
    const pad = (n: number) => String(n).padStart(2, '0');
    setBkEdit({
      id: b.id, memberId: b.member_id, serviceId: b.service_id || (services[0]?.id || ''),
      date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
      time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
      services,
    });
  };

  const saveBkEdit = async () => {
    if (!bkEdit) return;
    const svc = bkEdit.services.find((s) => s.id === bkEdit.serviceId);
    if (!svc || !bkEdit.date || !bkEdit.time) { toast.error('Preencha serviço, data e horário.'); return; }
    setBkEditSaving(true);
    const start = new Date(`${bkEdit.date}T${bkEdit.time}:00`);
    const end = new Date(start.getTime() + (svc.duration || 30) * 60000);
    const { error } = await supabase.from('bookings').update({ service_id: svc.id, start_time: start.toISOString(), end_time: end.toISOString() }).eq('id', bkEdit.id);
    setBkEditSaving(false);
    if (error) {
      toast.error(error.code === '23P01' ? 'Conflito de horário com outro agendamento.' : 'Não foi possível salvar.');
      return;
    }
    setBookings((prev) => prev.map((b) => b.id === bkEdit.id ? { ...b, service_id: svc.id, start_time: start.toISOString(), end_time: end.toISOString(), services: { ...(b.services || {}), name: svc.name } as any } : b));
    setBkEdit(null);
    toast.success('Agendamento atualizado!');
  };

  // Carrega o cadastro de clientes (nome, telefone, e-mail, notas)
  const loadClients = () => {
    if (!orgId) return;
    supabase.from('clients').select('name, phone, email, notes').eq('organization_id', orgId)
      .then(({ data }) => {
        const rows = data || [];
        setRegisteredClients(rows);
        setNotedPhones(new Set(rows.filter((c) => c.notes).map((c) => (c.phone || '').replace(/\D/g, ''))));
      });
  };
  useEffect(loadClients, [orgId]);

  const loadProducts = () => {
    if (!orgId) return;
    supabase.from('services').select('id, name, stock, low_stock_threshold').eq('organization_id', orgId).eq('is_product', true).order('name')
      .then(({ data }) => setProducts((data || []) as any));
  };
  useEffect(loadProducts, [orgId]);

  const updateStock = async (id: string, stock: number | null) => {
    setProducts((prev) => prev.map((p) => p.id === id ? { ...p, stock } : p));
    const { error } = await supabase.from('services').update({ stock }).eq('id', id);
    if (error) toast.error('Não foi possível salvar o estoque.');
  };

  const lowStock = products.filter((p) => p.stock != null && p.stock <= p.low_stock_threshold);

  const loadExpenses = () => {
    if (!orgId) return;
    supabase.from('expenses').select('id, description, category, amount, spent_at').eq('organization_id', orgId).order('spent_at', { ascending: false })
      .then(({ data }) => setExpenses((data || []) as any));
  };
  useEffect(loadExpenses, [orgId]);

  const addExpense = async () => {
    const amt = parseFloat(expAmount);
    if (!expDesc.trim() || !(amt > 0)) { toast.error('Informe descrição e valor.'); return; }
    setExpSaving(true);
    const { error } = await supabase.from('expenses').insert({ organization_id: orgId, description: expDesc.trim(), category: expCategory.trim() || null, amount: amt });
    setExpSaving(false);
    if (error) { toast.error('Não foi possível salvar a despesa.'); return; }
    setExpDesc(''); setExpAmount(''); setExpCategory('');
    loadExpenses();
    toast.success('Despesa lançada!');
  };

  const deleteExpense = async (id: string) => {
    const { error } = await supabase.from('expenses').delete().eq('id', id);
    if (error) { toast.error('Não foi possível excluir.'); return; }
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const openNote = async (name: string, phone: string) => {
    const digits = phone.replace(/\D/g, '');
    setNoteClient({ name, phone: digits });
    const existing = registeredClients.find((c) => (c.phone || '').replace(/\D/g, '') === digits);
    setNoteText(existing?.notes || '');
  };

  const saveNote = async () => {
    if (!noteClient) return;
    setNoteSaving(true);
    // Upsert no cadastro de clientes (cria o cliente se ainda não existir)
    const { error } = await supabase.from('clients').upsert({
      organization_id: orgId,
      name: noteClient.name,
      phone: noteClient.phone,
      notes: noteText.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,phone' });
    setNoteSaving(false);
    if (error) { toast.error('Não foi possível salvar a anotação.'); return; }
    setNotedPhones((prev) => {
      const next = new Set(prev);
      if (noteText.trim()) next.add(noteClient.phone); else next.delete(noteClient.phone);
      return next;
    });
    setNoteClient(null);
    loadClients();
    toast.success('Anotação salva!');
  };

  const openClientDetail = (c: ClientStat) => {
    setDetailClient(c);
    const reg = registeredClients.find((r) => (r.phone || '').replace(/\D/g, '') === (c.phone || '').replace(/\D/g, ''));
    setDetailEdit({ name: c.name, phone: c.phone || '', email: reg?.email || '' });
  };

  const saveClientEdit = async () => {
    if (!detailClient || detailEdit.name.trim().length < 2) { toast.error('Informe o nome.'); return; }
    setDetailSaving(true);
    const { error } = await supabase.from('clients').upsert({
      organization_id: orgId,
      name: detailEdit.name.trim(),
      phone: detailEdit.phone.trim() || null,
      email: detailEdit.email.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,phone' });
    setDetailSaving(false);
    if (error) { toast.error('Não foi possível salvar.'); return; }
    setDetailClient(null);
    loadClients();
    toast.success('Cliente atualizado!');
  };

  const saveNewClient = async () => {
    if (ncName.trim().length < 2) { toast.error('Informe o nome.'); return; }
    setNcSaving(true);
    const { error } = await supabase.from('clients').upsert({
      organization_id: orgId,
      name: ncName.trim(),
      phone: ncPhone.trim() || null,
      email: ncEmail.trim() || null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'organization_id,phone' });
    setNcSaving(false);
    if (error) { toast.error('Não foi possível cadastrar o cliente.'); return; }
    setNewClientOpen(false); setNcName(''); setNcPhone(''); setNcEmail('');
    loadClients();
    toast.success('Cliente cadastrado!');
  };

  if (loading || !sidebarProps) return <AppLoading />;

  // Derived metrics
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59).toISOString();

  let totalBookings = 0, totalRevenue = 0, monthBookings = 0, monthRevenue = 0;
  let cancelledTotal = 0, prevMonthBookings = 0, prevMonthRevenue = 0, monthReceived = 0;

  bookings.forEach((b: any) => {
    const price = b.amount ?? (b.services?.price || 0);
    const isCancelled = b.status === 'cancelled';
    if (isCancelled) { cancelledTotal++; return; }
    totalBookings++; totalRevenue += price;
    if (b.start_time >= startOfMonth) {
      monthBookings++; monthRevenue += price;
      if (b.paid) monthReceived += price;
    }
    if (b.start_time >= prevMonthStart && b.start_time <= prevMonthEnd) { prevMonthBookings++; prevMonthRevenue += price; }
  });

  // Quebra por forma de pagamento (mês) + a receber
  const methodTotals: Record<string, number> = {};
  PAYMENT_METHODS.forEach((m) => { methodTotals[m] = 0; });
  bookings.forEach((b: any) => {
    if (b.status === 'cancelled' || !b.paid || b.start_time < startOfMonth) return;
    const m = b.payment_method || 'Outro';
    methodTotals[m] = (methodTotals[m] || 0) + (b.amount ?? (b.services?.price || 0));
  });
  const monthToReceive = Math.max(monthRevenue - monthReceived, 0);

  // ── Relatório por período (Hoje/Semana/Mês/Tudo) ────────────────────────────
  const periodStart = (() => {
    const d = new Date(now);
    if (period === 'today') { d.setHours(0, 0, 0, 0); return d; }
    if (period === 'week') { d.setDate(d.getDate() - 6); d.setHours(0, 0, 0, 0); return d; }
    if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
    return new Date(0);
  })();
  const periodLabel = period === 'today' ? 'Hoje'
    : period === 'week' ? 'Últimos 7 dias'
    : period === 'month' ? now.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : 'Todo o período';
  const commissionByMember: Record<string, number> = {};
  memberStats.forEach((m) => { commissionByMember[m.id] = m.commissionPercent; });

  const reportMemberMap: Record<string, ReportRow> = {};
  const reportMethod: Record<string, number> = {};
  PAYMENT_METHODS.forEach((m) => { reportMethod[m] = 0; });
  let repCount = 0, repRevenue = 0, repReceived = 0;
  bookings.forEach((b: any) => {
    if (b.status === 'cancelled' || new Date(b.start_time) < periodStart) return;
    const price = b.amount ?? (b.services?.price || 0);
    repCount++; repRevenue += price;
    const name = membersMap[b.member_id] || '—';
    const row = reportMemberMap[b.member_id] || (reportMemberMap[b.member_id] = { name, count: 0, revenue: 0, received: 0, commission: 0 });
    row.count++; row.revenue += price;
    if (b.paid) {
      repReceived += price; row.received += price;
      const m = b.payment_method || 'Outro';
      reportMethod[m] = (reportMethod[m] || 0) + price;
    }
  });
  Object.entries(reportMemberMap).forEach(([id, row]) => { row.commission = row.revenue * (commissionByMember[id] || 0) / 100; });
  const report: FinancialReport = {
    orgName,
    periodLabel,
    totals: { count: repCount, revenue: repRevenue, received: repReceived, toReceive: Math.max(repRevenue - repReceived, 0) },
    perMember: Object.values(reportMemberMap).sort((a, b) => b.revenue - a.revenue),
    perMethod: PAYMENT_METHODS.map((m) => ({ method: m, value: reportMethod[m] || 0 })),
  };

  // Atendimentos do período (exclui vendas de produto), mais recentes primeiro
  const periodBookings = bookings
    .filter((b) => new Date(b.start_time) >= periodStart && !b.services?.is_product)
    .sort((a, b) => b.start_time.localeCompare(a.start_time));
  const filteredBookings = periodBookings.filter((b) => {
    if (bkStatus !== 'all' && b.status !== bkStatus) return false;
    if (bkMember !== 'all' && b.member_id !== bkMember) return false;
    if (bkSearch) {
      const q = bkSearch.toLowerCase();
      if (!(b.client_name?.toLowerCase().includes(q) || (b.services?.name || '').toLowerCase().includes(q) || (b.client_phone || '').includes(q))) return false;
    }
    return true;
  });

  // Despesas e lucro do período
  const periodExpenses = expenses.filter((e) => new Date(e.spent_at + 'T12:00:00') >= periodStart);
  const expensesTotal = periodExpenses.reduce((a, e) => a + Number(e.amount), 0);
  const profit = report.totals.received - expensesTotal;

  // Comparativo com o período anterior equivalente
  const prevRange: [Date, Date] | null = (() => {
    if (period === 'today') { const s = new Date(periodStart); s.setDate(s.getDate() - 1); return [s, new Date(periodStart)]; }
    if (period === 'week') { const s = new Date(periodStart); s.setDate(s.getDate() - 7); return [s, new Date(periodStart)]; }
    if (period === 'month') { return [new Date(now.getFullYear(), now.getMonth() - 1, 1), new Date(now.getFullYear(), now.getMonth(), 1)]; }
    return null;
  })();
  let prevRevenue = 0, prevReceived = 0, prevCount = 0;
  if (prevRange) bookings.forEach((b: any) => {
    if (b.status === 'cancelled') return;
    const t = new Date(b.start_time);
    if (t >= prevRange[0] && t < prevRange[1]) {
      const p = b.amount ?? (b.services?.price || 0);
      prevCount++; prevRevenue += p; if (b.paid) prevReceived += p;
    }
  });
  const pct = (cur: number, prev: number) => prev > 0 ? ((cur - prev) / prev) * 100 : (cur > 0 ? 100 : 0);

  // Relatório por serviço (exclui produtos e cancelados) no período
  const serviceMap: Record<string, { name: string; count: number; revenue: number }> = {};
  bookings.forEach((b: any) => {
    if (b.status === 'cancelled' || b.services?.is_product || new Date(b.start_time) < periodStart) return;
    const name = b.services?.name || '—';
    const p = b.amount ?? (b.services?.price || 0);
    const r = serviceMap[name] || (serviceMap[name] = { name, count: 0, revenue: 0 });
    r.count++; r.revenue += p;
  });
  const topServices = Object.values(serviceMap).sort((a, b) => b.revenue - a.revenue);
  const maxServiceRev = Math.max(...topServices.map((s) => s.revenue), 1);

  // ── Vendas de produto do período ────────────────────────────────────────────
  const productSales = bookings
    .filter((b) => b.services?.is_product && b.status !== 'cancelled' && new Date(b.start_time) >= periodStart)
    .sort((a, b) => b.start_time.localeCompare(a.start_time));
  const salesTotal = productSales.reduce((a, b) => a + (b.amount ?? (b.services?.price || 0)), 0);
  const salesUnits = productSales.reduce((a, b) => a + (b.quantity || 1), 0);
  const salesByProduct: Record<string, { name: string; units: number; total: number }> = {};
  const salesByMethod: Record<string, number> = {};
  PAYMENT_METHODS.forEach((m) => { salesByMethod[m] = 0; });
  productSales.forEach((b) => {
    const name = b.services?.name || 'Produto';
    const total = b.amount ?? (b.services?.price || 0);
    const row = salesByProduct[name] || (salesByProduct[name] = { name, units: 0, total: 0 });
    row.units += b.quantity || 1; row.total += total;
    if (b.paid) { const m = b.payment_method || 'Outro'; salesByMethod[m] = (salesByMethod[m] || 0) + total; }
  });
  const topProducts = Object.values(salesByProduct).sort((a, b) => b.total - a.total);

  const avgTicket = totalBookings > 0 ? totalRevenue / totalBookings : 0;
  const cancellationRate = bookings.length > 0 ? ((cancelledTotal / bookings.length) * 100).toFixed(0) : '0';

  const maxSvcRevenue = Math.max(...serviceStats.map((s) => s.revenue), 1);

  const recentBookings = bookings.slice(0, 8);

  const today = now.toISOString().slice(0, 10);
  const todayBookings = bookings.filter((b) => b.start_time.startsWith(today) && b.status !== 'cancelled');

  // Busiest day of week
  const dayCount = [0, 0, 0, 0, 0, 0, 0];
  bookings.forEach((b) => { if (b.status !== 'cancelled') dayCount[new Date(b.start_time).getDay()]++; });
  const dayLabels = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const maxDay = Math.max(...dayCount, 1);

  // ── Clientes (CRM leve, agregado por telefone) ──────────────────────────────
  const clientMap: Record<string, ClientStat & { memberCount: Record<string, number> }> = {};
  bookings.forEach((b) => {
    if (b.status === 'cancelled') return;
    const key = (b.client_phone || b.client_name || '').replace(/\D/g, '') || b.client_name;
    if (!key) return;
    if (!clientMap[key]) {
      clientMap[key] = {
        name: b.client_name, phone: b.client_phone || '', visits: 0, lastVisit: b.start_time,
        revenue: 0, favoriteMember: '', memberCount: {},
      };
    }
    const c = clientMap[key];
    c.visits++;
    c.revenue += b.amount ?? (b.services?.price || 0);
    if (b.start_time > c.lastVisit) { c.lastVisit = b.start_time; c.name = b.client_name; }
    c.memberCount[b.member_id] = (c.memberCount[b.member_id] || 0) + 1;
  });
  // Inclui clientes cadastrados que ainda não têm agendamento (visitas = 0)
  registeredClients.forEach((rc) => {
    const key = (rc.phone || '').replace(/\D/g, '') || rc.name;
    if (!key || clientMap[key]) return;
    clientMap[key] = { name: rc.name, phone: rc.phone || '', visits: 0, lastVisit: '', revenue: 0, favoriteMember: '', memberCount: {} };
  });
  const clientStats: ClientStat[] = Object.values(clientMap)
    .map((c) => ({
      ...c,
      favoriteMember: membersMap[
        Object.entries(c.memberCount).sort((a, b) => b[1] - a[1])[0]?.[0] || ''
      ] || '—',
    }))
    .sort((a, b) => b.visits - a.visits || (b.lastVisit || '').localeCompare(a.lastVisit || ''));
  const recurringClients = clientStats.filter((c) => c.visits > 1).length;
  const q = clientSearch.trim().toLowerCase();
  const filteredClients = q
    ? clientStats.filter((c) => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q))
    : clientStats;

  const exportClientsCsv = () => {
    const header = ['Nome', 'Telefone', 'Visitas', 'Ultima visita', 'Profissional frequente', 'Total gasto'];
    const rows = clientStats.map((c) => [
      c.name,
      c.phone,
      String(c.visits),
      c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('pt-BR') : '',
      c.favoriteMember,
      c.revenue.toFixed(2).replace('.', ','),
    ]);
    const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map((r) => r.map(escape).join(';')).join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `clientes-${orgSlug || 'empresa'}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const newClientsThisMonth = clientStats.filter((c) =>
    !bookings.some((b) =>
      b.status !== 'cancelled'
      && ((b.client_phone || b.client_name || '').replace(/\D/g, '') || b.client_name) === ((c.phone || c.name).replace(/\D/g, '') || c.name)
      && b.start_time < startOfMonth,
    ),
  ).length;

  const bookingTrend = prevMonthBookings > 0
    ? `${monthBookings > prevMonthBookings ? '+' : ''}${(((monthBookings - prevMonthBookings) / prevMonthBookings) * 100).toFixed(0)}%`
    : null;

  return (
    <AppShell {...sidebarProps} onLogout={handleLogout}>
      <div className="min-w-0">
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
                  href={`/${orgSlug}`}
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
          {(['overview', 'bookings', 'sales', 'clients', 'team', 'services'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeTab === tab
                  ? 'gradient-brand text-white shadow-md shadow-indigo-500/20'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
              }`}
            >
              {tab === 'overview' ? '📊 Visão Geral' : tab === 'bookings' ? '📋 Agendamentos' : tab === 'sales' ? '🛍️ Produtos' : tab === 'clients' ? '🤝 Clientes' : tab === 'team' ? '👥 Equipe' : '✂️ Serviços'}
            </button>
          ))}
        </div>

        {/* ── Overview Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'overview' && (
          <>
            {/* Barra de visibilidade */}
            <div className="flex justify-end mb-3">
              <button
                onClick={toggleMoney}
                className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 bg-white border border-gray-200 rounded-xl px-3 py-1.5 transition-all"
              >
                {hideMoney ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {hideMoney ? 'Mostrar valores' : 'Ocultar valores'}
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <KpiCard
                label="Agendamentos (mês)"
                value={mask(String(monthBookings))}
                sub="confirmados"
                color="bg-indigo-50"
                trend={!hideMoney && bookingTrend ? { value: bookingTrend, up: monthBookings >= prevMonthBookings } : undefined}
                icon={
                  <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
              <KpiCard
                label="Faturamento (mês)"
                value={mask(`R$ ${monthRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}
                sub={hideMoney ? '••••' : `R$ ${monthReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} recebido`}
                color="bg-emerald-50"
                icon={
                  <svg className="w-6 h-6 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
              <KpiCard
                label="Ticket Médio"
                value={mask(`R$ ${avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}
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
                value={mask(`${cancellationRate}%`)}
                sub={`${cancelledTotal} cancelado(s)`}
                color="bg-rose-50"
                icon={
                  <svg className="w-6 h-6 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>

            {/* Controle financeiro do mês */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Controle financeiro</h2>
                  <p className="text-xs text-gray-400">Recebido por forma de pagamento · {now.toLocaleDateString('pt-BR', { month: 'long' })}</p>
                </div>
                <div className="flex gap-4">
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-emerald-600">{mask(`R$ ${monthReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}</p>
                    <p className="text-[11px] text-gray-400">recebido</p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-extrabold text-amber-500">{mask(`R$ ${monthToReceive.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}</p>
                    <p className="text-[11px] text-gray-400">a receber</p>
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 gap-4 items-center">
                <div className="grid grid-cols-2 gap-3">
                  {PAYMENT_METHODS.map((m) => (
                    <div key={m} className="bg-gray-50 rounded-xl p-3 flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: METHOD_COLORS[m] }} />
                      <div>
                        <p className="text-sm font-extrabold text-gray-800">{mask(`R$ ${(methodTotals[m] || 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`)}</p>
                        <p className="text-xs text-gray-400">{m}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {!hideMoney && PAYMENT_METHODS.some((m) => (methodTotals[m] || 0) > 0) ? (
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie
                        data={PAYMENT_METHODS.filter((m) => (methodTotals[m] || 0) > 0).map((m) => ({ name: m, value: methodTotals[m] }))}
                        dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}
                      >
                        {PAYMENT_METHODS.filter((m) => (methodTotals[m] || 0) > 0).map((m) => <Cell key={m} fill={METHOD_COLORS[m]} />)}
                      </Pie>
                      <Tooltip formatter={(v: any) => `R$ ${Number(v).toLocaleString('pt-BR')}`} contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 12 }} />
                      <Legend iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[180px] text-gray-300 text-sm">{hideMoney ? 'Valores ocultos' : 'Sem recebimentos ainda'}</div>
                )}
              </div>
            </div>

            {/* Despesas e Lucro */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Despesas e lucro</h2>
                  <p className="text-xs text-gray-400">Lance as saídas para ver o lucro real · {periodLabel}</p>
                </div>
                <div className="flex gap-3">
                  <div className="text-right"><p className="text-lg font-extrabold text-rose-500">{mask(`R$ ${expensesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}</p><p className="text-[11px] text-gray-400">despesas</p></div>
                  <div className="text-right"><p className={`text-lg font-extrabold ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{mask(`R$ ${profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`)}</p><p className="text-[11px] text-gray-400">lucro (recebido − despesas)</p></div>
                </div>
              </div>
              {/* Adicionar despesa */}
              <div className="flex items-end gap-2 flex-wrap mb-4">
                <input type="text" value={expDesc} onChange={(e) => setExpDesc(e.target.value)} placeholder="Descrição (ex.: aluguel)" className="flex-1 min-w-[140px] px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="text" value={expCategory} onChange={(e) => setExpCategory(e.target.value)} placeholder="Categoria" className="w-28 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <input type="number" min={0} step="0.01" value={expAmount} onChange={(e) => setExpAmount(e.target.value)} placeholder="R$" className="w-24 px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <Button onClick={addExpense} disabled={expSaving} className="gradient-brand">{expSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lançar'}</Button>
              </div>
              {periodExpenses.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-2">Nenhuma despesa no período.</p>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {periodExpenses.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 text-sm border-b border-gray-50 last:border-0 py-1.5">
                      <span className="text-gray-400 text-xs w-16 shrink-0">{new Date(e.spent_at + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                      <span className="flex-1 text-gray-700 truncate">{e.description}{e.category && <span className="text-gray-400"> · {e.category}</span>}</span>
                      <span className="font-semibold text-rose-500">R$ {Number(e.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <button onClick={() => deleteExpense(e.id)} className="text-gray-300 hover:text-red-500 text-xs px-1">✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Relatório por período */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Relatório financeiro</h2>
                  <p className="text-xs text-gray-400">Por profissional e forma de pagamento · {periodLabel}</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex bg-gray-100 rounded-xl p-1">
                    {([['today', 'Hoje'], ['week', 'Semana'], ['month', 'Mês'], ['all', 'Tudo']] as const).map(([v, label]) => (
                      <button
                        key={v}
                        onClick={() => setPeriod(v)}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${period === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button onClick={() => exportReportCsv(report)} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 text-sm font-medium px-3 py-2 rounded-xl transition-all" title="Exportar CSV">
                    <FileSpreadsheet className="w-4 h-4" /> CSV
                  </button>
                  <button onClick={() => exportReportPdf(report)} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 text-sm font-medium px-3 py-2 rounded-xl transition-all" title="Exportar PDF">
                    <FileText className="w-4 h-4" /> PDF
                  </button>
                </div>
              </div>

              {/* Resumo do período */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-indigo-50 rounded-xl p-3"><p className="text-lg font-extrabold text-indigo-700">{report.totals.count}</p><p className="text-xs text-indigo-400">atendimentos</p></div>
                <div className="bg-gray-50 rounded-xl p-3"><p className="text-sm font-extrabold text-gray-800">R$ {report.totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p><p className="text-xs text-gray-400">faturamento</p></div>
                <div className="bg-emerald-50 rounded-xl p-3"><p className="text-sm font-extrabold text-emerald-700">R$ {report.totals.received.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p><p className="text-xs text-emerald-400">recebido</p></div>
                <div className="bg-amber-50 rounded-xl p-3"><p className="text-sm font-extrabold text-amber-700">R$ {report.totals.toReceive.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</p><p className="text-xs text-amber-400">a receber</p></div>
              </div>

              {report.perMember.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Nenhum atendimento neste período.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        <th className="pb-2 pr-4 font-semibold">Profissional</th>
                        <th className="pb-2 pr-4 font-semibold text-right">Atend.</th>
                        <th className="pb-2 pr-4 font-semibold text-right">Faturamento</th>
                        <th className="pb-2 pr-4 font-semibold text-right">Recebido</th>
                        <th className="pb-2 font-semibold text-right">Comissão</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.perMember.map((m: ReportRow) => (
                        <tr key={m.name} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-4 font-medium text-gray-800">{m.name}</td>
                          <td className="py-2 pr-4 text-right text-gray-600">{m.count}</td>
                          <td className="py-2 pr-4 text-right text-gray-700">R$ {m.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</td>
                          <td className="py-2 pr-4 text-right text-emerald-600 font-semibold">R$ {m.received.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</td>
                          <td className="py-2 text-right text-violet-600">R$ {m.commission.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Comparativo + Por serviço */}
            <div className="grid lg:grid-cols-2 gap-6 mb-6">
              {/* Comparativo com período anterior */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Comparativo</h2>
                <p className="text-xs text-gray-400 mb-4">{periodLabel} vs período anterior</p>
                {!prevRange ? (
                  <p className="text-sm text-gray-400 py-6 text-center">Selecione Hoje, Semana ou Mês para comparar.</p>
                ) : (
                  <div className="space-y-3">
                    {([
                      ['Recebido', report.totals.received, prevReceived, true],
                      ['Faturamento', report.totals.revenue, prevRevenue, true],
                      ['Atendimentos', report.totals.count, prevCount, false],
                    ] as const).map(([label, cur, prev, money]) => {
                      const v = pct(cur, prev);
                      const up = cur >= prev;
                      return (
                        <div key={label} className="flex items-center justify-between gap-3 border-b border-gray-50 last:border-0 pb-2">
                          <div>
                            <p className="text-sm text-gray-500">{label}</p>
                            <p className="text-lg font-extrabold text-gray-900">{money ? mask(`R$ ${Number(cur).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`) : cur}</p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-full ${up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
                              {up ? '▲' : '▼'} {Math.abs(v).toFixed(0)}%
                            </span>
                            <p className="text-[11px] text-gray-400 mt-0.5">antes: {money ? `R$ ${Number(prev).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}` : prev}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Por serviço */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-1">Por serviço</h2>
                <p className="text-xs text-gray-400 mb-4">Faturamento por serviço · {periodLabel}</p>
                {topServices.length === 0 ? (
                  <p className="text-sm text-gray-400 py-6 text-center">Nenhum atendimento no período.</p>
                ) : (
                  <div className="space-y-3">
                    {topServices.slice(0, 6).map((s, i) => (
                      <div key={s.name}>
                        <div className="flex items-center justify-between text-sm mb-1">
                          <span className="text-gray-700 truncate flex-1">{s.name} <span className="text-gray-400 text-xs">· {s.count}x</span></span>
                          <span className="font-bold text-emerald-600 shrink-0">{mask(`R$ ${s.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`)}</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full ${i === 0 ? 'gradient-brand' : 'bg-indigo-300'}`} style={{ width: `${(s.revenue / maxServiceRev) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Monthly trend */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">Tendência Mensal</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Agendamentos e faturamento por mês</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    <span className="flex items-center gap-1 text-gray-400"><span className="w-3 h-3 rounded bg-indigo-500" /> Agend.</span>
                    <span className="flex items-center gap-1 text-gray-400"><span className="w-3 h-3 rounded bg-emerald-500" /> R$</span>
                  </div>
                </div>
                {monthData.every((m) => m.bookings === 0) ? (
                  <div className="flex items-center justify-center h-48 text-gray-300 text-sm">Nenhum dado ainda</div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <ComposedChart data={monthData} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} allowDecimals={false} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} hide />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #eee', fontSize: 12 }}
                        formatter={(v: any, name: any) => name === 'revenue' ? [`R$ ${Number(v).toLocaleString('pt-BR')}`, 'Faturamento'] : [v, 'Agendamentos']}
                      />
                      <Bar yAxisId="left" dataKey="bookings" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={36} />
                      <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
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
                          ) : b.paid ? (
                            <span className="text-xs text-emerald-600 font-semibold">✓ Pago{b.payment_method ? ` · ${b.payment_method}` : ''}</span>
                          ) : (
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-xs text-gray-400">R$ {(b.amount ?? (b.services?.price || 0)).toFixed(0)}</span>
                              <select
                                defaultValue=""
                                onChange={(e) => { if (e.target.value) markBookingPaid(b.id, e.target.value); }}
                                className="text-[11px] border border-gray-200 rounded-md px-1 py-0.5 text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                                title="Marcar como pago"
                              >
                                <option value="">Pagar…</option>
                                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
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

        {/* ── Bookings Tab (relatório de agendamentos) ─────────────────────── */}
        {activeTab === 'bookings' && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Agendamentos</h2>
                <p className="text-xs text-gray-400">{periodLabel} · {filteredBookings.length} de {periodBookings.length}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => exportBookingsCsv()} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 text-sm font-medium px-3 py-2 rounded-xl transition-all" title="Exportar CSV"><FileSpreadsheet className="w-4 h-4" /> CSV</button>
                <div className="flex bg-gray-100 rounded-xl p-1">
                  {([['today', 'Hoje'], ['week', 'Semana'], ['month', 'Mês'], ['all', 'Tudo']] as const).map(([v, label]) => (
                    <button key={v} onClick={() => setPeriod(v)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${period === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
                  ))}
                </div>
              </div>
            </div>
            {/* Filtros */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <input type="text" value={bkSearch} onChange={(e) => setBkSearch(e.target.value)} placeholder="Buscar cliente, serviço ou telefone…" className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full sm:w-64" />
              <select value={bkStatus} onChange={(e) => setBkStatus(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="all">Todos os status</option>
                <option value="confirmed">Confirmado</option>
                <option value="pending">Pendente</option>
                <option value="completed">Realizado</option>
                <option value="cancelled">Cancelado</option>
              </select>
              <select value={bkMember} onChange={(e) => setBkMember(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                <option value="all">Todos os profissionais</option>
                {Object.entries(membersMap).map(([id, name]) => <option key={id} value={id}>{name}</option>)}
              </select>
            </div>
            {filteredBookings.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">Nenhum agendamento com esses filtros.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      <th className="pb-2 pr-4 font-semibold">Data</th>
                      <th className="pb-2 pr-4 font-semibold">Cliente</th>
                      <th className="pb-2 pr-4 font-semibold hidden md:table-cell">Profissional</th>
                      <th className="pb-2 pr-4 font-semibold hidden sm:table-cell">Serviço</th>
                      <th className="pb-2 pr-4 font-semibold">Status</th>
                      <th className="pb-2 font-semibold text-right">Pagamento</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBookings.map((b: any) => {
                      const cs = clientStats.find((c) => (c.phone || '').replace(/\D/g, '') === (b.client_phone || '').replace(/\D/g, '') && b.client_phone);
                      return (
                        <tr key={b.id} className="border-b border-gray-50 last:border-0">
                          <td className="py-2 pr-4 text-gray-600 whitespace-nowrap">
                            {new Date(b.start_time).toLocaleDateString('pt-BR')}<br />
                            <span className="text-xs text-gray-400">{new Date(b.start_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</span>
                          </td>
                          <td className="py-2 pr-4">
                            <button onClick={() => cs && openClientDetail(cs)} className={`font-medium text-left ${cs ? 'text-gray-800 hover:text-indigo-600' : 'text-gray-800'}`}>
                              {b.client_name}
                            </button>
                            {b.client_phone && <p className="text-xs text-gray-400">{b.client_phone}</p>}
                          </td>
                          <td className="py-2 pr-4 text-gray-500 hidden md:table-cell">{membersMap[b.member_id] || '—'}</td>
                          <td className="py-2 pr-4 text-gray-500 hidden sm:table-cell">{b.services?.name || '—'}</td>
                          <td className="py-2 pr-4">
                            <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              b.status === 'cancelled' ? 'bg-red-50 text-red-500'
                              : b.status === 'completed' ? 'bg-emerald-50 text-emerald-600'
                              : b.status === 'pending' ? 'bg-amber-50 text-amber-600'
                              : 'bg-indigo-50 text-indigo-600'
                            }`}>
                              {b.status === 'cancelled' ? 'Cancelado' : b.status === 'completed' ? 'Realizado' : b.status === 'pending' ? 'Pendente' : 'Confirmado'}
                            </span>
                          </td>
                          <td className="py-2 text-right">
                            <div className="flex items-center gap-1 justify-end">
                              {b.status === 'cancelled' ? (
                                <span className="text-xs text-gray-300">—</span>
                              ) : b.paid ? (
                                <span className="text-xs text-emerald-600 font-semibold">{mask(`R$ ${(b.amount ?? (b.services?.price || 0)).toFixed(0)}`)} · {b.payment_method}</span>
                              ) : (
                                <>
                                  <select defaultValue="" onChange={(e) => { if (e.target.value) markBookingPaid(b.id, e.target.value); }} className="text-[11px] border border-gray-200 rounded-md px-1 py-0.5 text-gray-500 focus:outline-none focus:ring-1 focus:ring-indigo-400">
                                    <option value="">Pagar…</option>
                                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                                  </select>
                                  <button onClick={() => setCancelTarget(b.id)} className="text-[11px] text-gray-400 hover:text-red-500 px-1" title="Cancelar">✕</button>
                                </>
                              )}
                              {b.status !== 'cancelled' && (
                                <button onClick={() => openBkEdit(b)} className="text-gray-300 hover:text-indigo-600 px-1" title="Editar agendamento"><Pencil className="w-3.5 h-3.5" /></button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── Sales Tab (vendas de produtos) ───────────────────────────────── */}
        {activeTab === 'sales' && (
          <>
            <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Vendas de produtos</h2>
                <p className="text-xs text-gray-400">{periodLabel} · separado dos atendimentos</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-gray-100 rounded-xl p-1">
                  {([['today', 'Hoje'], ['week', 'Semana'], ['month', 'Mês'], ['all', 'Tudo']] as const).map(([v, label]) => (
                    <button key={v} onClick={() => setPeriod(v)} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${period === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{label}</button>
                  ))}
                </div>
                <button onClick={exportSalesCsv} className="flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 text-sm font-medium px-3 py-1.5 rounded-xl transition-all" title="Exportar CSV"><FileSpreadsheet className="w-4 h-4" /> CSV</button>
                <button onClick={toggleMoney} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 bg-white border border-gray-200 rounded-xl px-3 py-1.5 transition-all">
                  {hideMoney ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Alerta de estoque baixo */}
            {lowStock.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-amber-900">{lowStock.length} produto(s) com estoque baixo</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {lowStock.map((p) => `${p.name} (${p.stock})`).join(' · ')}
                  </p>
                </div>
              </div>
            )}

            {/* Resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><p className="text-lg font-extrabold text-indigo-700">{mask(`R$ ${salesTotal.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`)}</p><p className="text-xs text-gray-400">total vendido</p></div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><p className="text-lg font-extrabold text-gray-800">{salesUnits}</p><p className="text-xs text-gray-400">unidades</p></div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><p className="text-lg font-extrabold text-gray-800">{productSales.length}</p><p className="text-xs text-gray-400">vendas</p></div>
              <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"><p className="text-sm font-extrabold text-emerald-600">{mask(`R$ ${(salesUnits > 0 ? salesTotal / salesUnits : 0).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`)}</p><p className="text-xs text-gray-400">média/unidade</p></div>
            </div>

            <div className="grid lg:grid-cols-3 gap-6">
              {/* Lista de vendas */}
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Histórico de vendas</h3>
                {productSales.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Nenhuma venda neste período. Use "Vender produto" no dashboard.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                          <th className="pb-2 pr-4 font-semibold">Data</th>
                          <th className="pb-2 pr-4 font-semibold">Produto</th>
                          <th className="pb-2 pr-4 font-semibold text-center">Qtd</th>
                          <th className="pb-2 pr-4 font-semibold hidden sm:table-cell">Vendedor</th>
                          <th className="pb-2 font-semibold text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {productSales.map((b: any) => (
                          <tr key={b.id} onClick={() => openSaleEdit(b)} className="border-b border-gray-50 last:border-0 cursor-pointer hover:bg-gray-50 transition-colors">
                            <td className="py-2 pr-4 text-gray-500 whitespace-nowrap">{new Date(b.start_time).toLocaleDateString('pt-BR')}</td>
                            <td className="py-2 pr-4 font-medium text-gray-800">{b.services?.name}<span className="text-xs text-gray-400 block sm:hidden">{b.payment_method}</span></td>
                            <td className="py-2 pr-4 text-center text-gray-600">{b.quantity}</td>
                            <td className="py-2 pr-4 text-gray-500 hidden sm:table-cell">{membersMap[b.member_id] || '—'}</td>
                            <td className="py-2 text-right font-semibold text-emerald-600">{mask(`R$ ${(b.amount ?? 0).toFixed(0)}`)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="text-[11px] text-gray-300 mt-3">Clique numa venda para editar ou excluir.</p>
                  </div>
                )}
              </div>

              {/* Top produtos + estoque */}
              <div className="space-y-6">
                {/* Controle de estoque (editável) */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-1">Controle de estoque</h3>
                  <p className="text-xs text-gray-400 mb-4">Ajuste as quantidades diretamente</p>
                  {products.length === 0 ? (
                    <p className="text-sm text-gray-400">Nenhum produto cadastrado.</p>
                  ) : (
                    <div className="space-y-2">
                      {products.map((p) => {
                        const low = p.stock != null && p.stock <= p.low_stock_threshold;
                        return (
                          <div key={p.id} className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${p.stock == null ? 'bg-gray-200' : low ? (p.stock === 0 ? 'bg-red-500' : 'bg-amber-400') : 'bg-emerald-400'}`} />
                            <span className="text-sm text-gray-700 flex-1 truncate">{p.name}</span>
                            {p.stock == null ? (
                              <span className="text-xs text-gray-300">sem controle</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button onClick={() => updateStock(p.id, Math.max(0, (p.stock || 0) - 1))} className="w-6 h-6 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">−</button>
                                <input
                                  type="number" min={0} value={p.stock}
                                  onChange={(e) => updateStock(p.id, Math.max(0, parseInt(e.target.value) || 0))}
                                  className={`w-12 text-center text-sm border rounded-lg py-1 focus:outline-none focus:ring-1 focus:ring-indigo-400 ${low ? 'border-amber-300 text-amber-700 font-semibold' : 'border-gray-200'}`}
                                />
                                <button onClick={() => updateStock(p.id, (p.stock || 0) + 1)} className="w-6 h-6 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50">+</button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="font-bold text-gray-900 mb-4">Mais vendidos</h3>
                  {topProducts.length === 0 ? (
                    <p className="text-sm text-gray-400">Sem vendas ainda.</p>
                  ) : (
                    <div className="space-y-3">
                      {topProducts.slice(0, 6).map((p, i) => (
                        <div key={p.name} className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${i === 0 ? 'gradient-brand' : 'bg-gray-300'}`}>{i + 1}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                            <p className="text-xs text-gray-400">{p.units} un.</p>
                          </div>
                          <span className="text-sm font-bold text-emerald-600">{mask(`R$ ${p.total.toFixed(0)}`)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* ── Clients Tab ──────────────────────────────────────────────────── */}
        {activeTab === 'clients' && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
                <p className="text-3xl font-extrabold gradient-text">{clientStats.length}</p>
                <p className="text-sm text-gray-500 mt-1">Clientes únicos</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
                <p className="text-3xl font-extrabold gradient-text">{recurringClients}</p>
                <p className="text-sm text-gray-500 mt-1">Clientes recorrentes (2+ visitas)</p>
              </div>
              <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm text-center">
                <p className="text-3xl font-extrabold gradient-text">{newClientsThisMonth}</p>
                <p className="text-sm text-gray-500 mt-1">Novos este mês</p>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">Clientes</h2>
                  <p className="text-xs text-gray-400">Cadastrados e agregados dos agendamentos</p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {clientStats.length > 0 && (
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={(e) => setClientSearch(e.target.value)}
                      placeholder="Buscar por nome ou telefone…"
                      className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all w-full sm:w-56"
                    />
                  )}
                  {clientStats.length > 0 && (
                    <button
                      onClick={exportClientsCsv}
                      className="shrink-0 flex items-center gap-1.5 bg-white border border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600 text-sm font-medium px-3 py-2 rounded-xl transition-all"
                      title="Exportar CSV"
                    >
                      ↓ CSV
                    </button>
                  )}
                  <Button onClick={() => setNewClientOpen(true)} className="gradient-brand shadow-md shadow-indigo-500/20">
                    <UserPlus className="w-4 h-4" /> Novo cliente
                  </Button>
                </div>
              </div>
              {clientStats.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Nenhum cliente ainda. Compartilhe sua página pública!</p>
              ) : filteredClients.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-8">Nenhum cliente encontrado para “{clientSearch}”.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                        <th className="pb-3 pr-4 font-semibold">Cliente</th>
                        <th className="pb-3 pr-4 font-semibold">Visitas</th>
                        <th className="pb-3 pr-4 font-semibold">Última visita</th>
                        <th className="pb-3 pr-4 font-semibold hidden md:table-cell">Profissional frequente</th>
                        <th className="pb-3 pr-4 font-semibold text-right">Total gasto</th>
                        <th className="pb-3 font-semibold text-right">Contato</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClients.map((c) => (
                        <tr key={c.phone || c.name} className="border-b border-gray-50 last:border-0">
                          <td className="py-3 pr-4">
                            <button onClick={() => openClientDetail(c)} className="flex items-center gap-2.5 text-left hover:opacity-80 transition-opacity">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 ${
                                c.visits > 1 ? 'gradient-brand' : 'bg-gray-300'
                              }`}>
                                {c.name?.charAt(0).toUpperCase() || '?'}
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-gray-800 truncate hover:text-indigo-600 transition-colors">{c.name}</p>
                                {c.visits > 1 && <span className="text-[10px] text-indigo-500 font-medium">Recorrente</span>}
                              </div>
                            </button>
                          </td>
                          <td className="py-3 pr-4 font-bold text-gray-700">{c.visits}</td>
                          <td className="py-3 pr-4 text-gray-500">{c.lastVisit ? new Date(c.lastVisit).toLocaleDateString('pt-BR') : '—'}</td>
                          <td className="py-3 pr-4 text-gray-500 hidden md:table-cell">{c.favoriteMember}</td>
                          <td className="py-3 pr-4 text-right font-semibold text-emerald-600">
                            {mask(`R$ ${c.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`)}
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {c.phone && (
                                <button
                                  onClick={() => openNote(c.name, c.phone)}
                                  title="Anotações"
                                  className={`inline-flex items-center gap-1 text-xs font-medium transition-colors ${
                                    notedPhones.has(c.phone.replace(/\D/g, '')) ? 'text-indigo-600' : 'text-gray-400 hover:text-indigo-600'
                                  }`}
                                >
                                  <StickyNote className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {c.phone && (
                                <a
                                  href={`https://wa.me/55${c.phone.replace(/\D/g, '')}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                                >
                                  WhatsApp ↗
                                </a>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        {/* ── Services Tab ─────────────────────────────────────────────────── */}
        {activeTab === 'services' && orgId && (
          <div className="space-y-6">
            {/* Service CRUD */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <ManageServices
                memberId=""
                organizationId={orgId}
                canEditPrice={true}
              />
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
                          {m.commissionPercent > 0 ? (
                            <>
                              <p className="text-sm font-extrabold text-violet-700">
                                R$ {(m.revenue * m.commissionPercent / 100).toLocaleString('pt-BR', { minimumFractionDigits: 0 })}
                              </p>
                              <p className="text-xs text-violet-400">comissão ({m.commissionPercent}%)</p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-extrabold text-violet-700">
                                R$ {m.bookings > 0 ? (m.revenue / m.bookings).toFixed(0) : '0'}
                              </p>
                              <p className="text-xs text-violet-400">ticket médio</p>
                            </>
                          )}
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
      </div>

      {/* Diálogo de anotações do cliente */}
      <Dialog open={!!noteClient} onOpenChange={(v) => !v && setNoteClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Anotações · {noteClient?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-400 -mt-2">Visível apenas para a sua equipe (preferências, alergias, observações).</p>
          <textarea
            rows={5}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Ex.: prefere horário à tarde; alérgica a X; cliente antigo…"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
          <div className="flex justify-end">
            <Button onClick={saveNote} disabled={noteSaving} className="gradient-brand shadow-md shadow-indigo-500/20">
              {noteSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar anotação'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de edição de agendamento */}
      <Dialog open={!!bkEdit} onOpenChange={(v) => !v && setBkEdit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar agendamento</DialogTitle></DialogHeader>
          {bkEdit && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Serviço</label>
                <select value={bkEdit.serviceId} onChange={(e) => setBkEdit({ ...bkEdit, serviceId: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                  {bkEdit.services.length === 0 && <option value="">Sem serviços</option>}
                  {bkEdit.services.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.duration}min</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Data</label>
                  <input type="date" value={bkEdit.date} onChange={(e) => setBkEdit({ ...bkEdit, date: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Horário</label>
                  <input type="time" value={bkEdit.time} onChange={(e) => setBkEdit({ ...bkEdit, time: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={saveBkEdit} disabled={bkEditSaving} className="gradient-brand">{bkEditSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de cancelamento com motivo */}
      <Dialog open={!!cancelTarget} onOpenChange={(v) => { if (!v) { setCancelTarget(null); setCancelReason(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Cancelar agendamento</DialogTitle></DialogHeader>
          <p className="text-xs text-gray-400 -mt-2">O horário será liberado. Informe o motivo (opcional, entra nos relatórios).</p>
          <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} placeholder="Ex.: cliente desmarcou, imprevisto…" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => { setCancelTarget(null); setCancelReason(''); }}>Voltar</Button>
            <Button onClick={confirmCancel} className="bg-red-500 hover:bg-red-600 text-white">Cancelar agendamento</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Diálogo de edição de venda */}
      <Dialog open={!!saleEdit} onOpenChange={(v) => !v && setSaleEdit(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Editar venda · {saleEdit?.name}</DialogTitle>
          </DialogHeader>
          {saleEdit && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade</label>
                  <input type="number" min={1} value={saleEdit.qty} onChange={(e) => setSaleEdit({ ...saleEdit, qty: Math.max(1, parseInt(e.target.value) || 1) })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Pagamento</label>
                  <select value={saleEdit.method} onChange={(e) => setSaleEdit({ ...saleEdit, method: e.target.value })} className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
                    {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3">
                <span className="text-sm text-indigo-700 font-medium">Total</span>
                <span className="text-lg font-extrabold text-indigo-700">R$ {(saleEdit.unit * saleEdit.qty).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex gap-2">
                <ConfirmButton onConfirm={() => deleteSale(productSales.find((b: any) => b.id === saleEdit.id))} title="Excluir venda?" description="A venda será removida e o estoque reposto." confirmText="Excluir">
                  <Button variant="outline" className="flex-1 text-red-500 border-red-200 hover:bg-red-50 hover:text-red-600">Excluir</Button>
                </ConfirmButton>
                <Button onClick={saveSaleEdit} disabled={saleSaving} className="flex-1 gradient-brand">
                  {saleSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de detalhes do cliente */}
      <Dialog open={!!detailClient} onOpenChange={(v) => !v && setDetailClient(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-2">
              <span>{detailClient?.name}</span>
              <button onClick={toggleMoney} className="text-gray-400 hover:text-indigo-600" title={hideMoney ? 'Mostrar valores' : 'Ocultar valores'}>
                {hideMoney ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </DialogTitle>
          </DialogHeader>
          {detailClient && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-indigo-50 rounded-xl p-3"><p className="text-lg font-extrabold text-indigo-700">{detailClient.visits}</p><p className="text-[11px] text-indigo-400">visitas</p></div>
                <div className="bg-emerald-50 rounded-xl p-3"><p className="text-sm font-extrabold text-emerald-700">{mask(`R$ ${detailClient.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 0 })}`)}</p><p className="text-[11px] text-emerald-400">total gasto</p></div>
                <div className="bg-gray-50 rounded-xl p-3"><p className="text-xs font-bold text-gray-700 truncate">{detailClient.lastVisit ? new Date(detailClient.lastVisit).toLocaleDateString('pt-BR') : '—'}</p><p className="text-[11px] text-gray-400">última visita</p></div>
              </div>
              {/* Edição dos dados do cliente */}
              <div className="space-y-2 border-t border-gray-50 pt-3">
                <p className="text-[11px] uppercase tracking-wider font-bold text-gray-400">Editar dados</p>
                <input type="text" value={detailEdit.name} onChange={(e) => setDetailEdit({ ...detailEdit, name: e.target.value })} placeholder="Nome" className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                <div className="grid grid-cols-2 gap-2">
                  <input type="tel" value={detailEdit.phone} onChange={(e) => setDetailEdit({ ...detailEdit, phone: e.target.value })} placeholder="Telefone" className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                  <input type="email" value={detailEdit.email} onChange={(e) => setDetailEdit({ ...detailEdit, email: e.target.value })} placeholder="E-mail" className="px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
                </div>
                <p className="text-xs text-gray-400">Profissional frequente: <strong className="text-gray-600">{detailClient.favoriteMember}</strong></p>
              </div>
              <div className="flex gap-2 pt-1">
                {detailClient.phone && (
                  <Button asChild variant="outline" className="flex-1">
                    <a href={`https://wa.me/55${detailClient.phone.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                  </Button>
                )}
                <Button onClick={saveClientEdit} disabled={detailSaving} className="flex-1 gradient-brand">
                  {detailSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar'}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de novo cliente */}
      <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo cliente</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-gray-400 -mt-2">Cadastre para reusar no agendamento manual (autocomplete).</p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome *</label>
              <input type="text" value={ncName} onChange={(e) => setNcName(e.target.value)} placeholder="Nome do cliente" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                <input type="tel" value={ncPhone} onChange={(e) => setNcPhone(e.target.value)} placeholder="(XX) XXXXX-XXXX" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                <input type="email" value={ncEmail} onChange={(e) => setNcEmail(e.target.value)} placeholder="opcional" className="w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent" />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={saveNewClient} disabled={ncSaving} className="gradient-brand shadow-md shadow-indigo-500/20">
              {ncSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Cadastrar cliente'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
