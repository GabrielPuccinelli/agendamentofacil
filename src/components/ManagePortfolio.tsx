import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { ConfirmButton } from './ConfirmButton';
import EmptyState from './EmptyState';
import { Image as ImageIcon, Upload, Trash2, Loader2 } from 'lucide-react';

type Item = { id: string; image_url: string; caption: string | null };

type Props = { memberId: string };

/** Portfólio de fotos do profissional — aparece na página pública. */
export default function ManagePortfolio({ memberId }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    supabase
      .from('portfolio_items')
      .select('id, image_url, caption')
      .eq('member_id', memberId)
      .order('created_at', { ascending: false })
      .then(({ data }) => { setItems(data || []); setLoading(false); });
  }, [memberId]);

  const handleUpload = async (files: FileList) => {
    if (items.length + files.length > 12) { toast.error('Máximo de 12 fotos no portfólio.'); return; }
    setUploading(true);
    for (const file of Array.from(files)) {
      if (file.size > 5 * 1024 * 1024) { toast.error(`${file.name}: máx. 5MB.`); continue; }
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `portfolio/${memberId}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
      const { error: upErr } = await supabase.storage.from('public-assets').upload(path, file, { upsert: true });
      if (upErr) { toast.error('Falha no upload.'); continue; }
      const { data } = supabase.storage.from('public-assets').getPublicUrl(path);
      const { data: row, error } = await supabase
        .from('portfolio_items')
        .insert({ member_id: memberId, image_url: data.publicUrl })
        .select('id, image_url, caption')
        .single();
      if (!error && row) setItems((prev) => [row, ...prev]);
    }
    setUploading(false);
    toast.success('Foto(s) adicionada(s)!');
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('portfolio_items').delete().eq('id', id);
    if (error) { toast.error('Não foi possível remover.'); return; }
    setItems(items.filter((i) => i.id !== id));
    toast.success('Foto removida.');
  };

  if (loading) return <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />;

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-900">Portfólio</h2>
          <p className="text-xs text-gray-400 mt-0.5">Fotos dos seus trabalhos — aparecem na sua página pública</p>
        </div>
        <label className="flex items-center gap-1.5 gradient-brand text-white text-sm font-semibold px-4 py-2 rounded-xl cursor-pointer shadow-md shadow-indigo-500/20 hover:opacity-90 transition-all">
          {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          Adicionar fotos
          <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && handleUpload(e.target.files)} />
        </label>
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={<ImageIcon className="w-6 h-6" />}
          title="Nenhuma foto ainda"
          description="Mostre seus melhores trabalhos para atrair mais clientes na página pública."
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {items.map((it) => (
            <div key={it.id} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-100">
              <img src={it.image_url} alt={it.caption || 'Trabalho'} className="w-full h-full object-cover" />
              <ConfirmButton
                onConfirm={() => handleDelete(it.id)}
                title="Remover foto?"
                description="Ela sairá do seu portfólio público."
                confirmText="Remover"
              >
                <button className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all hover:bg-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </ConfirmButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
