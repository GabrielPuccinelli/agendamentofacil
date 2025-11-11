// src/pages/OnboardingPage.tsx
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function OnboardingPage() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [memberSlug, setMemberSlug] = useState('');
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const formatSlug = (value: string) =>
    value.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado.");

      // Etapa 1: Criar a organização (agora permitido pela nova política RLS)
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName, slug: orgSlug, owner_id: user.id })
        .select('id')
        .single();

      if (orgError) throw new Error(`Erro ao criar empresa: ${orgError.message}`);

      // Etapa 2: Criar o membro administrador
      // A política "Allow admins to create members" permite esta ação
      const { error: memberError } = await supabase
        .from('members')
        .insert({
          user_id: user.id,
          organization_id: orgData.id,
          name: firstName,
          last_name: lastName,
          slug: memberSlug,
          phone: phone,
          birth_date: birthDate || null,
          address: address || null,
          role: 'admin',
          can_edit_profile: true,
        });

      if (memberError) throw new Error(`Erro ao criar seu perfil: ${memberError.message}`);

      navigate('/dashboard');

    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-2xl p-8 bg-white rounded-lg shadow-xl my-8">
        <h2 className="text-3xl font-bold text-center mb-2">Quase lá!</h2>
        <p className="text-center text-gray-600 mb-8">Complete seu cadastro para começar a usar o Agendamento Fácil.</p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="p-6 border rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Seus Dados Pessoais</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Nome" value={firstName} onChange={(e) => setFirstName(e.target.value)} required className="p-2 border rounded"/>
              <input type="text" placeholder="Sobrenome" value={lastName} onChange={(e) => setLastName(e.target.value)} required className="p-2 border rounded"/>
              <input type="date" placeholder="Data de Nascimento" value={birthDate} onChange={(e) => setBirthDate(e.target.value)} className="p-2 border rounded"/>
              <input type="tel" placeholder="Telefone / WhatsApp" value={phone} onChange={(e) => setPhone(e.target.value)} required className="p-2 border rounded"/>
              <input type="text" placeholder="Endereço (opcional)" value={address} onChange={(e) => setAddress(e.target.value)} className="md:col-span-2 p-2 border rounded"/>
              <div className="md:col-span-2">
                 <label htmlFor="memberSlug" className="block text-sm font-medium text-gray-700">Sua URL Pessoal</label>
                 <div className="flex items-center">
                   <span className="text-gray-500 p-2 bg-gray-100 border rounded-l">.../p/</span>
                   <input id="memberSlug" type="text" placeholder="seu-nome" value={memberSlug} onChange={(e) => setMemberSlug(formatSlug(e.target.value))} required className="p-2 border rounded-r w-full"/>
                 </div>
              </div>
            </div>
          </div>
          <div className="p-6 border rounded-lg">
            <h3 className="text-xl font-semibold mb-4">Dados da Empresa</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <input type="text" placeholder="Nome da Empresa" value={orgName} onChange={(e) => setOrgName(e.target.value)} required className="md:col-span-2 p-2 border rounded"/>
               <div>
                 <label htmlFor="orgSlug" className="block text-sm font-medium text-gray-700">URL da Empresa</label>
                 <div className="flex items-center">
                   <span className="text-gray-500 p-2 bg-gray-100 border rounded-l">.../e/</span>
                   <input id="orgSlug" type="text" placeholder="nome-da-empresa" value={orgSlug} onChange={(e) => setOrgSlug(formatSlug(e.target.value))} required className="p-2 border rounded-r w-full"/>
                 </div>
              </div>
            </div>
          </div>
          {error && <p className="text-sm text-center text-red-600 p-2 bg-red-50 rounded-md">{error}</p>}
          <button type="submit" disabled={loading} className="w-full py-3 px-4 font-bold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? 'Salvando...' : 'Finalizar Cadastro'}
          </button>
        </form>
      </div>
    </div>
  );
}
