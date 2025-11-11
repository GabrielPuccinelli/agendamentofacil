// src/pages/EditProfilePage.tsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

const EditProfilePage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [newAvatarFile, setNewAvatarFile] = useState<File | null>(null);
  const [feedback, setFeedback] = useState('');
  const [isError, setIsError] = useState(false); // State to track if feedback is an error

  const [userProfile, setUserProfile] = useState(null);
  const [membersList, setMembersList] = useState([]);
  const [organizationSlug, setOrganizationSlug] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate('/login'); return; }
      const { data: member, error } = await supabase.from('members').select('*').eq('user_id', user.id).single();
      if (error || !member) { navigate('/dashboard'); return; }
      setName(member.name || '');
      setPhone(member.phone || '');
      setAvatarUrl(member.avatar_url || 'https://via.placeholder.com/150');
      setUserProfile(member);
      const { data: orgData } = await supabase.from('organizations').select('slug').eq('id', member.organization_id).single();
      if(orgData) setOrganizationSlug(orgData.slug);
      const { data: membersData } = await supabase.from('members').select('id, name, slug').eq('organization_id', member.organization_id);
      if(membersData) setMembersList(membersData);
      setLoading(false);
    };
    fetchProfile();
  }, [navigate]);

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      setNewAvatarFile(file);
      setAvatarUrl(URL.createObjectURL(file));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFeedback('');
    setIsError(false);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { navigate('/login'); return; }

    let publicAvatarUrl = userProfile.avatar_url;

    if (newAvatarFile) {
      const fileExt = newAvatarFile.name.split('.').pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(fileName, newAvatarFile);

      if (uploadError) {
        setFeedback(`Erro ao enviar a nova foto: ${uploadError.message}`);
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
        name: name,
        phone: phone,
        avatar_url: publicAvatarUrl,
      })
      .eq('user_id', user.id);

    if (updateError) {
      setFeedback(`Não foi possível salvar as alterações: ${updateError.message}`);
      setIsError(true);
    } else {
      setFeedback('Perfil atualizado com sucesso!');
      setIsError(false);
      setTimeout(() => navigate('/dashboard'), 1500);
    }

    setSaving(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando perfil...</div>;
  }

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar userProfile={userProfile} members={membersList} organizationSlug={organizationSlug} onLogout={handleLogout} />
      <main className="flex-1 p-4 md:p-8">
        <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow">
          <h1 className="text-3xl font-bold mb-6">Editar Perfil</h1>
          <form onSubmit={handleSubmit}>
            <div className="flex items-center mb-6">
              <img src={avatarUrl} alt="Avatar atual" className="w-24 h-24 rounded-full object-cover mr-6 border-4 border-gray-200" />
              <div>
                <label htmlFor="avatar-upload" className="cursor-pointer bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Trocar Foto</label>
                <input type="file" id="avatar-upload" className="hidden" accept="image/png, image/jpeg" onChange={handleAvatarChange} />
                <p className="text-sm text-gray-500 mt-2">PNG ou JPG (max. 2MB)</p>
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
              <input type="text" id="name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" required />
            </div>
            <div className="mb-6">
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Telefone</label>
              <input type="text" id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm" placeholder="(00) 12345-6789" />
            </div>
            {feedback && (
              <div
                data-testid="feedback-message"
                className={`p-3 mb-4 rounded-md text-center ${isError ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}
              >
                {feedback}
              </div>
            )}
            <div className="flex justify-end gap-4">
              <Link to="/dashboard" className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancelar</Link>
              <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
};

export default EditProfilePage;
