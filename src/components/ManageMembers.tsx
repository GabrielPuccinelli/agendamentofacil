// src/components/ManageMembers.tsx
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Link, useNavigate } from 'react-router-dom';

// Define o "formato" de um membro
type Member = {
  id: string;
  name: string;
  slug: string;
  role: string;
  user_id: string | null;
  can_edit_profile: boolean;
};

type Props = {
  organizationId: string;
};

export default function ManageMembers({ organizationId }: Props) {
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // READ (Ler membros da organização)
  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('organization_id', organizationId);

      if (error) {
        console.error('Erro ao buscar membros:', error);
        setError('Não foi possível carregar a equipe.');
      } else {
        setMembers(data || []);
      }
      setLoading(false);
    };

    fetchMembers();
  }, [organizationId]);

  // Função para formatar o 'slug' (URL amigável)
  const handleSlugChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '');
    setSlug(value);
  };

  // CREATE (Adicionar novo funcionário)
  // Nota: Esta é uma versão simplificada. O funcionário é 'staff' e não tem
  // um login de acesso próprio (user_id é nulo).
  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const { data, error } = await supabase
      .from('members')
      .insert({
        name,
        slug,
        organization_id: organizationId,
        role: 'staff', // Todo novo membro é 'staff'
      })
      .select()
      .single();

    if (error) {
      if (error.message.includes('duplicate key') && error.message.includes('slug')) {
        setError('Essa URL (slug) já está em uso por outro profissional.');
      } else {
        console.error('Erro ao criar membro:', error);
        setError('Erro ao criar membro.');
      }
    } else if (data) {
      setMembers([...members, data]);
      setName('');
      setSlug('');
      // Redireciona para o dashboard do novo membro
      navigate(`/member/${data.id}/dashboard`);
    }
  };

  // DELETE (Remover funcionário)
  const handleDeleteMember = async (memberId: string) => {
    if (!window.confirm('Tem certeza que quer remover este membro da equipe?')) {
      return;
    }

    const { error } = await supabase.from('members').delete().eq('id', memberId);

    if (error) {
      console.error('Erro ao excluir:', error);
      setError('Não foi possível remover o membro.');
    } else {
      setMembers(members.filter((m) => m.id !== memberId));
    }
  };

  const handleTogglePermission = async (memberId: string, currentStatus: boolean) => {
    const { error } = await supabase
      .from('members')
      .update({ can_edit_profile: !currentStatus })
      .eq('id', memberId);

    if (error) {
      setError('Erro ao atualizar permissão.');
    } else {
      setMembers(members.map(m =>
        m.id === memberId ? { ...m, can_edit_profile: !currentStatus } : m
      ));
    }
  };

  if (loading) return <p>Carregando equipe...</p>;

  return (
    <div className="mt-10">
      <h2 className="text-2xl font-bold">Gerenciar Equipe (Funcionários)</h2>
      
      {/* Formulário de Criação (CREATE) */}
      <form onSubmit={handleCreateMember} className="mt-4 p-4 border rounded-md bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-4">
          <div>
            <label htmlFor="memberName" className="block text-sm font-medium text-gray-700">
              Nome do Funcionário
            </label>
            <input
              type="text" id="memberName" placeholder="Ex: Maria Souza" required
              value={name} onChange={(e) => setName(e.target.value)}
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div>
            <label htmlFor="memberSlug" className="block text-sm font-medium text-gray-700">
              URL Pública do Funcionário
            </label>
            <input
              type="text" id="memberSlug" placeholder="Ex: maria-manicure" required
              value={slug} onChange={handleSlugChange}
              className="mt-1 p-2 block w-full border border-gray-300 rounded-md shadow-sm"
            />
          </div>
          <div className="self-end">
            <button type="submit" className="w-full px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
              Adicionar à Equipe
            </button>
          </div>
        </div>
        {error && <p className="text-red-600 mt-2">{error}</p>}
      </form>

      {/* Lista de Membros (READ / DELETE) */}
      <div className="mt-6 space-y-3">
        {members.map((member) => (
          <div key={member.id} className="flex justify-between items-center p-3 border rounded-md shadow-sm bg-white transition-all hover:shadow-lg">
            <Link to={`/member/${member.id}/dashboard`} className="flex-grow">
              <div>
                <p className="font-semibold">{member.name} ({member.role})</p>
                <p className="text-sm text-gray-600">
                  Link Público: /p/{member.slug}
                </p>
              </div>
            </Link>
            {member.role !== 'admin' ? (
              <div className="flex items-center">
                <div className="flex items-center mr-4">
                  <input
                    type="checkbox"
                    id={`edit-permission-${member.id}`}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={member.can_edit_profile}
                    onChange={() => handleTogglePermission(member.id, member.can_edit_profile)}
                  />
                  <label htmlFor={`edit-permission-${member.id}`} className="ml-2 text-sm text-gray-600">
                    Pode Editar
                  </label>
                </div>
                <Link to={`/member/${member.id}/dashboard`} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 mr-2 text-sm">
                  Gerenciar
                </Link>
                <button
                  onClick={() => handleDeleteMember(member.id)}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                >
                  Remover
                </button>
              </div>
            ) : (
              <span className="text-sm text-gray-500 font-medium">(Você)</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}