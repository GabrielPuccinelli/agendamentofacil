// src/pages/AuthPage.tsx
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '../lib/supabaseClient' // Importa nossa conexão
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export default function AuthPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        // SÓ navega se houver uma sessão
        navigate('/dashboard');
      } 
      // Se a sessão for nula, não faz nada.
    });

    return () => {
      subscription?.unsubscribe();
    };
    // Array vazio para rodar APENAS UMA VEZ
  }, [navigate]); 

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 bg-white rounded-lg shadow-xl">
        <h2 className="text-3xl font-bold text-center mb-6 text-gray-800">
          AgendamentoFacil
        </h2>
        <p className="text-center text-gray-600 mb-8">
          Acesse sua conta ou crie um novo perfil
        </p>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google']}
          localization={{
            variables: {
              sign_in: { 
                email_label: 'Seu email', 
                password_label: 'Sua senha', 
                button_label: 'Entrar' 
              },
              sign_up: { 
                email_label: 'Seu email', 
                password_label: 'Crie uma senha', 
                button_label: 'Cadastrar' 
              },
              forgotten_password: {
                link_text: 'Esqueceu sua senha?',
                email_label: 'Email',
                button_label: 'Enviar instruções'
              }
            },
          }}
        />
      </div>
    </div>
  );
}