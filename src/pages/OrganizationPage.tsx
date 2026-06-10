import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';

type Organization = { id: string; name: string; slug: string; };
type Member = { id: string; name: string; slug: string; };

const Spinner = () => (
  <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      <p className="text-indigo-300 text-sm">Carregando...</p>
    </div>
  </div>
);

const getInitials = (name: string) =>
  name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

const gradients = [
  'from-indigo-500 to-blue-500',
  'from-violet-500 to-purple-500',
  'from-cyan-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-amber-500 to-orange-500',
  'from-emerald-500 to-green-500',
];

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

  if (loading) return <Spinner />;

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 gap-4 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
          <svg className="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-xl font-semibold text-gray-800">{error}</p>
        <Link to="/" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors">
          ← Voltar ao início
        </Link>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50">
        <p className="text-xl text-gray-500">Página da empresa não encontrada.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header banner */}
      <div className="gradient-brand py-16 px-4 text-center relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="w-20 h-20 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center mx-auto mb-4 text-3xl font-bold text-white">
            {getInitials(organization.name)}
          </div>
          <h1 className="text-4xl font-extrabold text-white">{organization.name}</h1>
          <p className="text-indigo-200 mt-2 text-lg">Nossos Profissionais</p>
        </div>
      </div>

      {/* Members grid */}
      <div className="max-w-4xl mx-auto px-4 py-12">
        {members.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">Nenhum profissional cadastrado nesta empresa ainda.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {members.map((member, i) => (
              <Link
                key={member.id}
                to={`/${organization.slug}/${member.slug}`}
                className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center card-lift"
              >
                <div
                  className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg group-hover:scale-105 transition-transform duration-300`}
                >
                  {getInitials(member.name)}
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-1">{member.name}</h2>
                <p className="text-indigo-500 text-sm font-medium group-hover:text-indigo-700 transition-colors flex items-center justify-center gap-1">
                  Ver agenda
                  <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
