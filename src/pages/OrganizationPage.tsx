// src/pages/OrganizationPage.tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

type Member = {
  id: string;
  name: string;
  slug: string;
};

type Org = {
  id: string;
  name: string;
};

export default function OrganizationPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organization, setOrganization] = useState<Org | null>(null);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    if (!slug) {
      setError('Empresa não encontrada.');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        // 1. Busca a empresa pelo slug
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .select('id, name')
          .eq('slug', slug)
          .single();

        if (orgError) throw new Error('Empresa não encontrada ou indisponível. Verifique o link ou tente novamente mais tarde.');
        setOrganization(orgData);

        // 2. Busca todos os membros (profissionais) dessa empresa
        const { data: membersData, error: membersError } = await supabase
          .from('members')
          .select('id, name, slug')
          .eq('organization_id', orgData.id);

        if (membersError) throw new Error('Erro ao buscar profissionais.');

        // --- A LÓGICA QUE VOCÊ PEDIU ---
        if (membersData && membersData.length === 1) {
          // CENÁRIO 1: Autônomo (1 profissional)
          navigate(`/p/${membersData[0].slug}`, { replace: true });
        } else if (membersData && membersData.length > 1) {
          // CENÁRIO 2: Empresa (vários profissionais)
          setMembers(membersData);
        } else {
          throw new Error('Nenhum profissional disponível nesta empresa.');
        }
        
        // Se tudo deu certo, remove o loading
        setLoading(false);

      } catch (err: any) {
        // Se qualquer 'throw' acontecer, caímos aqui
        setError(err.message);
        setLoading(false); // Remove o loading em caso de erro
      }
    };

    fetchData();
  }, [slug, navigate]);

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen"><h1 className="text-2xl">Carregando...</h1></div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen"><h1 className="text-2xl text-red-600">{error}</h1></div>;
  }

  // Este estado (lista de profissionais) só é renderizado se houver mais de 1
  return (
    <div className="max-w-md mx-auto p-8">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold">{organization?.name}</h1>
        <p className="text-lg text-gray-600 mt-4">
          Com qual profissional você gostaria de agendar?
        </p>
      </div>
      
      <div className="space-y-4">
        {members.map(member => (
          <Link
            key={member.id}
            to={`/p/${member.slug}`} // Link para a página do profissional
            className="block p-6 bg-white border rounded-lg shadow-md hover:bg-gray-50 text-center"
          >
            <span className="text-2xl font-semibold text-blue-700">{member.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}