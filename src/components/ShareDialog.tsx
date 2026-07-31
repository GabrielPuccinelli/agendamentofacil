import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Copy, Check, Download, ExternalLink } from 'lucide-react';

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  path: string;      // ex.: /empresa/profissional
  title: string;     // ex.: "Link de agendamento"
};

/** Diálogo de compartilhamento com QR code + copiar link. */
export default function ShareDialog({ open, onOpenChange, path, title }: Props) {
  const url = `${window.location.origin}${path}`;
  const [qr, setQr] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open) return;
    QRCode.toDataURL(url, { width: 320, margin: 1, color: { dark: '#312e81', light: '#ffffff' } })
      .then(setQr)
      .catch(() => setQr(''));
  }, [open, url]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch { toast.error('Não foi possível copiar.'); }
  };

  const download = () => {
    const a = document.createElement('a');
    a.href = qr;
    a.download = 'qrcode-agendamento.png';
    a.click();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-2">
          {qr && (
            <div className="p-3 bg-white rounded-2xl border border-gray-100 shadow-sm">
              <img src={qr} alt="QR Code" className="w-52 h-52" />
            </div>
          )}
          <p className="text-xs text-gray-400 text-center">Aponte a câmera do celular para agendar, ou compartilhe o link.</p>
          <div className="w-full flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2">
            <span className="text-xs text-gray-600 truncate flex-1">{url}</span>
            <button onClick={copy} className="shrink-0 text-indigo-500 hover:text-indigo-700 transition-colors">
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 w-full">
            <Button variant="outline" onClick={download} disabled={!qr}>
              <Download className="w-4 h-4" /> Baixar QR
            </Button>
            <Button asChild className="gradient-brand">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4" /> Abrir
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
