import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { Link } from 'react-router-dom';

const features = [
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Agendamento Online',
    description: 'Clientes agendam 24h por dia, de qualquer dispositivo, sem precisar ligar ou mandar mensagem.',
    gradient: 'from-indigo-500 to-blue-500',
    bg: 'bg-indigo-50',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: 'Lembretes Inteligentes',
    description: 'Notificações automáticas por WhatsApp reduzem faltas e mantêm sua agenda sempre cheia.',
    gradient: 'from-violet-500 to-purple-500',
    bg: 'bg-violet-50',
  },
  {
    icon: (
      <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    title: 'Gestão de Equipes',
    description: 'Adicione membros, configure serviços e controle permissões em tempo real.',
    gradient: 'from-cyan-500 to-teal-500',
    bg: 'bg-cyan-50',
  },
];

const stats = [
  { value: '10k+', label: 'Agendamentos realizados' },
  { value: '500+', label: 'Empresas cadastradas' },
  { value: '99%', label: 'Clientes satisfeitos' },
];

const steps = [
  {
    num: '01',
    title: 'Crie sua conta',
    desc: 'Cadastre-se em segundos com seu e-mail ou conta Google. Nenhum cartão necessário.',
  },
  {
    num: '02',
    title: 'Configure os serviços',
    desc: 'Adicione sua equipe, serviços e horários de atendimento com facilidade.',
  },
  {
    num: '03',
    title: 'Compartilhe o link',
    desc: 'Envie o link de agendamento para seus clientes e comece a receber reservas.',
  },
];

const pricingFeatures = [
  'Agendamentos ilimitados',
  'Múltiplos profissionais',
  'Link de agendamento público',
  'Gestão de serviços',
  'Calendário em tempo real',
  'Controle de disponibilidade',
];

const ArrowRight = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

const CheckIcon = () => (
  <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);

const HomePage: React.FC = () => {
  return (
    <div className="bg-white overflow-x-hidden">
      <Header />

      <main>
        {/* ─── Hero ─── */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 pt-20">
          {/* Decorative blobs */}
          <div className="absolute top-1/4 left-[15%] w-[480px] h-[480px] bg-indigo-600/20 rounded-full blur-3xl animate-pulse-slow" />
          <div
            className="absolute bottom-1/4 right-[15%] w-[400px] h-[400px] bg-violet-600/20 rounded-full blur-3xl animate-pulse-slow"
            style={{ animationDelay: '2s' }}
          />

          <div className="relative z-10 container mx-auto px-4 text-center">
            <div className="inline-flex items-center gap-2 glass rounded-full px-4 py-2 mb-8 text-sm text-indigo-300">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Plataforma 100% online · Pronta para usar hoje
            </div>

            <h1 className="text-5xl md:text-7xl font-extrabold text-white leading-tight mb-6 animate-fade-in">
              Agende mais,{' '}
              <span className="gradient-text">trabalhe melhor</span>
            </h1>

            <p className="text-lg md:text-xl text-indigo-200 max-w-2xl mx-auto mb-10 animate-slide-up">
              Elimine tarefas manuais, reduza faltas e automatize o atendimento.
              A plataforma completa para gestão de agendamentos do seu negócio.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 gradient-brand text-white font-bold py-4 px-8 rounded-2xl transition-all duration-300 hover:opacity-90 hover:shadow-2xl hover:shadow-indigo-500/40 hover:-translate-y-1 text-lg"
              >
                Começar Gratuitamente
                <ArrowRight />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center gap-2 glass text-white font-semibold py-4 px-8 rounded-2xl transition-all duration-200 hover:bg-white/15 text-lg"
              >
                Como funciona
              </a>
            </div>

            <p className="mt-6 text-indigo-400 text-sm">
              Sem cartão de crédito · Configuração em minutos · Cancele quando quiser
            </p>
          </div>

          {/* Bottom wave */}
          <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
            <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full" fill="white" xmlns="http://www.w3.org/2000/svg">
              <path d="M0,80 C360,0 1080,0 1440,80 L1440,80 L0,80 Z" />
            </svg>
          </div>
        </section>

        {/* ─── Stats ─── */}
        <section className="py-16 bg-white">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto text-center">
              {stats.map((stat, i) => (
                <div key={i}>
                  <div className="text-5xl font-extrabold gradient-text mb-1">{stat.value}</div>
                  <p className="text-gray-500 font-medium">{stat.label}</p>
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
              <p className="mt-4 text-lg text-gray-500 max-w-xl mx-auto">
                Uma plataforma completa para automatizar e profissionalizar seus agendamentos.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {features.map((feature, i) => (
                <div
                  key={i}
                  className="group bg-white p-8 rounded-2xl shadow-sm border border-gray-100 card-lift"
                >
                  <div
                    className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center text-white mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    {feature.icon}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{feature.title}</h3>
                  <p className="text-gray-500 leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── How it works ─── */}
        <section id="how-it-works" className="py-24 bg-white">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <span className="section-label">Como funciona</span>
              <h2 className="section-title">Simples, rápido e eficiente</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-4xl mx-auto">
              {steps.map((step, i) => (
                <div key={i} className="text-center relative">
                  {i < steps.length - 1 && (
                    <div className="hidden md:block absolute top-7 left-[60%] w-[80%] h-px bg-gradient-to-r from-indigo-200 to-violet-200" />
                  )}
                  <div className="relative z-10 w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center text-white font-bold text-lg mx-auto mb-4 shadow-lg shadow-indigo-500/20">
                    {step.num}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ─── Pricing ─── */}
        <section id="pricing" className="py-24 bg-gray-50">
          <div className="container mx-auto px-4 text-center">
            <span className="section-label">Preços</span>
            <h2 className="section-title mb-4">Simples e transparente</h2>
            <p className="text-gray-500 mb-16">Um único plano com tudo incluído.</p>

            <div className="max-w-sm mx-auto gradient-brand rounded-3xl p-0.5 shadow-2xl shadow-indigo-500/30 hover:-translate-y-2 transition-transform duration-300">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-3xl p-8 text-white">
                <div className="inline-block bg-white/15 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-6">
                  Plano Completo
                </div>

                <div className="flex items-end justify-center gap-1 mb-2">
                  <span className="text-xl font-medium self-start mt-3">R$</span>
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
                      <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <CheckIcon />
                      </div>
                      <span className="text-sm">{item}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  to="/login"
                  className="block w-full bg-white text-indigo-700 hover:bg-indigo-50 font-bold py-4 px-6 rounded-2xl transition-all duration-200 hover:shadow-xl text-center"
                >
                  Assinar Agora
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ─── Bottom CTA ─── */}
        <section className="py-28 bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 relative overflow-hidden">
          <div className="absolute top-0 left-1/4 w-72 h-72 bg-indigo-600/20 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-violet-600/20 rounded-full blur-3xl" />
          <div className="relative z-10 container mx-auto px-4 text-center">
            <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6">
              Pronto para começar?
            </h2>
            <p className="text-indigo-200 text-lg mb-10 max-w-xl mx-auto">
              Junte-se a centenas de empresas que já automatizaram seus agendamentos com o Agendamento Fácil.
            </p>
            <Link
              to="/login"
              className="inline-flex items-center gap-2 gradient-brand text-white font-bold py-4 px-10 rounded-2xl transition-all duration-300 hover:opacity-90 hover:shadow-2xl hover:shadow-indigo-500/40 hover:-translate-y-1 text-lg"
            >
              Criar conta gratuitamente
              <ArrowRight />
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default HomePage;
