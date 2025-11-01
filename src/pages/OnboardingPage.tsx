// src/pages/OnboardingPage.tsx
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function OnboardingPage() {
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState(''); // Slug da Empresa
  const [memberName, setMemberName] = useState('');
  const [memberSlug, setMemberSlug] = useState(''); // Slug do Profissional
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Funções para formatar os slugs
  const handleOrgSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setOrgSlug(value);
  };
  const handleMemberSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    setMemberSlug(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Chamando a nova função com os 4 parâmetros
      const { error: rpcError } = await supabase.rpc('create_organization_and_member', {
        org_name: orgName,
        org_slug: orgSlug,
        member_name: memberName,
        member_slug: memberSlug,
      });

      if (rpcError) {
        if (rpcError.message.includes('duplicate key')) {
          setError('Essa URL (slug) já está em uso. Tente outra.');
        } else {
          throw rpcError;
        }
      } else {
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Erro ao criar organização:', err);
      setError(err.message || 'Ocorreu um erro.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-lg p-8 bg-white rounded-lg shadow-xl">
        <h2 className="text-3xl font-bold text-center mb-4">Bem-vindo!</h2>
        <p className="text-center text-gray-600 mb-8">Vamos configurar seu negócio.</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campo Nome da Empresa */}
          <div>
            <label htmlFor="orgName" className="block text-sm font-medium text-gray-700">
              Nome da Empresa
            </label>
            <input
              id="orgName" type="text" required value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border rounded-md"
              placeholder="Ex: Barbearia do Zé"
            />
          </div>

          {/* Campo Slug da Empresa */}
          <div>
            <label htmlFor="orgSlug" className="block text-sm font-medium text-gray-700">
              URL da Empresa (ex: .../e/sua-empresa)
            </label>
            <input
              id="orgSlug" type="text" required value={orgSlug}
              onChange={handleOrgSlugChange}
              className="mt-1 block w-full px-3 py-2 border rounded-md"
              placeholder="Ex: barbearia-do-ze"
            />
          </div>

          <hr className="my-4" />

          {/* Campo Seu Nome */}
          <div>
            <label htmlFor="memberName" className="block text-sm font-medium text-gray-700">
              Seu Nome (Profissional)
            </label>
            <input
              id="memberName" type="text" required value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border rounded-md"
              placeholder="Ex: Zé da Silva"
            />
          </div>

          {/* Campo Slug do Profissional */}
          <div>
            <label htmlFor="memberSlug" className="block text-sm font-medium text-gray-700">
              Sua URL Pessoal (ex: .../p/seu-nome)
            </label>
            <input
              id="memberSlug" type="text" required value={memberSlug}
              onChange={handleMemberSlugChange}
              className="mt-1 block w-full px-3 py-2 border rounded-md"
              placeholder="Ex: ze-barbeiro"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-2 px-4 border rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            {loading ? 'Salvando...' : 'Concluir Cadastro'}
          </button>
        </form>
      </div>
    </div>
  );
}