import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import AppShell from '../components/AppShell';
import type { UserProfile, MemberLink } from '../components/Sidebar';

type Tab = 'personal' | 'address' | 'documents';

const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
  {
    key: 'personal',
    label: 'Dados Pessoais',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    key: 'documents',
    label: 'Documentos',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    key: 'address',
    label: 'Endereço',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

const Field = ({
  label, id, type = 'text', placeholder, value, onChange, readOnly = false,
}: {
  label: string; id: string; type?: string; placeholder?: string;
  value: string; onChange?: (v: string) => void; readOnly?: boolean;
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">{label}</label>
    <input
      id={id} type={type} placeholder={placeholder} value={value} readOnly={readOnly}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      className={`block w-full px-4 py-3 border rounded-xl text-sm transition-all ${
        readOnly
          ? 'bg-gray-50 border-gray-100 text-gray-400 cursor-not-allowed'
          : 'border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
      }`}
    />
  </div>
);

const formatCPF = (v: string) =>
  v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14);

const formatPhone = (v: string) =>
  v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);

const formatCEP = (v: string) =>
  v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);

const UF_LIST = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'];

const EditProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('personal');
  const [feedback, setFeedback] = useState('');
  const [isError, setIsError] = useState(false);

  // Avatar
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);

  // Personal
  const [name, setName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [gender, setGender] = useState('');
  const [email, setEmail] = useState('');

  // Documents
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');

  // Address
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Sidebar data
  const [isAdmin, setIsAdmin] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile>(null);
  const [membersList, setMembersList] = useState<MemberLink[]>([]);
  const [organizationSlug, setOrganizationSlug] = useState<string | null>(null);
  const [organizationName, setOrganizationName] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); return; }

      setEmail(user.email || '');

      const { data: member, error } = await supabase
        .from('members')
        .select('*')
        .eq('user_id', user.id)
        .order('organization_id', { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (error || !member) { navigate('/dashboard'); return; }

      setIsAdmin(member.role === 'admin');
      setName(member.name || '');
      setLastName(member.last_name || '');
      setPhone(member.phone || '');
      setBirthDate(member.birth_date || '');
      setGender(member.gender || '');
      setCpf(member.cpf || '');
      setRg(member.rg || '');
      setCep(member.cep || '');
      setAddress(member.address || '');
      setAddressNumber(member.address_number || '');
      setCity(member.city || '');
      setState(member.state || '');
      setAvatarUrl(member.avatar_url || '');

      setUserProfile({ name: member.name, phone: member.phone, avatarUrl: member.avatar_url || '' });

      const { data: orgData } = await supabase
        .from('organizations')
        .select('slug, name')
        .eq('id', member.organization_id)
        .single();
      setOrganizationSlug(orgData?.slug || null);
      setOrganizationName(orgData?.name || null);

      const { data: membersData } = await supabase
        .from('members')
        .select('id, name, slug')
        .eq('organization_id', member.organization_id);
      setMembersList(membersData || []);

      setLoading(false);
    };
    fetchProfile();
  }, [navigate]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      const file = e.target.files[0];
      setNewAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  const fetchAddressByCep = async (raw: string) => {
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress(data.logradouro || '');
        setCity(data.localidade || '');
        setState(data.uf || '');
      }
    } catch {}
  };

  const handleCepChange = (v: string) => {
    const formatted = formatCEP(v);
    setCep(formatted);
    if (formatted.replace(/\D/g, '').length === 8) fetchAddressByCep(formatted);
  };

  const handleLogout = async () => { await supabase.auth.signOut(); navigate('/'); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setFeedback('');
    setIsError(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }

    let publicAvatarUrl = avatarUrl;

    if (newAvatarFile) {
      const fileExt = newAvatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, newAvatarFile);

      if (uploadError) {
        setFeedback(`Erro ao enviar foto: ${uploadError.message}`);
        setIsError(true);
        setSaving(false);
        return;
      }
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(fileName);
      publicAvatarUrl = urlData.publicUrl;
    }

    const { error: updateError } = await supabase
      .from('members')
      .update({
        name,
        last_name: lastName,
        phone,
        birth_date: birthDate || null,
        gender: gender || null,
        cpf: cpf || null,
        rg: rg || null,
        cep: cep || null,
        address: address || null,
        address_number: addressNumber || null,
        city: city || null,
        state: state || null,
        avatar_url: publicAvatarUrl,
      })
      .eq('user_id', user.id);

    if (updateError) {
      setFeedback(`Erro ao salvar: ${updateError.message}`);
      setIsError(true);
    } else {
      setFeedback('Perfil atualizado com sucesso!');
      setIsError(false);
      setUserProfile((p) => p ? { ...p, name, avatarUrl: publicAvatarUrl } : p);
      setTimeout(() => setFeedback(''), 3000);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950">
        <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <AppShell
      userProfile={userProfile}
      isAdmin={isAdmin}
      members={membersList}
      organizationSlug={organizationSlug}
      organizationName={organizationName}
      onLogout={handleLogout}
    >
      <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Editar Perfil</h1>
              <p className="text-gray-500 text-sm mt-1">Mantenha suas informações sempre atualizadas.</p>
            </div>
            <Link to="/dashboard" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors flex items-center gap-1">
              ← Voltar
            </Link>
          </div>

          {/* Avatar */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <div className="flex items-center gap-5">
              <div className="relative">
                <img
                  src={avatarUrl || `https://ui-avatars.com/api/?name=${name}&background=6366f1&color=fff`}
                  alt="Avatar"
                  className="w-20 h-20 rounded-2xl object-cover border-4 border-indigo-100"
                />
                <label
                  htmlFor="avatar-upload"
                  className="absolute -bottom-2 -right-2 w-8 h-8 gradient-brand rounded-xl flex items-center justify-center cursor-pointer shadow-md hover:opacity-90 transition-opacity"
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </label>
                <input type="file" id="avatar-upload" className="hidden" accept="image/png,image/jpeg" onChange={handleAvatarChange} />
              </div>
              <div>
                <p className="font-semibold text-gray-900">{name} {lastName}</p>
                <p className="text-sm text-gray-400">{email}</p>
                <p className="text-xs text-gray-400 mt-1">PNG ou JPG · máx. 2MB</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 p-1 rounded-2xl mb-6">
            {TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  tab === t.key
                    ? 'bg-white shadow-sm text-indigo-600'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.icon}
                <span className="hidden sm:block">{t.label}</span>
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">

              {/* Tab: Dados Pessoais */}
              {tab === 'personal' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Nome" id="name" placeholder="João" value={name} onChange={setName} />
                    <Field label="Sobrenome" id="lastName" placeholder="Silva" value={lastName} onChange={setLastName} />
                  </div>
                  <Field label="E-mail" id="email" type="email" value={email} readOnly />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field
                      label="Telefone / WhatsApp" id="phone" type="tel" placeholder="(11) 99999-9999"
                      value={phone} onChange={(v) => setPhone(formatPhone(v))}
                    />
                    <Field label="Data de Nascimento" id="birthDate" type="date" value={birthDate} onChange={setBirthDate} />
                  </div>
                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1.5">Sexo</label>
                    <select
                      id="gender" value={gender} onChange={(e) => setGender(e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                    >
                      <option value="">Prefiro não informar</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="O">Outro</option>
                    </select>
                  </div>
                </>
              )}

              {/* Tab: Documentos */}
              {tab === 'documents' && (
                <>
                  <div className="p-4 bg-indigo-50 rounded-xl text-sm text-indigo-700 flex items-start gap-3">
                    <svg className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Seus documentos são armazenados com segurança e não são exibidos publicamente.
                  </div>
                  <Field
                    label="CPF" id="cpf" placeholder="000.000.000-00"
                    value={cpf} onChange={(v) => setCpf(formatCPF(v))}
                  />
                  <Field label="RG" id="rg" placeholder="12.345.678-9" value={rg} onChange={setRg} />
                </>
              )}

              {/* Tab: Endereço */}
              {tab === 'address' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-1.5">CEP</label>
                      <input
                        id="cep" type="text" placeholder="00000-000" value={cep}
                        onChange={(e) => handleCepChange(e.target.value)}
                        className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                      <p className="text-xs text-indigo-500 mt-1">Preenchimento automático</p>
                    </div>
                    <Field label="Número" id="addressNumber" placeholder="123" value={addressNumber} onChange={setAddressNumber} />
                  </div>
                  <Field label="Logradouro" id="address" placeholder="Rua das Flores" value={address} onChange={setAddress} />
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="Cidade" id="city" placeholder="São Paulo" value={city} onChange={setCity} />
                    <div>
                      <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                      <select
                        id="state" value={state} onChange={(e) => setState(e.target.value)}
                        className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                      >
                        <option value="">Selecione</option>
                        {UF_LIST.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
                      </select>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Feedback */}
            {feedback && (
              <div className={`mt-4 p-3 rounded-xl text-sm text-center font-medium ${
                isError ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-600 border border-green-200'
              }`} data-testid="feedback-message">
                {feedback}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <Link
                to="/dashboard"
                className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all"
              >
                Cancelar
              </Link>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2.5 text-sm font-bold text-white gradient-brand rounded-xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
    </AppShell>
  );
};

export default EditProfilePage;
