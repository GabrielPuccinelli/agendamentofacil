// src/pages/AuthPage.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js'; // Import Session type

export default function AuthPage() {
  const navigate = useNavigate();
  // Corrigido: Inicializa a sessão como null
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Pega a sessão inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
      if (session) {
        navigate('/dashboard');
      }
    });

    // 2. Escuta por mudanças na autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      // Redireciona no login/logout
      if (session) {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
     return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  // Mostra o formulário de login apenas se não houver sessão
  if (!session) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-100">
        <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-md">
          <Auth
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
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
                }
              }
            }}
          />
        </div>
      </div>
    )
  }

  // Se houver sessão, o useEffect já redirecionou. Mostra um loader.
  return <div className="flex justify-center items-center min-h-screen">Redirecionando...</div>;
}
