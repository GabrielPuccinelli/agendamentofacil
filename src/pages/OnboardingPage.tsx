import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

type Step = 'personal' | 'address' | 'company';

const STEPS: { key: Step; label: string }[] = [
  { key: 'personal', label: 'Dados Pessoais' },
  { key: 'address', label: 'Endereço' },
  { key: 'company', label: 'Empresa' },
];

const InputField = ({
  label, id, type = 'text', placeholder, value, onChange, required = false, maxLength,
}: {
  label: string; id: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; required?: boolean; maxLength?: number;
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1.5">
      {label} {required && <span className="text-red-400">*</span>}
    </label>
    <input
      id={id} type={type} placeholder={placeholder} value={value} required={required}
      maxLength={maxLength}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
    />
  </div>
);

const formatCPF = (v: string) =>
  v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14);

const formatPhone = (v: string) =>
  v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);

const formatCEP = (v: string) =>
  v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);

const formatSlug = (v: string) =>
  v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('personal');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Dados pessoais
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [cpf, setCpf] = useState('');
  const [rg, setRg] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('');
  const [memberSlug, setMemberSlug] = useState('');

  // Endereço
  const [cep, setCep] = useState('');
  const [address, setAddress] = useState('');
  const [addressNumber, setAddressNumber] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');

  // Empresa
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');

  const stepIndex = STEPS.findIndex((s) => s.key === step);

  const fetchAddressByCep = async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, '');
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step === 'personal') { setStep('address'); return; }
    if (step === 'address') { setStep('company'); return; }

    setLoading(true);
    setError('');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .insert({ name: orgName, slug: orgSlug, owner_id: user.id })
        .select('id')
        .single();
      if (orgError) throw new Error(`Erro ao criar empresa: ${orgError.message}`);

      const { error: memberError } = await supabase.from('members').insert({
        user_id: user.id,
        organization_id: orgData.id,
        name: firstName,
        last_name: lastName,
        slug: memberSlug,
        phone,
        birth_date: birthDate || null,
        cpf: cpf || null,
        rg: rg || null,
        gender: gender || null,
        cep: cep || null,
        address: address || null,
        address_number: addressNumber || null,
        city: city || null,
        state: state || null,
        role: 'admin',
        can_edit_profile: true,
        can_edit_price: true,
      });
      if (memberError) throw new Error(`Erro ao criar perfil: ${memberError.message}`);

      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/30">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Quase lá!</h1>
          <p className="text-indigo-300 mt-2">Complete seu cadastro para começar a usar o Agendamento Fácil.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.key} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                s.key === step
                  ? 'gradient-brand text-white shadow-lg shadow-indigo-500/30'
                  : i < stepIndex
                  ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                  : 'bg-white/10 text-indigo-400'
              }`}>
                {i < stepIndex ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center text-xs">{i + 1}</span>
                )}
                <span className="hidden sm:block">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-8 h-px mx-1 ${i < stepIndex ? 'bg-green-400/50' : 'bg-white/20'}`} />
              )}
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="glass rounded-3xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Step 1 – Dados Pessoais */}
            {step === 'personal' && (
              <>
                <h2 className="text-xl font-bold text-white mb-4">Dados Pessoais</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <InputField label="Nome" id="firstName" placeholder="João" value={firstName} onChange={setFirstName} required />
                  <InputField label="Sobrenome" id="lastName" placeholder="Silva" value={lastName} onChange={setLastName} required />
                  <InputField label="CPF" id="cpf" placeholder="000.000.000-00" value={cpf} onChange={(v) => setCpf(formatCPF(v))} />
                  <InputField label="RG" id="rg" placeholder="12.345.678-9" value={rg} onChange={setRg} />
                  <InputField label="Data de Nascimento" id="birthDate" type="date" value={birthDate} onChange={setBirthDate} />
                  <InputField label="Telefone / WhatsApp" id="phone" type="tel" placeholder="(11) 99999-9999" value={phone} onChange={(v) => setPhone(formatPhone(v))} required />
                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Sexo
                    </label>
                    <select
                      id="gender" value={gender} onChange={(e) => setGender(e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                    >
                      <option value="">Prefiro não informar</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="O">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="memberSlug" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Seu Link Público <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                      <span className="bg-gray-50 text-gray-400 text-xs px-3 py-3 whitespace-nowrap border-r border-gray-200">/p/</span>
                      <input
                        id="memberSlug" type="text" placeholder="joao-silva" required
                        value={memberSlug} onChange={(e) => setMemberSlug(formatSlug(e.target.value))}
                        className="flex-1 px-3 py-3 text-sm outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Step 2 – Endereço */}
            {step === 'address' && (
              <>
                <h2 className="text-xl font-bold text-white mb-4">Endereço</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cep" className="block text-sm font-medium text-gray-700 mb-1.5">CEP</label>
                    <input
                      id="cep" type="text" placeholder="00000-000" value={cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    />
                    <p className="text-xs text-indigo-400 mt-1">Preenchimento automático ao digitar o CEP</p>
                  </div>
                  <InputField label="Número" id="addressNumber" placeholder="123" value={addressNumber} onChange={setAddressNumber} />
                  <div className="sm:col-span-2">
                    <InputField label="Logradouro (Rua / Av.)" id="address" placeholder="Rua das Flores" value={address} onChange={setAddress} />
                  </div>
                  <InputField label="Cidade" id="city" placeholder="São Paulo" value={city} onChange={setCity} />
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
                    <select
                      id="state" value={state} onChange={(e) => setState(e.target.value)}
                      className="block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all bg-white"
                    >
                      <option value="">Selecione</option>
                      {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </>
            )}

            {/* Step 3 – Empresa */}
            {step === 'company' && (
              <>
                <h2 className="text-xl font-bold text-white mb-4">Dados da Empresa</h2>
                <div className="space-y-4">
                  <InputField label="Nome da Empresa" id="orgName" placeholder="Meu Salão de Beleza" value={orgName} onChange={setOrgName} required />
                  <div>
                    <label htmlFor="orgSlug" className="block text-sm font-medium text-gray-700 mb-1.5">
                      Link da Empresa <span className="text-red-400">*</span>
                    </label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
                      <span className="bg-gray-50 text-gray-400 text-xs px-3 py-3 whitespace-nowrap border-r border-gray-200">/e/</span>
                      <input
                        id="orgSlug" type="text" placeholder="meu-salao" required
                        value={orgSlug} onChange={(e) => setOrgSlug(formatSlug(e.target.value))}
                        className="flex-1 px-3 py-3 text-sm outline-none bg-white"
                      />
                    </div>
                    <p className="text-xs text-indigo-400 mt-1">
                      Seus clientes vão acessar: agendamentofacil.com/e/{orgSlug || 'minha-empresa'}
                    </p>
                  </div>
                </div>
              </>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              {step !== 'personal' && (
                <button
                  type="button"
                  onClick={() => setStep(step === 'company' ? 'address' : 'personal')}
                  className="flex-1 py-3 px-4 font-semibold text-indigo-300 border border-indigo-500/30 rounded-2xl hover:bg-white/10 transition-all"
                >
                  Voltar
                </button>
              )}
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-3 px-4 font-bold text-white gradient-brand rounded-2xl hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : step === 'company' ? (
                  'Finalizar Cadastro'
                ) : (
                  'Próximo →'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
