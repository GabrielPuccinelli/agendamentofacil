import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import AppShell from '../components/AppShell';
import PageHeader from '../components/PageHeader';
import type { SidebarProps } from '../components/Sidebar';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Loader2, Upload, Building2, ExternalLink } from 'lucide-react';

const inputCls = 'block w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';

type OrgProfile = {
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

/** Edição do perfil público da empresa: logo, capa, descrição, contato e horários. */
export default function CompanyProfilePage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sidebarProps, setSidebarProps] = useState<Omit<SidebarProps, 'onLogout'> | null>(null);
  const [org, setOrg] = useState<OrgProfile | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`); return; }

      const { data: member } = await supabase
        .from('members')
        .select('id, name, role, organization_id, phone, avatar_url')
        .eq('user_id', session.user.id)
        .order('organization_id', { ascending: true, nullsFirst: false })
        .limit(1)
        .maybeSingle();

      if (!member || member.role !== 'admin' || !member.organization_id) { navigate('/dashboard'); return; }

      const [{ data: orgData }, { data: allMembers }] = await Promise.all([
        supabase
          .from('organizations')
          .select('id, name, slug, logo_url, cover_url, description, whatsapp, address, opening_hours, instagram')
          .eq('id', member.organization_id)
          .single(),
        supabase.from('members').select('id, name, slug').eq('organization_id', member.organization_id),
      ]);

      if (!orgData) { navigate('/dashboard'); return; }
      setOrg(orgData);
      setSidebarProps({
        userProfile: { name: member.name, phone: member.phone, avatarUrl: member.avatar_url || '' },
        isAdmin: true,
        members: allMembers || [],
        organizationSlug: orgData.slug,
        organizationName: orgData.name,
      });
      setLoading(false);
    };
    load();
  }, [navigate]);

  const handleUpload = async (file: File, kind: 'logo' | 'cover') => {
    if (!org) return;
    if (file.size > 4 * 1024 * 1024) { toast.error('Imagem muito grande (máx. 4MB).'); return; }
    const setUploading = kind === 'logo' ? setUploadingLogo : setUploadingCover;
    setUploading(true);
    const ext = file.name.split('.').pop()?.toLowerCase() || 'png';
    const path = `org/${org.id}/${kind}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('public-assets').upload(path, file, { upsert: true });
    if (error) { setUploading(false); toast.error('Falha no upload da imagem.'); return; }
    const { data } = supabase.storage.from('public-assets').getPublicUrl(path);
    const url = data.publicUrl;
    const field = kind === 'logo' ? 'logo_url' : 'cover_url';
    const { error: updateError } = await supabase.from('organizations').update({ [field]: url }).eq('id', org.id);
    setUploading(false);
    if (updateError) { toast.error('Falha ao salvar a imagem.'); return; }
    setOrg({ ...org, [field]: url });
    toast.success(kind === 'logo' ? 'Logo atualizada!' : 'Capa atualizada!');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setSaving(true);
    const { error } = await supabase
      .from('organizations')
      .update({
        name: org.name,
        description: org.description?.trim() || null,
        whatsapp: org.whatsapp?.trim() || null,
        address: org.address?.trim() || null,
        opening_hours: org.opening_hours?.trim() || null,
        instagram: org.instagram?.trim().replace(/^@/, '') || null,
      })
      .eq('id', org.id);
    setSaving(false);
    if (error) { toast.error('Não foi possível salvar as alterações.'); return; }
    toast.success('Perfil da empresa salvo!');
  };

  const handleLogout = async () => { await supabase.auth.signOut(); };

  if (loading || !sidebarProps || !org) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-indigo-400 text-sm">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <AppShell {...sidebarProps} onLogout={handleLogout}>
      <div className="max-w-3xl mx-auto min-w-0">
        <PageHeader
          title="Perfil da Empresa"
          description="Tudo que aparece na sua página pública de agendamento"
          actions={
            <Button asChild variant="outline">
              <a href={`/${org.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" /> Ver página pública
              </a>
            </Button>
          }
        />

        {/* Capa + logo */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="relative h-40 bg-gradient-to-r from-indigo-500 to-violet-600">
            {org.cover_url && <img src={org.cover_url} alt="Capa" className="w-full h-full object-cover" />}
            <label className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/50 hover:bg-black/70 text-white text-xs font-medium px-3 py-1.5 rounded-lg cursor-pointer transition-all">
              {uploadingCover ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              Trocar capa
              <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'cover')} />
            </label>
          </div>
          <div className="px-6 pb-5">
            <div className="flex items-end gap-4 -mt-8">
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-white border-4 border-white shadow-lg overflow-hidden flex items-center justify-center">
                  {org.logo_url
                    ? <img src={org.logo_url} alt="Logo" className="w-full h-full object-cover" />
                    : <div className="w-full h-full gradient-brand flex items-center justify-center"><Building2 className="w-8 h-8 text-white" /></div>}
                </div>
                <label className="absolute -bottom-1 -right-1 w-7 h-7 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center cursor-pointer shadow-md transition-all" title="Trocar logo">
                  {uploadingLogo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0], 'logo')} />
                </label>
              </div>
              <div className="pb-1 min-w-0">
                <p className="font-bold text-gray-900 truncate">{org.name}</p>
                <p className="text-xs text-gray-400">/{org.slug}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSave} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome da empresa *</label>
            <input type="text" required value={org.name} onChange={(e) => setOrg({ ...org, name: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição</label>
            <textarea
              rows={3}
              placeholder="Conte aos clientes o que sua empresa faz, diferenciais, especialidades..."
              value={org.description || ''}
              onChange={(e) => setOrg({ ...org, description: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">WhatsApp</label>
              <input type="tel" placeholder="(11) 99999-9999" value={org.whatsapp || ''} onChange={(e) => setOrg({ ...org, whatsapp: e.target.value })} className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Instagram</label>
              <input type="text" placeholder="@suaempresa" value={org.instagram || ''} onChange={(e) => setOrg({ ...org, instagram: e.target.value })} className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Endereço</label>
            <input type="text" placeholder="Rua Exemplo, 123 — Bairro, Cidade/UF" value={org.address || ''} onChange={(e) => setOrg({ ...org, address: e.target.value })} className={inputCls} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Horário de funcionamento</label>
            <textarea
              rows={2}
              placeholder={'Seg–Sex: 9h às 19h\nSáb: 9h às 14h'}
              value={org.opening_hours || ''}
              onChange={(e) => setOrg({ ...org, opening_hours: e.target.value })}
              className={inputCls}
            />
          </div>
          <div className="flex justify-end pt-2">
            <Button type="submit" disabled={saving} className="gradient-brand shadow-md shadow-indigo-500/20">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Salvar alterações'}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
