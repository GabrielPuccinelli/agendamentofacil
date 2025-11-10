// src/pages/OrganizationPage.tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

type Organization = { id: string; name: string; slug: string; };
type Member = { id: string; name: string; slug: string; };

export default function OrganizationPage() {
  const { organizationSlug } = useParams<{ organizationSlug: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!organizationSlug) {
      setError('Nenhuma empresa encontrada.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name, slug')
          .eq('slug', organizationSlug)
          .single();

        if (orgError || !orgData) throw new Error('Empresa não encontrada ou indisponível. Verifique o link ou tente novamente mais tarde.');

        setOrganization(orgData);

        const { data: membersData, error: membersError } = await supabase
          .from('members')
          .select('id, name, slug')
          .eq('organization_id', orgData.id);
        
        if (membersError) throw new Error('Não foi possível carregar os profissionais desta empresa.');

        setMembers(membersData || []);

      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [organizationSlug]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><h1 className="text-2xl">Carregando...</h1></div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen"><h1 className="text-2xl text-red-600">{error}</h1></div>;
  }

  if (!organization) {
     return <div className="flex justify-center items-center min-h-screen"><h1 className="text-2xl text-gray-500">Página da empresa não encontrada.</h1></div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold">{organization.name}</h1>
        <p className="text-xl text-gray-600 mt-2">Nossos Profissionais</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {members.map(member => (
          // CORRIGIDO: O Link agora usa a nova estrutura de URL
          <Link
            key={member.id}
            to={`/e/${organization.slug}/p/${member.slug}`}
            className="block p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-bold text-gray-800">{member.name}</h2>
            <p className="mt-2 text-blue-600 hover:underline">Ver agenda &rarr;</p>
          </Link>
        ))}
        {members.length === 0 && (
          <p className="col-span-full text-center text-gray-500">Nenhum profissional cadastrado nesta empresa ainda.</p>
        )}
      </div>
    </div>
  );
}
