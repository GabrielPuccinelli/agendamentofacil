import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { MapPin, Clock, Camera, Phone, ArrowRight, Users, Scissors, Building2 } from 'lucide-react';

type Organization = {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  cover_url: string | null;
  description: string | null;
  whatsapp: string | null;
  address: string | null;
  opening_hours: string | null;
  instagram: string | null;
};
type Member = { id: string; name: string; slug: string; avatar_url: string | null };
type Service = { id: string; name: string; price: number; duration: number; category: string | null };

const Spinner = () => (
  <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950">
    <div className="flex flex-col items-center gap-4">
      <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      <p className="text-indigo-300 text-sm">Carregando...</p>
    </div>
  </div>
);

const getInitials = (name: string) =>
  name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');

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
  const [services, setServices] = useState<Service[]>([]);
  const [specialties, setSpecialties] = useState<Record<string, string[]>>({});

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
          .select('id, name, slug, logo_url, cover_url, description, whatsapp, address, opening_hours, instagram')
          .eq('slug', organizationSlug)
          .single();

        if (orgError || !orgData) throw new Error('Empresa não encontrada ou indisponível. Verifique o link ou tente novamente mais tarde.');
        setOrganization(orgData);

        const [{ data: membersData, error: membersError }, { data: servicesData }] = await Promise.all([
          supabase.from('members').select('id, name, slug, avatar_url').eq('organization_id', orgData.id),
          supabase.from('services').select('id, name, price, duration, category').eq('organization_id', orgData.id).order('name'),
        ]);

        if (membersError) throw new Error('Não foi possível carregar os profissionais desta empresa.');
        setMembers(membersData || []);
        setServices(servicesData || []);

        // Especialidades: serviços atribuídos a cada profissional
        const memberIds = (membersData || []).map((m) => m.id);
        if (memberIds.length > 0) {
          const { data: ms } = await supabase
            .from('member_services')
            .select('member_id, services(name)')
            .in('member_id', memberIds);
          const map: Record<string, string[]> = {};
          (ms || []).forEach((row: any) => {
            if (!row.services?.name) return;
            (map[row.member_id] = map[row.member_id] || []).push(row.services.name);
          });
          setSpecialties(map);
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [organizationSlug]);

  if (loading) return <Spinner />;

  if (error || !organization) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen bg-gray-50 gap-4 p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
          <Building2 className="w-7 h-7 text-red-400" />
        </div>
        <p className="text-xl font-semibold text-gray-800">{error || 'Página da empresa não encontrada.'}</p>
        <Link to="/" className="text-indigo-600 hover:text-indigo-700 text-sm font-medium transition-colors">
          ← Voltar ao início
        </Link>
      </div>
    );
  }

  const waNumber = organization.whatsapp?.replace(/\D/g, '');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Capa */}
      <div className="relative h-44 sm:h-56 gradient-brand overflow-hidden">
        {organization.cover_url ? (
          <img src={organization.cover_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <>
            <div className="absolute top-0 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-48 h-48 bg-white/10 rounded-full blur-3xl" />
          </>
        )}
      </div>

      {/* Cabeçalho da empresa */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 -mt-14 relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-start gap-4">
            <div className="w-20 h-20 rounded-2xl overflow-hidden border-4 border-white shadow-lg shrink-0 -mt-14 sm:-mt-16 bg-white">
              {organization.logo_url ? (
                <img src={organization.logo_url} alt={organization.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full gradient-brand flex items-center justify-center text-2xl font-bold text-white">
                  {getInitials(organization.name)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900">{organization.name}</h1>
              {organization.description && (
                <p className="text-gray-500 text-sm mt-2 leading-relaxed">{organization.description}</p>
              )}
              <div className="flex flex-wrap gap-x-5 gap-y-2 mt-4 text-sm">
                {organization.address && (
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <MapPin className="w-4 h-4 text-indigo-400 shrink-0" /> {organization.address}
                  </span>
                )}
                {organization.opening_hours && (
                  <span className="flex items-start gap-1.5 text-gray-500 whitespace-pre-line">
                    <Clock className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" /> {organization.opening_hours}
                  </span>
                )}
              </div>
            </div>
            <div className="flex sm:flex-col gap-2 shrink-0">
              {waNumber && (
                <a
                  href={`https://wa.me/55${waNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all shadow-md shadow-emerald-500/20"
                >
                  <Phone className="w-4 h-4" /> WhatsApp
                </a>
              )}
              {organization.instagram && (
                <a
                  href={`https://instagram.com/${organization.instagram}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-white border border-gray-200 hover:border-pink-300 hover:text-pink-500 text-gray-600 text-sm font-semibold px-4 py-2 rounded-xl transition-all"
                >
                  <Camera className="w-4 h-4" /> @{organization.instagram}
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        {/* Profissionais */}
        <section>
          <div className="flex items-center gap-2 mb-5">
            <Users className="w-5 h-5 text-indigo-500" />
            <h2 className="text-xl font-bold text-gray-900">Escolha um profissional</h2>
          </div>
          {members.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <p className="text-gray-400 font-medium">Nenhum profissional cadastrado ainda.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {members.map((member, i) => (
                <Link
                  key={member.id}
                  to={`/${organization.slug}/${member.slug}`}
                  className="group bg-white rounded-2xl shadow-sm border border-gray-100 p-6 text-center card-lift"
                >
                  {member.avatar_url ? (
                    <img
                      src={member.avatar_url}
                      alt={member.name}
                      className="w-20 h-20 rounded-2xl object-cover mx-auto mb-4 shadow-lg group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${gradients[i % gradients.length]} flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-lg group-hover:scale-105 transition-transform duration-300`}>
                      {getInitials(member.name)}
                    </div>
                  )}
                  <h3 className="text-lg font-bold text-gray-900">{member.name}</h3>
                  {(specialties[member.id] || []).length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1 mt-2">
                      {specialties[member.id].slice(0, 3).map((s) => (
                        <span key={s} className="text-[10px] bg-indigo-50 text-indigo-500 px-2 py-0.5 rounded-full font-medium">{s}</span>
                      ))}
                      {specialties[member.id].length > 3 && (
                        <span className="text-[10px] text-gray-400">+{specialties[member.id].length - 3}</span>
                      )}
                    </div>
                  )}
                  <p className="text-indigo-500 text-sm font-medium group-hover:text-indigo-700 transition-colors flex items-center justify-center gap-1 mt-3">
                    Agendar horário
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-200" />
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        {/* Serviços e preços */}
        {services.length > 0 && (
          <section>
            <div className="flex items-center gap-2 mb-5">
              <Scissors className="w-5 h-5 text-indigo-500" />
              <h2 className="text-xl font-bold text-gray-900">Serviços e preços</h2>
            </div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 divide-y divide-gray-50">
              {services.map((s) => (
                <div key={s.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm">{s.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {s.duration} min{s.category ? ` · ${s.category}` : ''}
                    </p>
                  </div>
                  <p className="font-bold text-indigo-600 shrink-0">
                    R$ {Number(s.price).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className="text-center text-xs text-gray-300 pt-4">
          Agendamento online por <Link to="/" className="text-indigo-300 hover:text-indigo-500 transition-colors font-medium">AgendaFácil</Link>
        </p>
      </div>
    </div>
  );
}
