import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ShoppingBag } from 'lucide-react';

type MemberOpt = { id: string; name: string };
type Product = { id: string; name: string; price: number; stock: number | null };

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultMemberId: string;
  organizationId: string;
  isAdmin: boolean;
  members: MemberOpt[];
  onCreated: () => void;
};

const inputCls = 'block w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all';
const METHODS = ['Dinheiro', 'Pix', 'Débito', 'Crédito'];

/** Venda rápida de produto (sem agendamento) — baixa estoque e entra no financeiro. */
export default function SellProductDialog({ open, onOpenChange, defaultMemberId, organizationId, isAdmin, members, onCreated }: Props) {
  const [memberId, setMemberId] = useState(defaultMemberId);
  const [products, setProducts] = useState<Product[]>([]);
  const [productId, setProductId] = useState('');
  const [qty, setQty] = useState(1);
  const [clientName, setClientName] = useState('');
  const [method, setMethod] = useState('Dinheiro');
  const [saving, setSaving] = useState(false);

  useEffect(() => { setMemberId(defaultMemberId); }, [defaultMemberId]);

  useEffect(() => {
    if (!open) return;
    supabase.from('services').select('id, name, price, stock').eq('organization_id', organizationId).eq('is_product', true).order('name')
      .then(({ data }) => {
        setProducts((data || []) as Product[]);
        setProductId((prev) => (data || []).some((p: any) => p.id === prev) ? prev : ((data || [])[0]?.id || ''));
      });
  }, [open, organizationId]);

  const product = products.find((p) => p.id === productId);
  const total = product ? Number(product.price) * qty : 0;
  const noStock = product && product.stock != null && product.stock < qty;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!product) { toast.error('Selecione um produto.'); return; }
    if (noStock) { toast.error('Estoque insuficiente.'); return; }
    setSaving(true);
    const nowIso = new Date().toISOString();
    const { error } = await supabase.from('bookings').insert({
      member_id: memberId,
      service_id: product.id,
      client_name: clientName.trim() || 'Venda de produto',
      start_time: nowIso,
      end_time: nowIso,
      status: 'completed',
      paid: true,
      payment_method: method,
      paid_at: nowIso,
      quantity: qty,
      amount: total,
    });
    if (error) { setSaving(false); toast.error('Não foi possível registrar a venda.'); return; }
    if (product.stock != null) {
      await supabase.rpc('decrement_stock', { p_service_id: product.id, p_qty: qty });
    }
    setSaving(false);
    toast.success('Venda registrada!');
    setClientName(''); setQty(1);
    onOpenChange(false);
    onCreated();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><ShoppingBag className="w-5 h-5 text-indigo-500" /> Venda de produto</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-gray-400 -mt-2">Venda avulsa, sem agendamento — entra no financeiro e baixa o estoque.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          {isAdmin && members.length > 1 && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Vendido por</label>
              <select value={memberId} onChange={(e) => setMemberId(e.target.value)} className={inputCls}>
                {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Produto *</label>
            {products.length === 0 ? (
              <p className="text-xs text-amber-600">Nenhum produto cadastrado. Crie um serviço do tipo "Produto".</p>
            ) : (
              <select value={productId} onChange={(e) => setProductId(e.target.value)} className={inputCls}>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} · R$ {Number(p.price).toFixed(2)}{p.stock != null ? ` · ${p.stock} em estoque` : ''}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Quantidade</label>
              <input type="number" min={1} value={qty} onChange={(e) => setQty(Math.max(1, parseInt(e.target.value) || 1))} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pagamento</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className={inputCls}>
                {METHODS.map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Cliente <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} placeholder="Nome do cliente" className={inputCls} />
          </div>
          <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3">
            <span className="text-sm text-indigo-700 font-medium">Total</span>
            <span className="text-lg font-extrabold text-indigo-700">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
          {noStock && <p className="text-xs text-red-500">Estoque insuficiente ({product?.stock} disponível).</p>}
          <div className="flex justify-end">
            <Button type="submit" disabled={saving || !product || !!noStock} className="gradient-brand shadow-md shadow-indigo-500/20">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Registrar venda'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
