// src/pages/AuthPage.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { useNavigate } from 'react-router-dom';
import type { Session } from '@supabase/supabase-js';

export default function AuthPage() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // A onAuthStateChange já nos dá a sessão inicial, então não precisamos do getSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setLoading(false); // Assim que recebemos a resposta, não estamos mais carregando
    });

    return () => subscription.unsubscribe();
  }, []); // O array de dependências vazio garante que isso só rode uma vez

  // Este segundo useEffect lida APENAS com o redirecionamento
  useEffect(() => {
    if (!loading && session) {
      navigate('/dashboard');
    }
  }, [session, loading, navigate]);


  if (loading) {
     return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  // Se não estiver carregando e não houver sessão, mostre o login
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
  
  // Se houver sessão, o useEffect já vai ter redirecionado. Mostra um loader enquanto isso.
  return <div className="flex justify-center items-center min-h-screen">Redirecionando...</div>;
}