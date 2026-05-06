import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useQuery, useMutation, useQueryClient } from 'react-query';

type Service = {
  id: string;
  name: string;
  description?: string | null;
  duration: number;
  price: number;
  organization_id: string;
};

type Props = {
  memberId: string;
  organizationId?: string;
  canEditPrice?: boolean;
};

// ── Icons ──────────────────────────────────────────────────────────────────
const PlusIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
  </svg>
);
const EditIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
  </svg>
);
const TrashIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);
const CheckIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
  </svg>
);
const ClockIcon = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
// ────────────────────────────────────────────────────────────────────────────

type EditingState = {
  id: string;
  name: string;
  description: string;
  duration: number;
  price: number;
};

export default function ManageServices({ memberId, organizationId, canEditPrice = true }: Props) {
  const queryClient = useQueryClient();

  // Create form state
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [newDuration, setNewDuration] = useState(30);
  const [newPrice, setNewPrice] = useState(0);

  // Inline edit state
  const [editing, setEditing] = useState<EditingState | null>(null);

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: allServices, isLoading: isLoadingServices } = useQuery(
    ['services', organizationId],
    async () => {
      let orgId = organizationId;
      if (!orgId) {
        const { data: md, error: me } = await supabase
          .from('members')
          .select('organization_id')
          .eq('id', memberId)
          .single();
        if (me) throw new Error(me.message);
        orgId = md.organization_id;
      }
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .eq('organization_id', orgId)
        .order('name');
      if (error) throw new Error(error.message);
      return data as Service[];
    },
    { enabled: !!organizationId || !!memberId }
  );

  const { data: memberServices, isLoading: isLoadingMemberServices } = useQuery(
    ['memberServices', memberId],
    async () => {
      const { data, error } = await supabase
        .from('member_services')
        .select('id, service_id')
        .eq('member_id', memberId);
      if (error) throw new Error(error.message);
      return new Set(data.map((ms) => ms.service_id));
    },
    { enabled: !!memberId }
  );

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation(
    async () => {
      if (!organizationId) throw new Error('Apenas admins podem criar serviços.');
      const { data, error } = await supabase
        .from('services')
        .insert({ name: newName, description: newDescription || null, duration: newDuration, price: newPrice, organization_id: organizationId })
        .select()
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['services', organizationId]);
        setNewName(''); setNewDescription(''); setNewDuration(30); setNewPrice(0);
        setShowCreate(false);
      },
    }
  );

  const updateMutation = useMutation(
    async (s: EditingState) => {
      const payload: Partial<Service> = { name: s.name, description: s.description || null, duration: s.duration };
      if (canEditPrice) payload.price = s.price;
      const { error } = await supabase.from('services').update(payload).eq('id', s.id);
      if (error) throw new Error(error.message);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['services', organizationId]);
        setEditing(null);
      },
    }
  );

  const deleteMutation = useMutation(
    async (serviceId: string) => {
      await supabase.from('member_services').delete().eq('service_id', serviceId);
      const { error } = await supabase.from('services').delete().eq('id', serviceId);
      if (error) throw new Error(error.message);
    },
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['services', organizationId]);
        queryClient.invalidateQueries(['memberServices', memberId]);
      },
    }
  );

  const toggleMutation = useMutation(
    async ({ serviceId, isAssigned }: { serviceId: string; isAssigned: boolean }) => {
      if (isAssigned) {
        const { error } = await supabase.from('member_services').delete().match({ member_id: memberId, service_id: serviceId });
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from('member_services').insert({ member_id: memberId, service_id: serviceId });
        if (error) throw new Error(error.message);
      }
    },
    { onSuccess: () => queryClient.invalidateQueries(['memberServices', memberId]) }
  );

  const isLoading = isLoadingServices || isLoadingMemberServices;

  const startEdit = (s: Service) =>
    setEditing({ id: s.id, name: s.name, description: s.description || '', duration: s.duration, price: s.price });

  const handleDelete = (id: string) => {
    if (window.confirm('Excluir este serviço? Ele será removido de todos os profissionais.')) {
      deleteMutation.mutate(id);
    }
  };

  const inputCls = 'w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Serviços</h2>
          <p className="text-sm text-gray-400 mt-0.5">
            {organizationId ? 'Gerencie os serviços da sua empresa' : 'Selecione os serviços que você oferece'}
          </p>
        </div>
        {organizationId && (
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 gradient-brand text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-all shadow-md shadow-indigo-500/20"
          >
            <PlusIcon />
            Novo Serviço
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && organizationId && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-5 mb-6">
          <h3 className="font-semibold text-indigo-800 mb-4">Criar novo serviço</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome do Serviço *</label>
              <input type="text" placeholder="Ex: Corte Feminino" value={newName} onChange={(e) => setNewName(e.target.value)} className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Descrição (opcional)</label>
              <textarea
                placeholder="Descreva o serviço: o que está incluso, como é realizado, etc."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Duração (minutos) *</label>
              <input type="number" min={5} placeholder="30" value={newDuration} onChange={(e) => setNewDuration(parseInt(e.target.value) || 0)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Preço (R$) *</label>
              <input type="number" min={0} step="0.01" placeholder="50.00" value={newPrice} onChange={(e) => setNewPrice(parseFloat(e.target.value) || 0)} className={inputCls} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
              Cancelar
            </button>
            <button
              onClick={() => createMutation.mutate()}
              disabled={!newName || createMutation.isLoading}
              className="px-4 py-2 text-sm font-semibold text-white gradient-brand rounded-xl hover:opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
            >
              {createMutation.isLoading ? 'Criando...' : <><PlusIcon /> Criar Serviço</>}
            </button>
          </div>
          {createMutation.isError && (
            <p className="text-red-600 text-sm mt-2">{(createMutation.error as Error).message}</p>
          )}
        </div>
      )}

      {/* Services list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : !allServices || allServices.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="font-medium">Nenhum serviço cadastrado ainda.</p>
          {organizationId && <p className="text-sm mt-1">Clique em "Novo Serviço" para começar.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {allServices.map((service) => {
            const isAssigned = memberServices?.has(service.id) ?? false;
            const isEditing = editing?.id === service.id;

            return (
              <div
                key={service.id}
                className={`bg-white border-2 rounded-2xl overflow-hidden transition-all duration-200 ${
                  isAssigned ? 'border-indigo-200' : 'border-gray-100'
                }`}
              >
                {/* View mode */}
                {!isEditing ? (
                  <div className="p-4 flex items-start gap-4">
                    {/* Assign toggle */}
                    <button
                      onClick={() => toggleMutation.mutate({ serviceId: service.id, isAssigned })}
                      disabled={toggleMutation.isLoading}
                      className={`mt-0.5 w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-all ${
                        isAssigned
                          ? 'gradient-brand border-indigo-500 text-white'
                          : 'border-gray-300 hover:border-indigo-400'
                      }`}
                      title={isAssigned ? 'Remover meu atendimento' : 'Adicionar ao meu atendimento'}
                    >
                      {isAssigned && <CheckIcon />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-gray-900">{service.name}</p>
                        {isAssigned && (
                          <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                            Meu atendimento
                          </span>
                        )}
                      </div>
                      {service.description && (
                        <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{service.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2">
                        <span className="flex items-center gap-1 text-sm text-gray-400">
                          <ClockIcon /> {service.duration} min
                        </span>
                        <span className="text-sm font-bold text-emerald-600">R$ {service.price.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Admin actions */}
                    {organizationId && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => startEdit(service)}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                          title="Editar"
                        >
                          <EditIcon />
                        </button>
                        <button
                          onClick={() => handleDelete(service.id)}
                          disabled={deleteMutation.isLoading}
                          className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                          title="Excluir"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  /* Edit mode */
                  <div className="p-4 bg-indigo-50/50">
                    <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider mb-3">Editando serviço</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
                        <input
                          type="text" value={editing!.name}
                          onChange={(e) => setEditing((ed) => ed && { ...ed, name: e.target.value })}
                          className={inputCls}
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Descrição</label>
                        <textarea
                          value={editing!.description}
                          onChange={(e) => setEditing((ed) => ed && { ...ed, description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Duração (min)</label>
                        <input
                          type="number" min={5} value={editing!.duration}
                          onChange={(e) => setEditing((ed) => ed && { ...ed, duration: parseInt(e.target.value) || 0 })}
                          className={inputCls}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Preço (R$) {!canEditPrice && <span className="text-gray-400 font-normal">(sem permissão)</span>}
                        </label>
                        <input
                          type="number" min={0} step="0.01" value={editing!.price}
                          disabled={!canEditPrice}
                          onChange={(e) => setEditing((ed) => ed && { ...ed, price: parseFloat(e.target.value) || 0 })}
                          className={`${inputCls} ${!canEditPrice ? 'bg-gray-100 cursor-not-allowed text-gray-400' : ''}`}
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditing(null)} className="px-3 py-2 text-sm text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all">
                        Cancelar
                      </button>
                      <button
                        onClick={() => updateMutation.mutate(editing!)}
                        disabled={updateMutation.isLoading}
                        className="px-4 py-2 text-sm font-semibold text-white gradient-brand rounded-xl hover:opacity-90 disabled:opacity-50 transition-all"
                      >
                        {updateMutation.isLoading ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                    {updateMutation.isError && (
                      <p className="text-red-600 text-sm mt-2">{(updateMutation.error as Error).message}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {toggleMutation.isError && (
        <p className="text-red-600 text-sm mt-3">{(toggleMutation.error as Error).message}</p>
      )}
    </div>
  );
}
