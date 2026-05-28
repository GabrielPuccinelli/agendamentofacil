import React, { useState } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Reveal } from '../components/Reveal';
import { Button } from '@/components/ui/button';

// ── Icons ───────────────────────────────────────────────────────────────────
const ArrowRight = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);
const Check = ({ className = 'w-4 h-4' }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
  </svg>
);

// ── Data ────────────────────────────────────────────────────────────────────
const features = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Agendamento Online 24h',
    desc: 'Clientes agendam pelo celular, tablet ou computador a qualquer hora — sem precisar ligar ou mandar mensagem.',
    color: 'from-indigo-500 to-blue-600',
    bg: 'bg-indigo-50',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'Analytics em Tempo Real',
    desc: 'Painel executivo com faturamento, ticket médio, taxa de cancelamento e desempenho por profissional.',
    color: 'from-violet-500 to-purple-600',
    bg: 'bg-violet-50',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Gestão Completa de Equipes',
    desc: 'Adicione profissionais, configure permissões individuais e acompanhe a agenda de cada um.',
    color: 'from-cyan-500 to-teal-600',
    bg: 'bg-cyan-50',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Controle Financeiro',
    desc: 'Acompanhe o faturamento mensal, histórico de pagamentos e comissões por profissional.',
    color: 'from-emerald-500 to-green-600',
    bg: 'bg-emerald-50',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
      </svg>
    ),
    title: 'Catálogo de Serviços Rico',
    desc: 'Cadastre serviços com descrição, duração, materiais inclusos, categoria e comissão do profissional.',
    color: 'from-amber-500 to-orange-600',
    bg: 'bg-amber-50',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
      </svg>
    ),
    title: 'Controle de Permissões',
    desc: 'Defina quais profissionais podem editar preços, atualizar o perfil e visualizar dados financeiros.',
    color: 'from-rose-500 to-pink-600',
    bg: 'bg-rose-50',
  },
];

const steps = [
  {
    num: '01',
    title: 'Crie sua conta',
    desc: 'Cadastre-se como dono de empresa ou colaborador. Configuração em menos de 2 minutos.',
    icon: '👤',
  },
  {
    num: '02',
    title: 'Configure sua empresa',
    desc: 'Adicione sua equipe, serviços com preços e horários de atendimento personalizados.',
    icon: '⚙️',
  },
  {
    num: '03',
    title: 'Compartilhe o link',
    desc: 'Envie o link da sua página para os clientes. Eles agendam sozinhos, 24h por dia.',
    icon: '🚀',
  },
];

const audiences = [
  { icon: '✂️', title: 'Salões de Beleza', desc: 'Agenda unificada para toda a equipe com controle de comissões' },
  { icon: '🧴', title: 'Clínicas Estéticas', desc: 'Gestão de procedimentos com materiais inclusos e protocolos' },
  { icon: '💇', title: 'Barbearias', desc: 'Agendamento online para múltiplos barbeiros com horários flexíveis' },
  { icon: '💆', title: 'Centros de Massagem', desc: 'Controle de salas e profissionais com disponibilidade em tempo real' },
  { icon: '💅', title: 'Estúdios de Unhas', desc: 'Catálogo de serviços com duração precisa para cada técnica' },
  { icon: '🏋️', title: 'Personal Trainers', desc: 'Agenda pessoal com confirmação automática de sessões' },
];

const testimonials = [
  {
    name: 'Camila Rocha',
    role: 'Proprietária · Espaço Camila Beauty',
    avatar: 'CR',
    color: 'from-pink-500 to-rose-500',
    text: 'Antes eu perdia horas no WhatsApp confirmando agendamentos. Hoje tudo é automático e meu faturamento cresceu 40% em 3 meses.',
  },
  {
    name: 'Rafael Mendes',
    role: 'Barbeiro · Barbearia Premium',
    avatar: 'RM',
    color: 'from-indigo-500 to-blue-600',
    text: 'O painel de analytics me mostrou que terças-feiras eram meu pior dia. Criei promoções e agora estou lotado a semana toda.',
  },
  {
    name: 'Dra. Ana Lima',
    role: 'Estética · Clínica Bella Forma',
    avatar: 'AL',
    color: 'from-violet-500 to-purple-600',
    text: 'A gestão de equipe é incrível. Cada profissional tem seu próprio link e consigo ver o desempenho de cada uma em tempo real.',
  },
];

const pricingFeatures = [
  'Agendamentos ilimitados',
  'Múltiplos profissionais',
  'Página pública de agendamento',
  'Catálogo de serviços completo',
  'Painel Analytics (PowerBI)',
  'Controle de permissões',
  'Gestão de disponibilidade',
  'Histórico de clientes',
];

const faqs = [
  {
    q: 'Preciso de conhecimento técnico para usar?',
    a: 'Não. O AgendaFácil foi criado para profissionais de beleza e saúde, não para programadores. A configuração é visual e intuitiva — você estará operacional em minutos.',
  },
  {
    q: 'Posso ter vários profissionais na mesma conta?',
    a: 'Sim! Você cadastra toda sua equipe, define serviços e horários para cada profissional, e ainda controla permissões individualmente.',
  },
  {
    q: 'Como os clientes fazem o agendamento?',
    a: 'Você compartilha um link personalizado (ex: agendamentofacil.com/e/seu-salao). O cliente escolhe o serviço, profissional, data e horário disponível.',
  },
  {
    q: 'Os dados são seguros?',
    a: 'Sim. Utilizamos criptografia ponta a ponta, autenticação segura e infraestrutura Supabase/PostgreSQL com backups automáticos.',
  },
];

// ── FAQ item ─────────────────────────────────────────────────────────────────
const FaqItem = ({ q, a }: { q: string; a: string }) => {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border rounded-2xl overflow-hidden transition-colors ${open ? 'border-indigo-200 bg-white shadow-sm' : 'border-gray-200'}`}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        aria-expanded={open}
      >
        <span className="font-semibold text-gray-900 text-sm pr-4">{q}</span>
        <svg
          className={`w-5 h-5 text-gray-400 shrink-0 transition-transform duration-300 ${open ? 'rotate-180 text-indigo-500' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-4 text-sm text-gray-500 leading-relaxed">{a}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ── Mock Dashboard Preview ────────────────────────────────────────────────────
const DashboardMockup = () => (
  <div className="bg-slate-900 rounded-2xl overflow-hidden shadow-2xl shadow-indigo-500/20 border border-slate-700">
    {/* Window chrome */}
    <div className="bg-slate-800 px-4 py-3 flex items-center gap-2 border-b border-slate-700">
      <div className="w-3 h-3 rounded-full bg-red-500/70" />
      <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
      <div className="w-3 h-3 rounded-full bg-green-500/70" />
      <div className="flex-1 mx-4 bg-slate-700 rounded-lg h-5 flex items-center px-3">
        <span className="text-slate-400 text-xs">agendamentofacil.com/company/dashboard</span>
      </div>
    </div>
    {/* Content */}
    <div className="p-4 space-y-3">
      {/* Header bar */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-4">
        <div className="h-3 w-24 bg-white/40 rounded-full mb-2" />
        <div className="h-5 w-40 bg-white/70 rounded-full" />
      </div>
      {/* KPI row */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { v: '127', l: 'Agend. mês', c: 'bg-indigo-500/20' },
          { v: 'R$8.4k', l: 'Faturamento', c: 'bg-emerald-500/20' },
          { v: 'R$66', l: 'Ticket médio', c: 'bg-violet-500/20' },
          { v: '3%', l: 'Cancelados', c: 'bg-rose-500/20' },
        ].map((k) => (
          <div key={k.l} className={`${k.c} rounded-xl p-2.5`}>
            <div className="text-white font-bold text-sm">{k.v}</div>
            <div className="text-slate-400 text-xs">{k.l}</div>
          </div>
        ))}
      </div>
      {/* Chart bars */}
      <div className="bg-slate-800 rounded-xl p-3">
        <div className="h-2 w-28 bg-slate-600 rounded-full mb-3" />
        <div className="flex items-end gap-1 h-16">
          {[40, 65, 50, 80, 60, 90, 75].map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-md bg-gradient-to-t from-indigo-600 to-violet-500 opacity-80"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
        <div className="flex justify-between mt-2">
          {['Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai'].map((m) => (
            <span key={m} className="text-slate-500 text-xs">{m}</span>
          ))}
        </div>
      </div>
      {/* Team rows */}
      <div className="bg-slate-800 rounded-xl p-3 space-y-2">
        {[
          { n: 'Camila', v: 85, r: 'R$3.2k' },
          { n: 'Rafael', v: 60, r: 'R$2.8k' },
          { n: 'Ana', v: 45, r: 'R$2.1k' },
        ].map((row) => (
          <div key={row.n} className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
              {row.n[0]}
            </div>
            <div className="flex-1 h-2 bg-slate-700 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full" style={{ width: `${row.v}%` }} />
            </div>
            <span className="text-xs text-slate-400 w-12 text-right">{row.r}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

// ── Page ─────────────────────────────────────────────────────────────────────
const HomePage: React.FC = () => {
  return (
    <div className="bg-white overflow-x-hidden">
      <Header />

      <main>
        {/* ─── Hero ─── */}
        <section className="relative min-h-screen flex items-center overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 pt-20">
          <div className="absolute top-1/4 left-[5%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-3xl animate-pulse-slow pointer-events-none" />
          <div className="absolute bottom-1/4 right-[5%] w-[400px] h-[400px] bg-violet-600/15 rounded-full blur-3xl animate-pulse-slow pointer-events-none" style={{ animationDelay: '2s' }} />

          <div className="relative z-10 container mx-auto px-4 py-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Left: Text */}
              <div>
                <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-6 text-sm text-indigo-300">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                  Plataforma 100% online · Pronta para usar hoje
                </div>

                <h1 className="text-5xl md:text-6xl font-extrabold text-white leading-tight mb-5 animate-fade-in">
                  Controle total da sua<br />
                  <span className="gradient-text">agenda e equipe</span>
                </h1>

                <p className="text-lg text-indigo-200 mb-4 leading-relaxed">
                  Agendamento online, analytics em tempo real, gestão de equipes e controle financeiro — tudo em uma plataforma.
                </p>

                <ul className="space-y-2 mb-8">
                  {['Clientes agendam sozinhos, 24h por dia', 'Painel de dados como um Power BI', 'Equipe, serviços e permissões centralizados'].map((item) => (
                    <li key={item} className="flex items-center gap-2 text-indigo-200 text-sm">
                      <div className="w-5 h-5 rounded-full bg-indigo-500/30 flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-indigo-300" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>

                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="gradient-brand h-auto py-4 px-8 rounded-2xl text-base font-bold shadow-lg shadow-indigo-500/30 transition-all hover:opacity-90 hover:shadow-2xl hover:shadow-indigo-500/40 hover:-translate-y-1"
                  >
                    <Link to="/login">
                      Começar Gratuitamente
                      <ArrowRight />
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="glass h-auto py-4 px-8 rounded-2xl text-base font-semibold text-white border-white/20 hover:bg-white/15 hover:text-white"
                  >
                    <a href="#features">Ver recursos</a>
                  </Button>
                </div>
                <p className="mt-4 text-indigo-400 text-sm">Sem cartão de crédito · Cancele quando quiser</p>
              </div>

              {/* Right: Mockup */}
              <div className="hidden lg:block">
                <DashboardMockup />
              </div>
            </div>
          </div>

          {/* Wave */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,80 C360,0 1080,0 1440,80 L1440,80 L0,80 Z" />
            </svg>
          </div>
        </section>

        {/* ─── Stats ─── */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto text-center">
              {[
                { v: '10k+', l: 'Agendamentos realizados' },
                { v: '500+', l: 'Empresas cadastradas' },
                { v: '99%', l: 'Disponibilidade' },
                { v: '< 2min', l: 'Para começar' },
              ].map((s) => (
                <div key={s.l} className="p-4">
                  <div className="text-4xl font-extrabold gradient-text mb-1">{s.v}</div>
                  <p className="text-gray-500 text-sm font-medium">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Features ─── */}
        <section id="features" className="py-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="section-label">Recursos</span>
              <h2 className="section-title">Tudo que você precisa para crescer</h2>
              <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
                Uma plataforma completa para automatizar, profissionalizar e escalar seu negócio de agendamentos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((f, i) => (
                <Reveal key={i} delay={(i % 3) * 0.08}>
                  <div className="group h-full bg-white p-7 rounded-2xl shadow-sm border border-gray-100 card-lift hover:border-indigo-200 transition-all">
                    <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${f.color} flex items-center justify-center text-white mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      {f.icon}
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{f.title}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Who is it for ─── */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="section-label">Para quem é</span>
              <h2 className="section-title">Feito para qualquer profissional de beleza e saúde</h2>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {audiences.map((a) => (
                <div key={a.title} className="group text-center p-5 rounded-2xl border border-gray-100 bg-gray-50 hover:bg-indigo-50 hover:border-indigo-200 transition-all cursor-default">
                  <div className="text-3xl mb-3">{a.icon}</div>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">{a.title}</h3>
                  <p className="text-xs text-gray-400 leading-snug hidden md:block">{a.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How it works ─── */}
        <section id="how-it-works" className="py-24 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-violet-600/15 rounded-full blur-3xl" />
          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <span className="inline-block text-xs font-bold uppercase tracking-widest text-indigo-400 bg-indigo-400/10 px-3 py-1 rounded-full mb-3">Como funciona</span>
              <h2 className="text-4xl font-extrabold text-white">Comece em 3 passos simples</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              {steps.map((s, i) => (
                <Reveal key={i} delay={i * 0.12} className="relative text-center"><div className="relative text-center">
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-8 left-[65%] w-[70%] h-px bg-gradient-to-r from-indigo-400/50 to-transparent" />
                  )}
                  <div className="relative z-10 w-16 h-16 rounded-2xl gradient-brand flex items-center justify-center text-2xl mx-auto mb-5 shadow-xl shadow-indigo-500/30">
                    {s.icon}
                  </div>
                  <div className="text-xs font-bold text-indigo-400 mb-1">{s.num}</div>
                  <h3 className="text-xl font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-indigo-300 text-sm leading-relaxed">{s.desc}</p>
                </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Dashboard showcase ─── */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <span className="section-label">Analytics</span>
                <h2 className="section-title">Dados que geram decisões mais inteligentes</h2>
                <p className="text-gray-500 mt-4 mb-6 leading-relaxed">
                  Acompanhe o desempenho da sua empresa como um executivo. Visualize tendências, compare profissionais e entenda onde está seu dinheiro.
                </p>
                <ul className="space-y-3">
                  {[
                    'Faturamento e ticket médio por período',
                    'Desempenho e comissão por profissional',
                    'Serviços mais rentáveis e mais pedidos',
                    'Taxa de cancelamento e dias mais movimentados',
                    'Tendência mensal dos últimos 7 meses',
                  ].map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <div className="w-5 h-5 rounded-full gradient-brand flex items-center justify-center shrink-0 mt-0.5">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-gray-600 text-sm">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <DashboardMockup />
              </div>
            </div>
          </div>
        </section>

        {/* ─── Testimonials ─── */}
        <section className="py-24 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="section-label">Depoimentos</span>
              <h2 className="section-title">Quem já usa, aprova</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
              {testimonials.map((t, i) => (
                <Reveal key={t.name} delay={i * 0.1} className="h-full">
                <div className="h-full bg-white rounded-2xl p-7 shadow-sm border border-gray-100 card-lift flex flex-col gap-5">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map((s) => (
                      <svg key={s} className="w-4 h-4 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed flex-1">"{t.text}"</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${t.color} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
                      {t.avatar}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.role}</p>
                    </div>
                  </div>
                </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Pricing ─── */}
        <section id="pricing" className="py-24 bg-white">
          <div className="container mx-auto px-4 text-center">
            <span className="section-label">Preços</span>
            <h2 className="section-title mb-2">Simples e transparente</h2>
            <p className="text-gray-500 mb-12">Tudo incluído, sem surpresas.</p>

            <div className="max-w-sm mx-auto">
              <div className="relative rounded-3xl overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 to-violet-700" />
                <div className="relative p-8 text-white">
                  <div className="inline-block bg-white/15 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider mb-6">
                    Plano Completo
                  </div>
                  <div className="flex items-end justify-center gap-1 mb-2">
                    <span className="text-2xl font-medium self-start mt-3">R$</span>
                    <span className="text-8xl font-extrabold leading-none">9</span>
                    <div className="text-left self-end pb-1">
                      <div className="text-2xl font-bold">,90</div>
                      <div className="text-indigo-300 text-sm">/mês</div>
                    </div>
                  </div>
                  <p className="text-indigo-200 text-sm mb-8">Acesso completo a todos os recursos</p>
                  <ul className="space-y-3 text-left mb-8">
                    {pricingFeatures.map((item) => (
                      <li key={item} className="flex items-center gap-3">
                        <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-sm">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/login"
                    className="block w-full bg-white text-indigo-700 hover:bg-indigo-50 font-bold py-4 px-6 rounded-2xl transition-all hover:shadow-xl text-center"
                  >
                    Começar Agora — Grátis
                  </Link>
                  <p className="text-indigo-300 text-xs mt-3">7 dias grátis · Sem cartão de crédito</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FAQ ─── */}
        <section className="py-24 bg-gray-50">
          <div className="container mx-auto px-4 max-w-2xl">
            <div className="text-center mb-12">
              <span className="section-label">FAQ</span>
              <h2 className="section-title">Dúvidas frequentes</h2>
            </div>
            <div className="space-y-3">
              {faqs.map((faq) => <FaqItem key={faq.q} q={faq.q} a={faq.a} />)}
            </div>
          </div>
        </section>

        {/* ─── CTA final ─── */}
        <section className="py-28 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-violet-600/20 rounded-full blur-3xl" />
          <div className="relative z-10 container mx-auto px-4 text-center">
            <Reveal>
              <div className="text-5xl mb-6">🚀</div>
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
                Pronto para começar?
              </h2>
              <p className="text-indigo-200 text-lg mb-10 max-w-xl mx-auto">
                Junte-se a centenas de empresas que já automatizaram seus agendamentos e cresceram com o AgendaFácil.
              </p>
              <Button
                asChild
                size="lg"
                className="gradient-brand h-auto py-5 px-12 rounded-2xl text-lg font-bold shadow-lg shadow-indigo-500/30 transition-all hover:opacity-90 hover:shadow-2xl hover:shadow-indigo-500/40 hover:-translate-y-1"
              >
                <Link to="/login">
                  Criar conta gratuitamente
                  <ArrowRight />
                </Link>
              </Button>
              <p className="mt-4 text-indigo-400 text-sm">Configuração em menos de 2 minutos</p>
            </Reveal>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
