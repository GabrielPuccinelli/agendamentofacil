import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Loader2, Rocket, Check } from 'lucide-react';

type Step = 'role' | 'personal' | 'address' | 'company';
type Role = 'owner' | 'staff' | null;

const formatCPF = (v: string) =>
  v.replace(/\D/g, '').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})/, '$1-$2').slice(0, 14);

const formatPhone = (v: string) =>
  v.replace(/\D/g, '').replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);

const formatCEP = (v: string) =>
  v.replace(/\D/g, '').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);

const formatSlug = (v: string) =>
  v.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

const inputCls = 'block w-full px-4 py-3 bg-white border border-gray-200 rounded-xl text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';

const Field = ({
  label, id, type = 'text', placeholder, value, onChange, required = false, hint,
}: {
  label: string; id: string; type?: string; placeholder?: string;
  value: string; onChange: (v: string) => void; required?: boolean; hint?: string;
}) => (
  <div>
    <label htmlFor={id} className="block text-sm font-medium text-slate-300 mb-1.5">
      {label} {required && <span className="text-rose-400">*</span>}
    </label>
    <input
      id={id} type={type} placeholder={placeholder} value={value} required={required}
      onChange={(e) => onChange(e.target.value)}
      className={inputCls}
    />
    {hint && <p className="text-xs text-indigo-400 mt-1">{hint}</p>}
  </div>
);

const OWNER_STEPS: Step[] = ['personal', 'address', 'company'];
const STAFF_STEPS: Step[] = ['personal', 'address'];

const STEP_LABELS: Record<Step, string> = {
  role: 'Perfil',
  personal: 'Dados Pessoais',
  address: 'Endereço',
  company: 'Empresa',
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('role');
  const [role, setRole] = useState<Role>(null);
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
  const [addressState, setAddressState] = useState('');

  // Empresa
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');

  const steps = role === 'owner' ? OWNER_STEPS : STAFF_STEPS;
  const stepIndex = steps.indexOf(step);
  const isLastStep = stepIndex === steps.length - 1;

  const fetchAddressByCep = async (rawCep: string) => {
    const digits = rawCep.replace(/\D/g, '');
    if (digits.length !== 8) return;
    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();
      if (!data.erro) {
        setAddress(data.logradouro || '');
        setCity(data.localidade || '');
        setAddressState(data.uf || '');
      }
    } catch {}
  };

  const handleCepChange = (v: string) => {
    const formatted = formatCEP(v);
    setCep(formatted);
    if (formatted.replace(/\D/g, '').length === 8) fetchAddressByCep(formatted);
  };

  const goBack = () => {
    if (step === 'personal') { setStep('role'); return; }
    if (step === 'address') { setStep('personal'); return; }
    if (step === 'company') { setStep('address'); return; }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (step === 'personal') { setStep('address'); return; }
    if (step === 'address' && role === 'owner') { setStep('company'); return; }

    // Final submit
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      // Save name to auth metadata so admin can find them by email
      await supabase.auth.updateUser({
        data: { name: firstName, slug_suggestion: memberSlug },
      });

      if (role === 'owner') {
        // Create organization
        const { data: orgData, error: orgError } = await supabase
          .from('organizations')
          .insert({ name: orgName, slug: orgSlug, owner_id: user.id })
          .select('id')
          .single();
        if (orgError) throw new Error(`Erro ao criar empresa: ${orgError.message}`);

        // Create member as admin
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
          state: addressState || null,
          role: 'admin',
          can_edit_profile: true,
          can_edit_price: true,
        });
        if (memberError) throw new Error(`Erro ao criar perfil: ${memberError.message}`);

        navigate('/dashboard');
      } else {
        // Collaborator: no org yet, just save their profile for when admin adds them
        const { error: memberError } = await supabase.from('members').insert({
          user_id: user.id,
          organization_id: null,
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
          state: addressState || null,
          role: 'staff',
          can_edit_profile: true,
          can_edit_price: false,
        });
        if (memberError) throw new Error(`Erro ao criar perfil: ${memberError.message}`);

        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro desconhecido.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-violet-950 flex items-center justify-center p-4">
      {/* Decorative orbs */}
      <div className="fixed top-1/4 left-[10%] w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-1/4 right-[10%] w-64 h-64 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl gradient-brand flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/30">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-white">Configure sua conta</h1>
          <p className="text-indigo-300 mt-2 text-sm">Vamos configurar tudo para você começar</p>
        </div>

        {/* Step indicator (only after role is chosen) */}
        {step !== 'role' && role && (
          <div className="flex items-center justify-center gap-0 mb-8">
            {steps.map((s, i) => (
              <div key={s} className="flex items-center">
                <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  s === step
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
                  <span className="hidden sm:block">{STEP_LABELS[s]}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`w-8 h-px mx-1 ${i < stepIndex ? 'bg-green-400/50' : 'bg-white/20'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Card */}
        <div className="glass rounded-3xl p-8">

          {/* ── Step 0: Role selection ── */}
          {step === 'role' && (
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Como você vai usar o AgendaFácil?</h2>
              <p className="text-indigo-300 text-sm mb-8">Escolha o perfil que melhor descreve você</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Owner option */}
                <button
                  onClick={() => { setRole('owner'); setStep('personal'); }}
                  className="group relative flex flex-col items-start p-6 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-indigo-500/60 hover:bg-indigo-500/10 transition-all duration-200 text-left"
                >
                  <div className="w-12 h-12 rounded-xl gradient-brand flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform duration-200">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-white text-lg mb-1">Empresa</h3>
                  <p className="text-indigo-300 text-sm leading-relaxed">
                    Crie seu espaço, cadastre serviços e gerencie sua equipe. Você será o administrador.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {['Salão', 'Clínica', 'Estúdio', 'Barbearia'].map((t) => (
                      <span key={t} className="text-xs bg-white/10 text-indigo-300 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-white/20 group-hover:border-indigo-400 transition-colors" />
                </button>

                {/* Staff option */}
                <button
                  onClick={() => { setRole('staff'); setStep('personal'); }}
                  className="group relative flex flex-col items-start p-6 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-violet-500/60 hover:bg-violet-500/10 transition-all duration-200 text-left"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mb-4 shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform duration-200">
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <h3 className="font-bold text-white text-lg mb-1">Usuário</h3>
                  <p className="text-indigo-300 text-sm leading-relaxed">
                    Trabalho em uma empresa existente. Crie sua conta e aguarde o gestor te adicionar.
                  </p>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {['Cabeleireiro', 'Esteticista', 'Manicure', 'Massoterapeuta'].map((t) => (
                      <span key={t} className="text-xs bg-white/10 text-indigo-300 px-2 py-0.5 rounded-full">{t}</span>
                    ))}
                  </div>
                  <div className="absolute top-4 right-4 w-6 h-6 rounded-full border-2 border-white/20 group-hover:border-violet-400 transition-colors" />
                </button>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5"
            >
            {/* ── Step 1: Dados Pessoais ── */}
            {step === 'personal' && (
              <>
                <h2 className="text-xl font-bold text-white mb-4">
                  {role === 'staff' ? '👤 Seus dados pessoais' : '📋 Dados Pessoais'}
                </h2>
                {role === 'staff' && (
                  <div className="flex items-center gap-2 bg-violet-500/10 border border-violet-500/20 rounded-xl p-3 mb-4">
                    <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-violet-300 text-xs">
                      Seu gestor vai usar o e-mail cadastrado para te adicionar à empresa.
                    </p>
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Nome" id="firstName" placeholder="João" value={firstName} onChange={setFirstName} required />
                  <Field label="Sobrenome" id="lastName" placeholder="Silva" value={lastName} onChange={setLastName} required />
                  <Field label="CPF" id="cpf" placeholder="000.000.000-00" value={cpf} onChange={(v) => setCpf(formatCPF(v))} />
                  <Field label="RG" id="rg" placeholder="12.345.678-9" value={rg} onChange={setRg} />
                  <Field label="Data de Nascimento" id="birthDate" type="date" value={birthDate} onChange={setBirthDate} />
                  <Field label="Telefone / WhatsApp" id="phone" type="tel" placeholder="(11) 99999-9999" value={phone} onChange={(v) => setPhone(formatPhone(v))} required />
                  <div>
                    <label htmlFor="gender" className="block text-sm font-medium text-slate-300 mb-1.5">Sexo</label>
                    <select
                      id="gender" value={gender} onChange={(e) => setGender(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Prefiro não informar</option>
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="O">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label htmlFor="memberSlug" className="block text-sm font-medium text-slate-300 mb-1.5">
                      Seu Link Público <span className="text-rose-400">*</span>
                    </label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all bg-white">
                      <span className="bg-gray-50 text-gray-400 text-xs px-3 py-3 whitespace-nowrap border-r border-gray-200">/p/</span>
                      <input
                        id="memberSlug" type="text" placeholder="joao-silva" required
                        value={memberSlug} onChange={(e) => setMemberSlug(formatSlug(e.target.value))}
                        className="flex-1 px-3 py-3 text-sm outline-none text-gray-900"
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* ── Step 2: Endereço ── */}
            {step === 'address' && (
              <>
                <h2 className="text-xl font-bold text-white mb-4">📍 Endereço</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="cep" className="block text-sm font-medium text-slate-300 mb-1.5">CEP</label>
                    <input
                      id="cep" type="text" placeholder="00000-000" value={cep}
                      onChange={(e) => handleCepChange(e.target.value)}
                      className={inputCls}
                    />
                    <p className="text-xs text-indigo-400 mt-1">Preenchimento automático via ViaCEP</p>
                  </div>
                  <Field label="Número" id="addressNumber" placeholder="123" value={addressNumber} onChange={setAddressNumber} />
                  <div className="sm:col-span-2">
                    <Field label="Logradouro (Rua / Av.)" id="address" placeholder="Rua das Flores" value={address} onChange={setAddress} />
                  </div>
                  <Field label="Cidade" id="city" placeholder="São Paulo" value={city} onChange={setCity} />
                  <div>
                    <label htmlFor="state" className="block text-sm font-medium text-slate-300 mb-1.5">Estado</label>
                    <select
                      id="state" value={addressState} onChange={(e) => setAddressState(e.target.value)}
                      className={inputCls}
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

            {/* ── Step 3: Empresa ── */}
            {step === 'company' && (
              <>
                <h2 className="text-xl font-bold text-white mb-4">🏢 Dados da Empresa</h2>
                <div className="space-y-4">
                  <Field label="Nome da Empresa" id="orgName" placeholder="Meu Salão de Beleza" value={orgName} onChange={setOrgName} required />
                  <div>
                    <label htmlFor="orgSlug" className="block text-sm font-medium text-slate-300 mb-1.5">
                      Link da Empresa <span className="text-rose-400">*</span>
                    </label>
                    <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all bg-white">
                      <span className="bg-gray-50 text-gray-400 text-xs px-3 py-3 whitespace-nowrap border-r border-gray-200">/e/</span>
                      <input
                        id="orgSlug" type="text" placeholder="meu-salao" required
                        value={orgSlug} onChange={(e) => setOrgSlug(formatSlug(e.target.value))}
                        className="flex-1 px-3 py-3 text-sm outline-none text-gray-900"
                      />
                    </div>
                    <p className="text-xs text-indigo-400 mt-1">
                      Seus clientes vão acessar: agendamentofacil.com/e/{orgSlug || 'minha-empresa'}
                    </p>
                  </div>
                </div>
              </>
            )}
            </motion.div>
            </AnimatePresence>

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 text-red-300 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            {step !== 'role' && (
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={goBack}
                  className="flex-1 h-auto py-3 rounded-2xl bg-transparent text-indigo-300 border-indigo-500/30 hover:bg-white/10 hover:text-white"
                >
                  <ArrowLeft className="w-4 h-4" /> Voltar
                </Button>
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1 h-auto py-3 rounded-2xl gradient-brand font-bold shadow-lg shadow-indigo-500/30 hover:opacity-90"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
                  ) : isLastStep ? (
                    role === 'staff'
                      ? <><Check className="w-4 h-4" /> Criar minha conta</>
                      : <><Rocket className="w-4 h-4" /> Finalizar Cadastro</>
                  ) : (
                    <>Próximo <ArrowRight className="w-4 h-4" /></>
                  )}
                </Button>
              </div>
            )}
          </form>
        </div>

        <p className="text-center text-indigo-500 text-xs mt-6">
          Agendamento Fácil · Seus dados estão protegidos com criptografia
        </p>
      </div>
    </div>
  );
}
