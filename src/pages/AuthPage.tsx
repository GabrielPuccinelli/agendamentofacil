import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useNavigate, Link } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

const CalendarIcon = () => (
  <svg className="w-9 h-9 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);

export default function AuthPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Support ?redirect=/invite/xxx so invite links work after login
  const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/dashboard';

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) navigate(redirectTo);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) navigate(redirectTo);
    });

    return () => subscription.unsubscribe();
  }, [navigate, redirectTo]);

  if (loading || session) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-indigo-300 text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950">
      {/* Left decorative panel */}
      <div className="hidden lg:flex flex-col justify-center items-center flex-1 p-12 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-64 h-64 bg-indigo-600/25 rounded-full blur-3xl animate-pulse-slow" />
        <div
          className="absolute bottom-1/3 right-1/4 w-56 h-56 bg-violet-600/25 rounded-full blur-3xl animate-pulse-slow"
          style={{ animationDelay: '2s' }}
        />
        <div className="relative z-10 text-center max-w-sm">
          <div className="w-20 h-20 rounded-3xl gradient-brand flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-indigo-500/30">
            <CalendarIcon />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-4">
            Agendamento Fácil
          </h1>
          <p className="text-indigo-300 text-lg leading-relaxed">
            A plataforma completa para automatizar seus agendamentos e crescer seu negócio.
          </p>
          <div className="mt-10 flex flex-col gap-3 text-left">
            {['Agendamentos ilimitados', 'Múltiplos profissionais', 'Link de agendamento público'].map((item) => (
              <div key={item} className="flex items-center gap-3 glass rounded-xl px-4 py-3">
                <div className="w-5 h-5 rounded-full gradient-brand flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span className="text-indigo-200 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right auth panel */}
      <div className="flex flex-col justify-center items-center flex-1 p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="text-center mb-8 lg:hidden">
            <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-3 shadow-xl shadow-indigo-500/30">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white">Agendamento Fácil</h1>
          </div>

          <div className="glass rounded-3xl p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">Bem-vindo de volta</h2>
              <p className="text-indigo-300 text-sm mt-1">Entre na sua conta para continuar</p>
            </div>
            <Auth
              supabaseClient={supabase}
              appearance={{
                theme: ThemeSupa,
                variables: {
                  default: {
                    colors: {
                      brand: '#6366f1',
                      brandAccent: '#7c3aed',
                      brandButtonText: 'white',
                      defaultButtonBackground: 'rgba(255,255,255,0.08)',
                      defaultButtonBackgroundHover: 'rgba(255,255,255,0.15)',
                      defaultButtonBorder: 'rgba(255,255,255,0.15)',
                      defaultButtonText: 'white',
                      dividerBackground: 'rgba(255,255,255,0.1)',
                      inputBackground: 'rgba(255,255,255,0.06)',
                      inputBorder: 'rgba(255,255,255,0.15)',
                      inputBorderHover: 'rgba(99,102,241,0.6)',
                      inputBorderFocus: '#6366f1',
                      inputText: 'white',
                      inputLabelText: 'rgba(199,210,254,0.8)',
                      inputPlaceholder: 'rgba(167,139,250,0.4)',
                      messageText: 'rgba(199,210,254,0.9)',
                      anchorTextColor: '#a78bfa',
                      anchorTextHoverColor: '#c4b5fd',
                    },
                    borderWidths: {
                      buttonBorderWidth: '1px',
                      inputBorderWidth: '1px',
                    },
                    radii: {
                      borderRadiusButton: '12px',
                      buttonBorderRadius: '12px',
                      inputBorderRadius: '12px',
                    },
                    space: {
                      inputPadding: '12px 16px',
                      buttonPadding: '12px 20px',
                    },
                  },
                },
              }}
              providers={['google']}
              localization={{
                variables: {
                  sign_in: {
                    email_label: 'Seu email',
                    password_label: 'Sua senha',
                    button_label: 'Entrar',
                    social_provider_text: 'Entrar com {{provider}}',
                    link_text: 'Já tem uma conta? Entre',
                  },
                  sign_up: {
                    email_label: 'Seu email',
                    password_label: 'Sua senha',
                    button_label: 'Cadastrar',
                    social_provider_text: 'Cadastrar com {{provider}}',
                    link_text: 'Não tem uma conta? Cadastre-se',
                  },
                },
              }}
            />
          </div>

          <p className="text-center text-indigo-400 text-sm mt-6">
            <Link to="/" className="hover:text-white transition-colors duration-200">
              ← Voltar para a página inicial
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
